// Biblioteca pessoal (frontend-only) — persiste no localStorage.
// Guarda músicas, álbuns, playlists e artistas marcados com "+".
import { playerEvents } from './playerEvents';

const KEY = 'sonora_library';
const MAX = 500;

function idOf(item) {
  return item && (item.videoId || item.playlistId || item.browseId || item.title);
}

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}
function save(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ }
  playerEvents.emit('library_changed', list);
}

class LibraryManager {
  list() { return load(); }
  has(item) { const id = idOf(item); return !!id && load().some((it) => idOf(it) === id); }
  add(item) {
    const id = idOf(item);
    if (!id) return;
    const list = load();
    if (list.some((it) => idOf(it) === id)) return; // dedupe
    list.unshift({ ...item, _addedAt: Date.now() });
    if (list.length > MAX) list.length = MAX;
    save(list);
  }
  remove(item) {
    const id = idOf(item);
    if (!id) return;
    save(load().filter((it) => idOf(it) !== id));
  }
  clear() { save([]); }
}

export const libraryManager = new LibraryManager();