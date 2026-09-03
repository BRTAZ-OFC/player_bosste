// Gerenciador de histórico de buscas (queries digitadas) — persiste em localStorage.
// Cap em 20 itens, deduplica (move para o topo se já existir).

const STORAGE_KEY = 'streamspeak_music_search_history';
const MAX_ITEMS = 20;

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
  } catch { /* ignore */ }
}

class SearchHistoryManager {
  constructor() {
    this.items = load();
  }

  add(query) {
    if (!query || !query.trim()) return;
    const q = query.trim();
    // Dedup: remove ocorrências anteriores
    this.items = this.items.filter((i) => (i?.query || '').toLowerCase() !== q.toLowerCase());
    this.items.unshift({ query: q, searchedAt: Date.now() });
    if (this.items.length > MAX_ITEMS) this.items = this.items.slice(0, MAX_ITEMS);
    save(this.items);
  }

  list() {
    return this.items;
  }

  clear() {
    this.items = [];
    save(this.items);
  }

  remove(query) {
    this.items = this.items.filter((i) => i.query !== query);
    save(this.items);
  }
}

export const searchHistoryManager = new SearchHistoryManager();