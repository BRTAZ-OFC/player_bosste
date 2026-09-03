// Hook React que conecta componentes ao estado do player de música via eventos.
import { useEffect, useState } from 'react';
import { playerEvents } from './playerEvents';
import { queueManager } from './queueManager';
import { historyManager } from './historyManager';
import { loadMusicSettings } from './musicSettings';
import { isPlaybackAvailable, getCurrentTrack } from './youtubePlayer';
import { isTtsActive } from './ttsMusicIntegration';

export function useMusicPlayer() {
  const [track, setTrack] = useState(getCurrentTrack());
  const [progress, setProgress] = useState({ currentTime: 0, duration: 0 });
  const [durationReady, setDurationReady] = useState(false);
  const [queue, setQueue] = useState([]);
  const [history, setHistory] = useState(historyManager.list());
  const [settings, setSettings] = useState(loadMusicSettings());
  const [error, setError] = useState(null);
  const [playbackAvailable, setPlaybackAvailable] = useState(true);
  const [ttsActive, setTtsActive] = useState(isTtsActive());
  const [backend, setBackend] = useState('youtube');

  useEffect(() => {
    const unsubs = [
      playerEvents.on('track_changed', (t) => { setTrack(t); setError(null); }),
      playerEvents.on('track_started', (t) => setTrack(t)),
      playerEvents.on('track_resumed', (t) => setTrack(t)),
      playerEvents.on('track_paused', (t) => setTrack(t)),
      playerEvents.on('track_finished', () => setTrack(null)),
      playerEvents.on('progress', (p) => { setProgress(p); setDurationReady(!!p.durationReady); }),
      playerEvents.on('queue_changed', (q) => setQueue(q || [])),
      playerEvents.on('history_changed', (h) => setHistory(h || [])),
      playerEvents.on('player_volume_changed', () => setSettings(loadMusicSettings())),
      playerEvents.on('play_error', (e) => setError(e?.message || 'Erro de reprodução')),
      playerEvents.on('playback_unavailable', () => setPlaybackAvailable(false)),
      playerEvents.on('playback_available', () => setPlaybackAvailable(true)),
      playerEvents.on('backend_changed', (e) => setBackend(e?.backend || 'youtube')),
      playerEvents.on('audio_source_changed', (e) => setTtsActive(e?.source === 'tts')),
    ];
    setQueue(queueManager.getQueue());
    setHistory(historyManager.list());
    setPlaybackAvailable(isPlaybackAvailable());
    setTtsActive(isTtsActive());
    return () => unsubs.forEach((u) => { try { u(); } catch { /* ignore */ } });
  }, []);

  const isPlaying = track?.state === 'playing';

  return { track, progress, queue, history, settings, error, isPlaying, playbackAvailable, ttsActive, backend, durationReady };
}