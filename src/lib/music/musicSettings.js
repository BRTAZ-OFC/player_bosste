// Configurações do player de música — persistidas em localStorage (custo zero).

const KEY = 'streamspeak_music_settings';

export const DEFAULT_MUSIC_SETTINGS = {
  volume: 80,
  repeat: 'off', // 'off' | 'one' | 'all'
  shuffle: false,
  overlay: {
    showArt: true,
    showArtist: true,
    showAlbum: true,
    showProgress: true,
    marqueeSpeed: 30, // segundos para uma rolagem completa
    opacity: 0.82,
    position: 'bottom-right', // bottom-left | bottom-right | top-left | top-right
    size: 'md', // sm | md | lg
  },
};

export function loadMusicSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_MUSIC_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_MUSIC_SETTINGS,
      ...parsed,
      overlay: { ...DEFAULT_MUSIC_SETTINGS.overlay, ...(parsed.overlay || {}) },
    };
  } catch {
    return { ...DEFAULT_MUSIC_SETTINGS };
  }
}

export function saveMusicSettings(settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

export function updateMusicSettings(patch) {
  const current = loadMusicSettings();
  const next = { ...current, ...patch };
  saveMusicSettings(next);
  return next;
}