// TTSMusicIntegration — comunicação entre o TTS e o player de música.
// Baixa o volume da música quando o TTS está falando e restaura após o término.
// Não altera o funcionamento do TTS — apenas notifica o player via eventos.
// Também rastreia qual sistema está produzindo áudio no momento.

import { playerEvents } from './playerEvents';

let ttsActive = false;
let savedMusicVolume = null;
let duckingEnabled = true;
let duckingLevel = 0.2; // volume da música durante TTS (20% do volume normal)

// Chamado pelo ttsEngine quando o TTS começa a falar.
// Reduz o volume da música e emite evento para o player.
export function onTtsStart() {
  if (ttsActive) return;
  ttsActive = true;
  if (duckingEnabled) {
    playerEvents.emit('tts_duck_start', { duckedLevel: duckingLevel });
  }
  playerEvents.emit('audio_source_changed', { source: 'tts' });
}

// Chamado pelo ttsEngine quando o TTS termina de falar.
// Restaura o volume da música.
export function onTtsEnd() {
  if (!ttsActive) return;
  ttsActive = false;
  if (duckingEnabled) {
    playerEvents.emit('tts_duck_end', {});
  }
  playerEvents.emit('audio_source_changed', { source: 'music' });
}

export function isTtsActive() { return ttsActive; }
export function isDuckingEnabled() { return duckingEnabled; }
export function getDuckingLevel() { return duckingLevel; }

export function setDuckingEnabled(enabled) {
  duckingEnabled = !!enabled;
  // Se desativou enquanto TTS está ativo, restaura o volume
  if (!duckingEnabled && ttsActive) {
    playerEvents.emit('tts_duck_end', {});
  }
}

export function setDuckingLevel(level) {
  duckingLevel = Math.min(1, Math.max(0, Number(level) || 0));
  // Se TTS está ativo, atualiza o nível aplicado
  if (ttsActive && duckingEnabled) {
    playerEvents.emit('tts_duck_start', { duckedLevel: duckingLevel });
  }
}