// Gerenciador de histórico de faixas tocadas — persiste em localStorage,
// cap em 50 itens, deduplica (move para o topo se já existir) e emite
// eventos via playerEvents para a UI reagar.

import { playerEvents } from './playerEvents';

const STORAGE_KEY = 'streamspeak_music_history';
const MAX_ITEMS = 50;

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function save(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch { /* ignore quota errors */ }
}

class HistoryManager {
  constructor() {
    this.items = load();
  }

  // Adiciona uma faixa ao topo do histórico (chamado ao iniciar reprodução)
  add(track) {
    if (!track || !track.videoId) return;
    const entry = {
      videoId: track.videoId,
      title: track.title || 'Música desconhecida',
      artist: track.artist || 'Artista desconhecido',
      thumbnail: track.thumbnail || null,
      durationStr: track.durationStr || '',
      playedAt: Date.now(),
    };
    // Dedup: remove ocorrências anteriores da mesma faixa
    this.items = this.items.filter((t) => t.videoId !== entry.videoId);
    this.items.unshift(entry);
    if (this.items.length > MAX_ITEMS) this.items = this.items.slice(0, MAX_ITEMS);
    save(this.items);
    playerEvents.emit('history_changed', this.items);
  }

  list() {
    return this.items;
  }

  clear() {
    this.items = [];
    save(this.items);
    playerEvents.emit('history_changed', this.items);
  }

  remove(videoId) {
    this.items = this.items.filter((t) => t.videoId !== videoId);
    save(this.items);
    playerEvents.emit('history_changed', this.items);
  }
}

export const historyManager = new HistoryManager();