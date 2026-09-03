// HTML5 Audio fallback — backend de áudio para fontes legítimas NÃO-YouTube
// (uploads do usuário, URLs diretas de MP3/OGG/WAV/M4A/AAC/FLAC/OPUS/WEBM).
//
// Aditivo e isolado: NÃO remove nem quebra o player YouTube (youtubePlayer.js).
// Mesmo contrato de eventos (playerEvents) e broadcast (BroadcastChannel +
// localStorage) usado pela UI, fila, ducking, histórico e overlays.
//
// NÃO reproduz music.youtube.com/watch, youtube.com/watch, youtube-nocookie.com/embed
// nem qualquer página HTML como se fosse arquivo de áudio. A validação da fonte
// é feita no roteador (youtubePlayer.isDirectAudioTrack).
//
// NÃO usa yt-dlp, extração de stream, Innertube, googlevideo, bypass de DRM,
// proxy para contornar bloqueios nem bloqueador de anúncios.

import { playerEvents } from './playerEvents';
import { loadMusicSettings, saveMusicSettings } from './musicSettings';
import { queueManager } from './queueManager';
import { historyManager } from './historyManager';

let audioEl = null;
let currentTrack = null;
let currentTime = 0;
let duration = 0;
let playerState = 'stopped';
let progressTimer = null;
let broadcastChannel = null;
let baseVolume = 80;
let duckedLevel = null;
let duckingSetup = false;
let broadcastListenerSetup = false;
let heartbeatTimer = null;
let isActive = false; // true quando este backend é o ativo (apenas ele transmite)
let onEndedCallback = null;

// Inicializa o backend de áudio. onEnded = callback de fim de faixa (roteador).
export function initAudioPlayer(onEnded) {
  onEndedCallback = typeof onEnded === 'function' ? onEnded : null;
  ensureAudioEl();
  baseVolume = loadMusicSettings().volume ?? 80;
  setupDucking();
  setupBroadcastListener();
  startHeartbeat();
  console.log('[Player] Backend HTML5 Audio fallback inicializado (aguardando fonte de áudio direta).');
}

function ensureAudioEl() {
  if (audioEl && audioEl.isConnected) return audioEl;
  const el = document.createElement('audio');
  el.preload = 'auto';
  el.style.display = 'none';
  el.addEventListener('timeupdate', () => { currentTime = el.currentTime || 0; });
  el.addEventListener('durationchange', () => { duration = el.duration || 0; });
  el.addEventListener('loadedmetadata', () => { duration = el.duration || 0; });
  el.addEventListener('play', () => {
    playerState = 'playing';
    startProgressTimer();
    if (currentTrack && !currentTrack._started) {
      currentTrack._started = true;
      historyManager.add(currentTrack);
      playerEvents.emit('track_started', getTrackInfo());
    }
    playerEvents.emit('track_resumed', getTrackInfo());
    broadcastState();
  });
  el.addEventListener('pause', () => {
    if (el.ended) return;
    playerState = 'paused';
    stopProgressTimer();
    playerEvents.emit('track_paused', getTrackInfo());
    broadcastState();
  });
  el.addEventListener('ended', () => {
    playerState = 'stopped';
    stopProgressTimer();
    playerEvents.emit('track_finished', getTrackInfo());
    if (typeof onEndedCallback === 'function') onEndedCallback();
  });
  el.addEventListener('error', (e) => {
    console.error('[HTML5 Audio] erro de mídia:', el?.error, e);
    playerEvents.emit('play_error', { message: 'Falha ao carregar áudio (URL inválida, CORS ou indisponível)' });
    playerState = 'stopped';
    stopProgressTimer();
    broadcastState();
  });
  document.body.appendChild(el);
  audioEl = el;
  return el;
}

// Reproduz uma faixa de áudio direta (track.audioUrl).
export async function playTrack(track) {
  if (!track || !track.audioUrl) return;
  ensureAudioEl();
  currentTrack = { ...track, _started: false };
  currentTime = 0;
  duration = 0;
  playerEvents.emit('track_changed', getTrackInfo());
  playerEvents.emit('audio_unlocked'); // HTML5 audio não exige unlock como o iframe
  playerEvents.emit('playback_available');
  broadcastState();
  audioEl.src = track.audioUrl;
  applyVolume();
  const p = audioEl.play();
  if (p && typeof p.then === 'function') {
    p.then(() => console.log('[HTML5 Audio] reproduzindo:', track.audioUrl))
      .catch((err) => {
        console.warn('[HTML5 Audio] play() bloqueado/erro:', err?.message);
        playerEvents.emit('play_error', { message: 'Reprodução bloqueada — toque em play (gesto do usuário)' });
      });
  }
}

export function play() { if (!audioEl) return; audioEl.play().catch(() => {}); }
export function pause() { if (!audioEl) return; audioEl.pause(); }
export function seekTo(seconds) {
  if (!audioEl) return;
  try { audioEl.currentTime = Number(seconds) || 0; } catch { /* ignore */ }
}
export function setVolume(vol) {
  baseVolume = vol;
  applyVolume();
  const s = loadMusicSettings();
  s.volume = vol;
  saveMusicSettings(s);
  playerEvents.emit('player_volume_changed', { volume: vol });
  playerEvents.emit('audio_unlocked');
  broadcastState();
}
export function getVolume() { return baseVolume; }
export function unlockAudio() { playerEvents.emit('audio_unlocked'); return true; }
export function isAudioLocked() { return false; }
export function getCurrentTrack() { return getTrackInfo(); }
export function isReady() { return !!audioEl; }

// Define se este backend é o ativo (apenas o ativo transmite/heartbeat).
export function setActive(v) {
  isActive = !!v;
  if (!isActive) stopProgressTimer();
}

// Para e limpa o backend de áudio (ao alternar para o YouTube).
export function stop() {
  if (audioEl) {
    try { audioEl.pause(); audioEl.removeAttribute('src'); audioEl.load(); } catch { /* ignore */ }
  }
  currentTrack = null;
  currentTime = 0;
  duration = 0;
  playerState = 'stopped';
  stopProgressTimer();
}

export function destroyAudioPlayer() {
  stop();
  stopHeartbeat();
  if (audioEl) { try { audioEl.remove(); } catch { /* ignore */ } audioEl = null; }
  if (broadcastChannel) { try { broadcastChannel.close(); } catch { /* ignore */ } broadcastChannel = null; }
}

function setupDucking() {
  if (duckingSetup) return;
  duckingSetup = true;
  playerEvents.on('tts_duck_start', ({ duckedLevel: level }) => { duckedLevel = level; applyVolume(); });
  playerEvents.on('tts_duck_end', () => { duckedLevel = null; applyVolume(); });
}

function applyVolume() {
  if (!audioEl) return;
  const v = duckedLevel !== null ? Math.round(baseVolume * duckedLevel) : baseVolume;
  try { audioEl.volume = Math.min(1, Math.max(0, v / 100)); } catch { /* ignore */ }
}

function startProgressTimer() {
  stopProgressTimer();
  progressTimer = setInterval(() => {
    currentTime = audioEl?.currentTime || 0;
    duration = audioEl?.duration || 0;
    playerEvents.emit('progress', { currentTime, duration, track: getTrackInfo() });
    broadcastState();
  }, 500);
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

function setupBroadcastListener() {
  if (broadcastListenerSetup) return;
  broadcastListenerSetup = true;
  const ch = getBroadcastChannel();
  if (!ch) return;
  try {
    ch.addEventListener('message', (ev) => {
      if (ev.data?.type === 'music_request_state' && isActive) broadcastState();
    });
  } catch { /* ignore */ }
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    if (currentTrack && isActive) broadcastState();
  }, 2000);
}

function stopHeartbeat() {
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
}

function broadcastState() {
  if (!isActive) return; // apenas o backend ativo transmite (evita conflito com YouTube)
  const ch = getBroadcastChannel();
  const stateData = {
    type: 'music_state',
    track: getTrackInfo(),
    queue: queueManager.getQueue(),
    settings: loadMusicSettings(),
    timestamp: Date.now(),
  };
  if (ch) { try { ch.postMessage(stateData); } catch { /* ignore */ } }
  try { localStorage.setItem('streamspeak_music_state', JSON.stringify(stateData)); } catch { /* ignore */ }
}