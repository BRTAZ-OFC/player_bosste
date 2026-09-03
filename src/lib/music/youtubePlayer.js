// Player de música via iframe do YouTube Music (music.youtube.com).
// Usa iframe simples + postMessage para controle — mais compatível com
// ambientes restritos (Boosteroid, cloud gaming) que bloqueiam youtube.com.
// Ducking: reduz o volume da música quando o TTS está falando (via TTSMusicIntegration).

import { playerEvents } from './playerEvents';
import { loadMusicSettings, saveMusicSettings } from './musicSettings';
import { queueManager } from './queueManager';
import { historyManager } from './historyManager';
import {
  initAudioPlayer, playTrack as audioPlayTrack, play as audioPlay, pause as audioPause,
  seekTo as audioSeek, setVolume as audioSetVolume, getVolume as audioGetVolume,
  unlockAudio as audioUnlock, isAudioLocked as audioIsLocked,
  getCurrentTrack as audioGetCurrentTrack, isReady as audioIsReady,
  stop as audioStop, setActive as audioSetActive, destroyAudioPlayer,
} from './html5AudioPlayer';
import { isMigrationEnabled } from './migrationFlag';

let iframe = null;
let activeBackend = 'youtube'; // 'youtube' | 'audio' — qual backend está ativo
let currentTrack = null;
let currentTime = 0;
let duration = 0;
let playerState = 'stopped';
let progressTimer = null;
let broadcastChannel = null;
let baseVolume = 80;
let duckedLevel = null;
let messageListenerSetup = false;
let heartbeatTimer = null;
let audioUnlocked = false; // false até o usuário interagir (Boosteroid bloqueia autoplay com som)
let playerReady = false; // Etapa 32: true apenas quando onReady é recebido do iframe
let mutedState = true; // ETAPA 40: tracking de mute via infoDelivery (inicia muted=1 no URL)
let durationReady = false; // ETAPA 44: true quando primeira duração válida (>0) é recebida
let durationPollTimer = null; // ETAPA 44: polling curto de getDuration durante inicialização
let commandQueue = []; // ETAPA 48: fila de comandos para quando playerReady=false (flush em PLAYING)
let instanceGeneration = 0; // ETAPA 49: geração da instância atual — invalida comandos de faixa anterior
let realVolume = null; // ETAPA 51: volume real sincronizado via infoDelivery (null = não sincronizado)
let expectedVolume = null; // ETAPA 51: volume esperado — apenas infoDelivery correspondente sincroniza realVolume

// === Roteamento de backend (Etapa 22 — migração controlada) ===
// Flag OFF (default): youtube.com/embed  |  Flag ON: youtube-nocookie.com/embed
// O backend é capturado na criação do iframe e NÃO muda durante a reprodução.
const YT_BASE = 'https://www.youtube.com';
const NOCOOKIE_BASE = 'https://www.youtube-nocookie.com';
// ETAPA 40: migração definitiva — sempre youtube-nocookie.com (config vencedora Etapa 38/39)
// youtube.com é bloqueado no ambiente Boosteroid. music.youtube.com mantido para URLs/pesquisa.
let activeBackendBase = NOCOOKIE_BASE;

function resolveBackendBase() {
  return NOCOOKIE_BASE;
}

function buildEmbedUrl(videoId) {
  const origin = (typeof window !== 'undefined' && window.location?.origin) || 'https://streamspeak.base44.app';
  return `${activeBackendBase}/embed/${videoId}?autoplay=1&mute=1&enablejsapi=1&playsinline=1&rel=0&modestbranding=1&origin=${encodeURIComponent(origin)}`;
}

// Auto-unlock: ativa o som assim que o usuário interagir com a página (clique/toque/tecla).
// Necessário porque navegadores bloqueiam autoplay com som sem gesto do usuário.
// Transparente — não exige clicar em botão específico, qualquer interação desbloqueia.
let autoUnlockListenerAdded = false;
function setupAutoUnlock() {
  if (autoUnlockListenerAdded) return;
  autoUnlockListenerAdded = true;
  const unlock = () => {
    sendCommand('unMute');
    applyVolume();
    document.removeEventListener('click', unlock, true);
    document.removeEventListener('touchstart', unlock, true);
    document.removeEventListener('keydown', unlock, true);
    autoUnlockListenerAdded = false; // permite re-registrar se o player for destruído
  };
  document.addEventListener('click', unlock, true);
  document.addEventListener('touchstart', unlock, true);
  document.addEventListener('keydown', unlock, true);
}

// Preview da URL baseado na flag ATUAL (sem capturar — para diagnóstico)
export function previewEmbedUrl(videoId) {
  const origin = (typeof window !== 'undefined' && window.location?.origin) || 'https://streamspeak.base44.app';
  return `${resolveBackendBase()}/embed/${videoId}?autoplay=1&mute=1&enablejsapi=1&playsinline=1&rel=0&modestbranding=1&origin=${encodeURIComponent(origin)}`;
}

export function getActiveBackendBase() { return activeBackendBase; }
export function isNocookieBackend() { return activeBackendBase === NOCOOKIE_BASE; }

// === Roteamento de backend (Etapa 7) ===
// Detecta se a faixa é uma fonte de áudio DIRETA (não-YouTube): upload/URL de MP3/OGG/WAV/M4A.
// NUNCA trata páginas do YouTube (watch/embed/music.youtube.com) como arquivo de áudio.
const AUDIO_EXT = /\.(mp3|ogg|wav|m4a|aac|flac|opus|webm)(\?|#|$)/i;
function isDirectAudioTrack(track) {
  if (!track) return false;
  const url = track.audioUrl || (track.source === 'audio' ? track.url : null);
  if (!url || typeof url !== 'string') return false;
  if (!/^https?:\/\//i.test(url)) return false;
  if (/(youtube\.com\/watch|music\.youtube\.com|youtu\.be\/|youtube-nocookie\.com|\/embed\/)/i.test(url)) return false;
  if (track.source === 'audio' || track.audioUrl) return true;
  return AUDIO_EXT.test(url);
}

// Para o backend YouTube (pausa + limpa estado) ao alternar para o backend de áudio.
function stopYoutubePlayback() {
  stopProgressTimer();
  try { sendCommand('pauseVideo'); } catch { /* ignore */ }
  currentTrack = null;
  playerState = 'stopped';
}

export function getActiveBackend() { return activeBackend; }

// Inicializa o player criando um iframe no container. Retorna true se pronto.
export async function initPlayer(containerId) {
  // ETAPA 42: instância única — sempre remove iframe anterior antes de criar novo
  if (iframe) { try { iframe.remove(); } catch { /* ignore */ } iframe = null; }
  // Remove qualquer iframe órfão com o mesmo ID (ex: de navegação/remount anterior)
  const orphan = document.getElementById('yt-music-iframe');
  if (orphan) { try { orphan.remove(); } catch { /* ignore */ } }
  playerReady = false; // reset estado — novo iframe enviará onReady

  const container = document.getElementById(containerId);
  if (!container) return false;

  // ETAPA 40: listener de message instalado ANTES de criar/carregar o iframe
  if (!messageListenerSetup) {
    messageListenerSetup = true;
    window.addEventListener('message', handlePostMessage);
  }

  iframe = document.createElement('iframe');
  iframe.id = 'yt-music-iframe';
  iframe.width = '100%';
  iframe.height = '100%';
  iframe.frameBorder = '0';
  iframe.scrolling = 'no';
  iframe.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
  iframe.referrerPolicy = 'origin'; // ETAPA 40: config vencedora Etapa 38/39
  iframe.style.borderRadius = '8px';
  iframe.style.border = 'none';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  // ETAPA 40: enviar listening imediatamente após o iframe carregar (config vencedora Etapa 39)
  iframe.onload = () => {
    try {
      iframe?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', channel: 'widget' }), activeBackendBase);
    } catch { /* ignore */ }
  };
  container.appendChild(iframe);

  setupDucking();
  setupBroadcastListener();
  startHeartbeat();
  setupAutoUnlock(); // desbloqueia áudio na primeira interação do usuário com a página
  initAudioPlayer(handleTrackEnd); // backend de áudio fallback (mesmo contrato de eventos)
  playerEvents.emit('player_ready');
  console.log('[Player] Backend YouTube iframe inicializado.');

  // Se o iframe foi recriado (navegação/remount), recarrega a faixa atual
  if (currentTrack) {
    activeBackendBase = resolveBackendBase();
    iframe.src = buildEmbedUrl(currentTrack.videoId);
    playerReady = false;
    instanceGeneration++; // ETAPA 49: nova geração no remount
    commandQueue = []; // ETAPA 48/49: limpa comandos anteriores no remount
    // ETAPA 40: backup — enviar listening após 300ms
    setTimeout(() => {
      try { iframe?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', channel: 'widget' }), activeBackendBase); } catch { /* ignore */ }
    }, 300);
    setTimeout(() => { sendCommand('unMute'); applyVolume(); }, 1500);
  }

  return true;
}

// Processa mensagens postMessage do YouTube (infoDelivery) para progresso/estado
function handlePostMessage(event) {
  // Etapa 32: instance isolation — só processa mensagens do nosso iframe
  if (!iframe || event.source !== iframe.contentWindow) return;
  // Validação de origem (Etapa 22): só aceita mensagens do backend ativo
  if (event.origin !== activeBackendBase) return;
  try {
    let data = event.data;
    if (typeof data === 'string') data = JSON.parse(data);
    if (!data || !data.event) return;
    // Etapa 32: onReady — player pronto para receber comandos
    if (data.event === 'onReady') {
      playerReady = true;
      requestStateUpdates(); // registra listeners agora que o player está pronto
      sendCommand('unMute');
      applyVolume();
      // ETAPA 49: NAO faz flush aqui — pause enviado em UNSTARTED nao produz state=2.
      // O flush acontece em state=PLAYING (onStateChange ou getPlayerState -> infoDelivery).
      sendCommand('getPlayerState'); // ETAPA 48/49: consulta estado atual; se já playing, dispara flush via handleStateChange
      playerEvents.emit('player_ready');
    }
    // Etapa 32: onError — captura erros do iframe (150/153/etc.)
    if (data.event === 'onError') {
      playerEvents.emit('play_error', { code: data.info, message: `YouTube iframe error: ${data.info}` });
    }
    if (data.event === 'infoDelivery' && data.info) {
      let progressChanged = false;
      if (typeof data.info.currentTime === 'number') { currentTime = data.info.currentTime; progressChanged = true; }
      if (typeof data.info.duration === 'number') {
        duration = data.info.duration;
        if (duration > 0) { durationReady = true; stopDurationPoll(); }
        progressChanged = true;
      }
      if (typeof data.info.playerState === 'number') handleStateChange(data.info.playerState);
      if (typeof data.info.muted === 'boolean') mutedState = data.info.muted; // ETAPA 40
      if (typeof data.info.volume === 'number') { // ETAPA 51: sincroniza apenas se corresponder ao volume esperado
        if (expectedVolume !== null && data.info.volume === expectedVolume) realVolume = data.info.volume;
      }
      // Etapa 58: emite progress quando duration/currentTime chegam via infoDelivery, mesmo sem
      // progressTimer rodando (youtube-nocookie.com pode não enviar onStateChange PLAYING a tempo).
      // Garante que o hook veja duration > 0 para waitForDuration() e seekTo(dur-3) funcionar.
      if (progressChanged) {
        playerEvents.emit('progress', { currentTime, duration, durationReady, track: getTrackInfo() });
      }
      // Etapa 29: infoDelivery com currentTime > 0 é evidência de playback funcional.
      // youtube-nocookie.com pode não enviar onStateChange PLAYING, mas entrega progresso.
      // Transiciona para PLAYING para iniciar timer de progresso e marcar como disponível.
      if (currentTime > 0 && playerState === 'stopped' && activeBackend === 'youtube') {
        handleStateChange(1); // YT_STATE.PLAYING
      }
    }
    // Etapa 22: também processa onStateChange e initialDelivery (necessário para youtube-nocookie.com)
    if (data.event === 'onStateChange' && typeof data.info === 'number') {
      handleStateChange(data.info);
    }
    if (data.event === 'initialDelivery' && data.info && typeof data.info.duration === 'number') {
      if (data.info.duration > 0) {
        duration = data.info.duration;
        durationReady = true;
        stopDurationPoll();
        // Etapa 58: emite progress para o hook ver duration mesmo sem progressTimer rodando
        playerEvents.emit('progress', { currentTime, duration, durationReady, track: getTrackInfo() });
      }
    }
  } catch { /* ignore */ }
}

// Envia um comando postMessage para o iframe do YouTube.
// A API exige args como ARRAY (ex: [50] para setVolume), nunca string.
function sendCommand(func, args = []) {
  if (!iframe?.contentWindow) return;
  // ETAPA 48/49: fila de comandos quando player nao esta pronto (onReady)
  // Comandos sao tagueados com a geração atual para invalidar comandos de faixa anterior
  if (!playerReady) {
    commandQueue.push({ func, args, gen: instanceGeneration });
    return;
  }
  try {
    iframe.contentWindow.postMessage(
      JSON.stringify({ event: 'command', func, args, channel: 'widget' }),
      activeBackendBase
    );
  } catch { /* ignore */ }
}

// ETAPA 48/49: esvazia a fila de comandos pendentes (chamado em state=PLAYING)
// ETAPA 49: so envia comandos da geração atual — descarta comandos de instância anterior
function flushCommandQueue() {
  if (!commandQueue.length) return;
  const queue = [...commandQueue];
  commandQueue = [];
  const currentGen = instanceGeneration;
  queue.forEach(({ func, args, gen }) => {
    if (gen !== currentGen) return; // ETAPA 49: descarta comandos de geração anterior
    if (!iframe?.contentWindow) return;
    try {
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func, args, channel: 'widget' }),
        activeBackendBase
      );
    } catch { /* ignore */ }
  });
}

// Solicita atualizações periódicas de estado do player
function requestStateUpdates() {
  // ETAPA 40: chamado quando onReady é recebido. Registra listeners de eventos.
  // listening já é enviado no iframe.onload (config vencedora Etapa 39).
  if (!iframe?.contentWindow) return;
  try {
    iframe.contentWindow.postMessage(
      JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onStateChange'], channel: 'widget' }),
      activeBackendBase
    );
    iframe.contentWindow.postMessage(
      JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onError'], channel: 'widget' }),
      activeBackendBase
    );
  } catch { /* ignore */ }
  startDurationPoll(); // ETAPA 44: polling curto de getDuration durante inicialização
  sendCommand('getVolume'); // ETAPA 51: solicita volume atual para sincronizar realVolume
}

// ETAPA 44: polling curto de getDuration durante inicialização (timeout 3s, para quando duration > 0)
function startDurationPoll() {
  stopDurationPoll();
  if (durationReady) return;
  let attempts = 0;
  durationPollTimer = setInterval(() => {
    if (durationReady) { stopDurationPoll(); return; }
    sendCommand('getDuration');
    attempts++;
    if (attempts >= 15) stopDurationPoll(); // 15 * 200ms = 3s
  }, 200);
}
function stopDurationPoll() {
  if (durationPollTimer) { clearInterval(durationPollTimer); durationPollTimer = null; }
}

// Configura ducking: escuta eventos do TTSMusicIntegration
function setupDucking() {
  playerEvents.on('tts_duck_start', ({ duckedLevel: level }) => {
    duckedLevel = level;
    applyVolume();
  });
  playerEvents.on('tts_duck_end', () => {
    duckedLevel = null;
    applyVolume();
  });
}

// Aplica o volume no player (base × ducking)
function applyVolume() {
  const vol = duckedLevel !== null ? Math.round(baseVolume * duckedLevel) : baseVolume;
  sendCommand('setVolume', [vol]);
}

// Reproduz uma faixa — carrega o videoId no iframe do YouTube Music
export async function playTrack(track) {
  if (!track) return;

  // Roteamento: fonte de áudio direta (não-YouTube) -> backend HTML5 <audio>
  if (isDirectAudioTrack(track)) {
    activeBackend = 'audio';
    audioSetActive(true);
    stopYoutubePlayback();
    console.log('[Player] Backend ativo: HTML5 Audio fallback (áudio direto).', track.audioUrl || track.url);
    playerEvents.emit('backend_changed', { backend: 'audio' });
    playerEvents.emit('playback_available');
    audioPlayTrack(track);
    return;
  }

  if (!track.videoId) {
    playerEvents.emit('play_error', { message: 'Fonte inválida: sem videoId e sem URL de áudio direta' });
    return;
  }

  // Backend YouTube iframe
  activeBackend = 'youtube';
  audioSetActive(false);
  audioStop();
  await initPlayer('yt-music-player');
  activeBackendBase = resolveBackendBase();
  currentTrack = { ...track, _started: false };
  // Etapa 58: reset completo do estado de playback para a nova faixa.
  // Sem isso, playerState herdado da faixa anterior ('playing') impede que o fallback
  // currentTime>0 dispare handleStateChange(PLAYING) e que play() inicie o progressTimer.
  // Resultado: progressTimer nunca roda, detecção de ENDED nunca fire, auto-advance nunca acontece.
  playerState = 'stopped';
  stopProgressTimer();
  currentTime = 0;
  duration = 0;
  durationReady = false; // ETAPA 44: reset para nova faixa
  realVolume = null; // ETAPA 51: reset volume real para nova faixa (evita infoDelivery de instância anterior)
  expectedVolume = baseVolume; // ETAPA 51: espera volume persistido na nova instância
  console.log(`[Player] Backend ativo: ${activeBackendBase} (flag=${isMigrationEnabled() ? 'ON' : 'OFF'})`, track.videoId);
  playerEvents.emit('backend_changed', { backend: 'youtube', base: activeBackendBase });
  playerEvents.emit('playback_available');
  playerEvents.emit('track_changed', getTrackInfo());
  // Etapa 58: emite progress com valores resetados para o hook React atualizar progress.duration/currentTime.
  // Sem isso, o hook mantém duration/currentTime da faixa anterior (stale) e waitForDuration() retorna valor errado,
  // causando seekTo(durErrada) que não posiciona perto do fim → auto-advance nunca dispara dentro do timeout.
  playerEvents.emit('progress', { currentTime: 0, duration: 0, durationReady: false, track: getTrackInfo() });
  broadcastState();
  // Etapa 60: yield microtask — garante que o hook React processe setProgress({duration:0}) e setTrack
  // antes de playTrack retornar. Sem isso, waitForHookState resolve na primeira poll sobre estado stale
  // (track.videoId igual ao da faixa anterior), e waitForDuration() resolve sobre progress.duration stale.
  await new Promise(r => setTimeout(r, 0));

  if (iframe) {
    // mute=1 garante autoplay em ambientes restritos (Boosteroid). Som ativa no unlock.
    iframe.src = buildEmbedUrl(track.videoId);
    playerReady = false; // Etapa 32: reset — novo iframe enviará onReady
    instanceGeneration++; // ETAPA 49: nova geração — invalida comandos pendentes da faixa anterior
    commandQueue = []; // ETAPA 48/49: limpa comandos da faixa anterior
    // ETAPA 40: backup — enviar listening após 300ms (caso onload já tenha disparado)
    setTimeout(() => {
      try { iframe?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', channel: 'widget' }), activeBackendBase); } catch { /* ignore */ }
    }, 300);
    setTimeout(() => { sendCommand('unMute'); applyVolume(); }, 1500);
    // Etapa 29: só marca como indisponível se NÃO houver progresso (currentTime === 0).
    // youtube-nocookie.com entrega infoDelivery com currentTime > 0 mesmo sem onStateChange,
    // evidência de playback funcional (Etapa 28: 10/10 playback PASS, 0 erros 150).
    setTimeout(() => {
      if (currentTrack && playerState === 'stopped' && activeBackend === 'youtube' && currentTime === 0) {
        console.warn('[Player] YouTube iframe sem resposta postMessage — playback unavailable (possível bloqueio de rede/ambiente).');
        playerEvents.emit('playback_unavailable', { reason: 'youtube_iframe_no_response' });
        broadcastState();
      }
    }, 3500);
  }
}

export function play() {
  if (activeBackend === 'audio') return audioPlay();
  sendCommand('playVideo');
  // Otimista: atualiza estado imediatamente para responsividade da UI sob operações rápidas.
  // O YouTube corrige via onStateChange se necessário (ex: buffering, erro).
  if (currentTrack && playerState !== 'playing') {
    playerState = 'playing';
    startProgressTimer();
    playerEvents.emit('track_resumed', getTrackInfo());
    broadcastState();
  }
}

export function pause() {
  if (activeBackend === 'audio') return audioPause();
  sendCommand('pauseVideo');
  if (currentTrack && playerState !== 'paused') {
    playerState = 'paused';
    stopProgressTimer();
    playerEvents.emit('track_paused', getTrackInfo());
    broadcastState();
  }
}

// Desbloqueia o áudio após gesto do usuário (necessário no Boosteroid/cloud gaming).
// Envia unMute + aplica volume. Retorna true se o unlock acabou de acontecer.
export function unlockAudio() {
  if (activeBackend === 'audio') return audioUnlock();
  return false;
}

export function isAudioLocked() {
  if (activeBackend === 'audio') return audioIsLocked();
  return false;
}

export function seekTo(seconds) {
  if (activeBackend === 'audio') return audioSeek(seconds);
  sendCommand('seekTo', [seconds, true]);
}

export function setVolume(vol) {
  baseVolume = vol;
  expectedVolume = vol; // ETAPA 51: volume esperado para matching de infoDelivery
  if (activeBackend === 'audio') { audioSetVolume(vol); return; }
  const s = loadMusicSettings();
  s.volume = vol;
  saveMusicSettings(s);
  sendCommand('unMute'); // desmuta o player ao ajustar volume (mute=1 no URL para autoplay)
  applyVolume();
  playerEvents.emit('player_volume_changed', { volume: vol });
  playerEvents.emit('audio_unlocked');
  broadcastState();
}

export function getVolume() {
  if (activeBackend === 'audio') return audioGetVolume();
  return baseVolume;
}

// ETAPA 51: volume real sincronizado via infoDelivery — null até sync confirmado, fallback baseVolume
export function getRealVolume() {
  if (activeBackend === 'audio') return audioGetVolume();
  return realVolume !== null ? realVolume : baseVolume;
}
export function isVolumeSynced() {
  if (activeBackend === 'audio') return true;
  return realVolume !== null;
}

// ETAPA 40: controles de mute para validação forense (mute state via infoDelivery)
export function mute() {
  if (activeBackend === 'audio') return;
  sendCommand('mute');
  mutedState = true; // Etapa 59: update otimista — mesmo padrao de play()/pause() (Etapa 58)
}
export function unMute() {
  if (activeBackend === 'audio') return audioUnlock();
  sendCommand('unMute');
  mutedState = false; // Etapa 59: update otimista — mesmo padrao de play()/pause() (Etapa 58)
}
export function isMuted() {
  if (activeBackend === 'audio') return audioIsLocked();
  return mutedState;
}

export function isPlaybackAvailable() { return true; }

export function playNext() {
  const settings = loadMusicSettings();
  const next = queueManager.next(settings.repeat, settings.shuffle);
  if (next) playTrack(next);
}

export function playPrev() {
  const prev = queueManager.prev();
  if (prev) playTrack(prev);
}

export function jumpTo(index) {
  const track = queueManager.jumpTo(index);
  if (track) playTrack(track);
}

const YT_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
};

function handleStateChange(state) {
  switch (state) {
    case YT_STATE.PLAYING:
      playerState = 'playing';
      startProgressTimer();
      flushCommandQueue(); // ETAPA 48: esvazia comandos pendentes apos video comecar a tocar
      playerEvents.emit('playback_available'); // reset: o YouTube está realmente tocando
      if (currentTrack && !currentTrack._started) {
        currentTrack._started = true;
        historyManager.add(currentTrack);
        playerEvents.emit('track_started', getTrackInfo());
      }
      playerEvents.emit('track_resumed', getTrackInfo());
      break;
    case YT_STATE.PAUSED:
      playerState = 'paused';
      stopProgressTimer();
      playerEvents.emit('track_paused', getTrackInfo());
      break;
    case YT_STATE.ENDED:
      if (playerState === 'stopped') break; // Evita duplo ENDED (detecção progress + onStateChange)
      playerState = 'stopped';
      stopProgressTimer();
      playerEvents.emit('track_finished', getTrackInfo());
      handleTrackEnd();
      break;
    case YT_STATE.BUFFERING:
      playerState = 'buffering';
      break;
    default:
      break;
  }
  broadcastState();
}

function handleTrackEnd() {
  const settings = loadMusicSettings();
  const next = queueManager.next(settings.repeat, settings.shuffle);
  if (next) {
    playTrack(next);
  } else {
    currentTrack = null;
    audioStop(); // limpa o backend de áudio se ativo
    playerEvents.emit('queue_empty');
    broadcastState();
  }
}

export function getCurrentTrack() {
  if (activeBackend === 'audio') return audioGetCurrentTrack();
  return getTrackInfo();
}
export function isReady() {
  if (activeBackend === 'audio') return audioIsReady();
  return playerReady && !!iframe; // Etapa 32: baseado em onReady, não apenas existência do iframe
}

// ETAPA 43: getters read-only para diagnóstico forense de duration/timing
export function getDuration() { return duration; }
export function getCurrentTime() { return currentTime; }
export function isDurationReady() { return durationReady; }

// Retorna a URL do YouTube Music (music.youtube.com) da faixa atual —
// usada pelo botão "Abrir no YouTube Music" e ações externas.
// NUNCA retorna youtube.com — sempre music.youtube.com.
// Para faixas de áudio direto (fallback), retorna null (não há link do YT Music).
export function getCurrentMusicUrl() {
  if (activeBackend === 'audio' || !currentTrack?.videoId) return null;
  return `https://music.youtube.com/watch?v=${currentTrack.videoId}`;
}

export function destroyPlayer() {
  stopProgressTimer();
  stopHeartbeat();
  stopDurationPoll(); // ETAPA 44
  destroyAudioPlayer();
  playerReady = false; // Etapa 32: reset
  durationReady = false; // ETAPA 44
  realVolume = null; // ETAPA 51: reset volume real no destroy
  expectedVolume = null; // ETAPA 51: reset expected volume no destroy
  instanceGeneration++; // ETAPA 49: invalida comandos pendentes no destroy
  commandQueue = []; // ETAPA 48/49: limpa fila no destroy
  if (messageListenerSetup) {
    window.removeEventListener('message', handlePostMessage);
    messageListenerSetup = false;
  }
  currentTrack = null; // Etapa 58: nula currentTrack para que o setTimeout de 3500ms em playTrack (nao rastreado) nao emita playback_unavailable pos-destroy
  if (iframe) { try { iframe.remove(); } catch { /* ignore */ } iframe = null; }
  if (broadcastChannel) { try { broadcastChannel.close(); } catch { /* ignore */ } broadcastChannel = null; }
}

function startProgressTimer() {
  stopProgressTimer();
  progressTimer = setInterval(() => {
    // Solicita tempo atual via postMessage (funciona se o player responder)
    sendCommand('getCurrentTime');
    sendCommand('getDuration');
    sendCommand('getVolume'); // ETAPA 51: poll volume para sincronizar realVolume
    // Detecção alternativa de ENDED: youtube-nocookie.com pode não enviar onStateChange(0)
    // de forma confiável (Etapa 29). Se currentTime >= duration - 0.5 e está tocando, terminou.
    if (duration > 0 && currentTime >= duration - 0.5 && playerState === 'playing') {
      handleStateChange(YT_STATE.ENDED);
      return;
    }
    playerEvents.emit('progress', { currentTime, duration, durationReady, track: getTrackInfo() });
    broadcastState();
  }, 1000);
}

function stopProgressTimer() {
  if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
}

function getTrackInfo() {
  if (!currentTrack) return null;
  return { ...currentTrack, currentTime, duration, state: playerState };
}

function getBroadcastChannel() {
  if (broadcastChannel) return broadcastChannel;
  try { broadcastChannel = new BroadcastChannel('streamspeak_music'); } catch { broadcastChannel = null; }
  return broadcastChannel;
}

// Escuta pedidos de estado da overlay (music_request_state) e responde imediatamente
function setupBroadcastListener() {
  const ch = getBroadcastChannel();
  if (!ch) return;
  try {
    ch.addEventListener('message', (ev) => {
      if (ev.data?.type === 'music_request_state' && activeBackend === 'youtube') {
        broadcastState();
      }
    });
  } catch { /* ignore */ }
}

// Heartbeat: transmite o estado a cada 2s enquanto houver faixa carregada,
// independente do postMessage do YouTube (garante que a overlay sempre receba dados)
function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    if (currentTrack) broadcastState();
  }, 2000);
}

function stopHeartbeat() {
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
}

function broadcastState() {
  const ch = getBroadcastChannel();
  const stateData = {
    type: 'music_state',
    track: getTrackInfo(),
    queue: queueManager.getQueue(),
    settings: loadMusicSettings(),
    timestamp: Date.now(),
  };
  if (ch) {
    try { ch.postMessage(stateData); } catch { /* ignore */ }
  }
  // Fallback confiável: localStorage dispara eventos 'storage' em outras abas
  try {
    localStorage.setItem('streamspeak_music_state', JSON.stringify(stateData));
  } catch { /* ignore */ }
}