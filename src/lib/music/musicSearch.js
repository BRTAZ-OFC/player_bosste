// Busca no YouTube Music — MODO ZERO CREDITS.
// Todas as buscas usam r.jina.ai (proxy de leitura gratuito, direto do frontend).
// NENHUMA chamada a base44.functions.invoke — zero Integration Credits por busca.
// As backend functions YoutubeMusicSearch/Album/Playlist/Mix permanecem no código
// mas NÃO são chamadas pelo frontend em modo zero-credit.
// NUNCA converte para youtube.com — preserva music.youtube.com sempre.

import { base44 } from '@/api/base44Client';

const SEARCH_TIMEOUT = 12000;

// Re-exporta parseMusicUrl do MusicUrlManager (substitui parseYouTubeUrl)
export { parseMusicUrl as parseYouTubeUrl } from './musicUrlManager';
export { parseMusicUrl } from './musicUrlManager';

// Cache em memoria (LRU simples) — evita re-fetch do mesmo termo/filtro/continuation.
// Cacheia a resposta CRUA do backend (results + continuation) para que abas que derivam
// da mesma busca mista (Músicas e Mixes usam filter '') não disparem chamadas duplicadas.
const searchCache = new Map();
const CACHE_MAX = 30;

function cacheKey(query, filter, continuation) {
  return `${query}::${filter || ''}::${continuation || ''}`;
}

function getCached(key) {
  return searchCache.get(key) || null;
}
function setCached(key, val) {
  if (searchCache.size >= CACHE_MAX) {
    const first = searchCache.keys().next().value;
    if (first) searchCache.delete(first);
  }
  searchCache.set(key, val);
}

// ZERO CREDITS: r.jina.ai é a ÚNICA rota de busca — direto do frontend, sem backend.
// Paginação (continuation) não é suportada pelo r.jina.ai — retorna vazio em modo zero-credit.
async function fetchSearch(query, filter, continuation) {
  const key = cacheKey(query, filter, continuation);
  const cached = getCached(key);
  if (cached) return cached;

  // Paginação indisponível em modo zero-credit (r.jina.ai não suporta continuation)
  if (continuation) return { results: [], continuation: '' };

  const result = await fetchSearchJina(query, filter);
  setCached(key, result);
  return result;
}

// Busca músicas (aba "Músicas") — Songs + Videos tocáveis (com videoId).
// Deriva da busca mista (filter '') e filtra itens com videoId.
export async function searchMusic(query, _apiKey, opts = {}) {
  if (!query || !query.trim()) return { items: [], continuation: '' };
  const maxResults = opts.maxResults || 50;
  const { results, continuation } = await fetchSearch(query, '');
  const items = results.filter((t) => t && t.videoId).slice(0, maxResults);
  return { items, continuation };
}

// Busca artistas (aba "Artistas") — filter 'artists'.
export async function searchArtists(query, opts = {}) {
  if (!query || !query.trim()) return { items: [], continuation: '' };
  const maxResults = opts.maxResults || 30;
  const { results, continuation } = await fetchSearch(query, 'artists');
  const items = results.filter((t) => t && t.type === 'artist').slice(0, maxResults);
  return { items, continuation };
}

// Busca álbuns (aba "Álbuns") — álbuns oficiais, singles, EPs. Filter 'albums'.
export async function searchAlbums(query, opts = {}) {
  if (!query || !query.trim()) return { items: [], continuation: '' };
  const maxResults = opts.maxResults || 30;
  const { results, continuation } = await fetchSearch(query, 'albums');
  const items = results.filter((t) => t && t.type === 'album').slice(0, maxResults);
  return { items, continuation };
}

// Busca playlists (aba "Playlists") — oficiais e da comunidade. Filter 'playlists'.
export async function searchPlaylists(query, _apiKey, opts = {}) {
  if (!query || !query.trim()) return { items: [], continuation: '' };
  const maxResults = opts.maxResults || 30;
  const { results, continuation } = await fetchSearch(query, 'playlists');
  const items = results
    .filter((t) => t && (t.type === 'playlist' || t.playlistId))
    .slice(0, maxResults);
  return { items, continuation };
}

// Busca mixes (aba "Mixes") — recomendações/radio. Sem filter dedicado: deriva da busca
// mista (filter '') e filtra type === 'mix'. Compartilha o cache da busca mista com Músicas.
export async function searchMixes(query, opts = {}) {
  if (!query || !query.trim()) return { items: [], continuation: '' };
  const maxResults = opts.maxResults || 20;
  const { results, continuation } = await fetchSearch(query, '');
  const items = results.filter((t) => t && t.type === 'mix').slice(0, maxResults);
  return { items, continuation };
}

// Busca mista — retorna TODOS os tipos da backend function.
export async function searchAll(query, opts = {}) {
  if (!query || !query.trim()) return { items: [], continuation: '' };
  const maxResults = opts.maxResults || 50;
  const { results, continuation } = await fetchSearch(query, '');
  const items = results.slice(0, maxResults);
  return { items, continuation };
}

// Paginação via continuation — carrega mais resultados do mesmo termo/filtro.
// O continuation token já codifica o contexto do filtro, então filter é ignorado quando
// continuation está presente (comportamento do backend). Retorna { items, continuation }.
// Para abas que filtram client-side (Músicas/Mixes), o caller filtra os items.
export async function searchMore(query, filter, continuation, opts = {}) {
  if (!query || !continuation) return { items: [], continuation: '' };
  const maxResults = opts.maxResults || 50;
  const { results, continuation: nextContinuation } = await fetchSearch(query, filter, continuation);
  const items = results.slice(0, maxResults);
  return { items, continuation: nextContinuation };
}

// Lista faixas de uma playlist via r.jina.ai (ZERO CREDITS — sem base44.functions.invoke).
// Busca a página da playlist no YouTube Music, renderiza via r.jina.ai e extrai tracks do markdown.
export async function getPlaylistItems(playlistId, _apiKey) {
  if (!playlistId) return [];
  try {
    const text = await fetchViaJina(`https://music.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`);
    return parseTracksFromMarkdown(text);
  } catch (err) {
    console.warn('[musicSearch] getPlaylistItems (jina) falhou:', err?.message || err);
    return [];
  }
}

// Resolução de faixas de ÁLBUNS (MPRE/MPSP) via r.jina.ai (ZERO CREDITS).
// Busca a página do álbum no YouTube Music, renderiza via r.jina.ai e extrai tracks do markdown.
export async function getAlbumItems(albumId) {
  if (!albumId) return [];
  try {
    const text = await fetchViaJina(`https://music.youtube.com/browse/${encodeURIComponent(albumId)}`);
    return parseTracksFromMarkdown(text);
  } catch (err) {
    console.warn('[musicSearch] getAlbumItems (jina) falhou:', err?.message || err);
    return [];
  }
}

// Versão completa — via r.jina.ai (ZERO CREDITS). Metadata do álbum extraída do markdown quando possível.
export async function getAlbumItemsFull(albumId) {
  if (!albumId) return { tracks: [], album: null, unavailableTracks: 0 };
  try {
    const text = await fetchViaJina(`https://music.youtube.com/browse/${encodeURIComponent(albumId)}`);
    const tracks = parseTracksFromMarkdown(text);
    return { tracks, album: null, unavailableTracks: 0 };
  } catch (err) {
    console.warn('[musicSearch] getAlbumItemsFull (jina) falhou:', err?.message || err);
    return { tracks: [], album: null, unavailableTracks: 0 };
  }
}

// Resolução de faixas de MIX RD (radio/curated) via r.jina.ai (ZERO CREDITS).
// RDCLAK... resolve como playlist no YouTube Music — mesma página, mesmo parser.
export async function getMixItems(mixId) {
  if (!mixId) return [];
  try {
    const text = await fetchViaJina(`https://music.youtube.com/playlist?list=${encodeURIComponent(mixId)}`);
    return parseTracksFromMarkdown(text);
  } catch (err) {
    console.warn('[musicSearch] getMixItems (jina) falhou:', err?.message || err);
    return [];
  }
}

// Versão paginada do mix — via r.jina.ai (ZERO CREDITS). Paginação não suportada pelo jina.
export async function getMixItemsPaginated(mixId, continuation) {
  if (!mixId && !continuation) return { tracks: [], continuation: '', count: 0 };
  if (continuation) return { tracks: [], continuation: '', count: 0 }; // sem paginação em zero-credit
  const tracks = await getMixItems(mixId);
  return { tracks, continuation: '', count: tracks.length };
}

// Versão paginada — via r.jina.ai (ZERO CREDITS). Paginação não suportada pelo jina.
export async function getPlaylistItemsPaginated(playlistId, continuation) {
  if (!playlistId && !continuation) return { tracks: [], continuation: '', count: 0 };
  if (continuation) return { tracks: [], continuation: '', count: 0 }; // sem paginação em zero-credit
  const tracks = await getPlaylistItems(playlistId);
  return { tracks, continuation: '', count: tracks.length };
}

// Busca relacionados (recomendações por artista)
export async function getRelatedTracks(track, _apiKey, maxResults = 10) {
  if (!track?.artist) return [];
  const query = `${track.artist} topic`;
  const { items } = await searchMusic(query, null, { maxResults });
  return items;
}

// Obtém info de um vídeo via oEmbed.
export async function getVideoInfo(videoId) {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const data = await res.json();
      const { artist, song } = parseTitle(data.title, data.author_name);
      return {
        videoId,
        title: song,
        artist,
        album: '',
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        duration: 0,
        durationStr: '',
        type: 'song',
        source: 'YouTube Music',
        channelTitle: data.author_name || '',
      };
    }
  } catch { /* fallback abaixo */ }
  return {
    videoId,
    title: 'Música carregada',
    artist: 'YouTube Music',
    album: '',
    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    duration: 0,
    durationStr: '',
    type: 'song',
    source: 'YouTube Music',
    channelTitle: '',
  };
}

// --- Fallback r.jina.ai (mantido APENAS para getPlaylistItems — nao e o mecanismo principal de busca) ---

const JINA_BASE = 'https://r.jina.ai/';
const TIMEOUT_MS = 12000;

async function fetchViaJina(targetUrl) {
  const res = await fetch(`${JINA_BASE}${targetUrl}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'Accept': 'text/plain', 'X-Timeout': '10' },
  });
  if (!res.ok) throw new Error(`Serviço indisponível (HTTP ${res.status}).`);
  const text = await res.text();
  if (!text || text.length < 200) throw new Error('Resposta vazia do serviço.');
  return text;
}

// Parser de markdown (mantido para getPlaylistItems — playlist via r.jina.ai)
function parseTracksFromMarkdown(text) {
  const tracks = [];
  const lines = text.split('\n');
  const linkRe = /\[([^\]]+)\]\(https:\/\/music\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})(?:&[^)]*)?\)/;
  const seen = new Set();

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(linkRe);
    if (!m) continue;
    const title = m[1].trim();
    const videoId = m[2];
    if (seen.has(videoId)) continue;
    seen.add(videoId);

    const meta = [];
    for (let j = i + 1; j < Math.min(i + 8, lines.length) && meta.length < 4; j++) {
      const l = lines[j].trim();
      if (l) meta.push(l);
    }

    let artist = '';
    let album = '';
    let durationStr = '';
    let isSong = false;

    const songLine = meta.find((l) => l.startsWith('Song'));
    const videoLine = meta.find((l) => l.startsWith('Video'));
    if (songLine || videoLine) {
      isSong = !!songLine;
      const line = songLine || videoLine;
      const artistMatch = line.match(/\[([^\]]+)\]\(https:\/\/music\.youtube\.com\/channel\//);
      if (artistMatch) artist = artistMatch[1].trim();
      const albumMatch = line.match(/\[([^\]]+)\]\(https:\/\/music\.youtube\.com\/browse\//);
      if (albumMatch) album = albumMatch[1].trim();
      const durMatch = line.match(/(\d{1,2}:\d{2}(?::\d{2})?)\s*$/);
      if (durMatch) durationStr = durMatch[1];
    } else {
      const artistLine = meta.find((l) => /^\[[^\]]+\]\(https:\/\/music\.youtube\.com\/channel\//.test(l));
      if (artistLine) {
        artist = artistLine.match(/\[([^\]]+)\]/)?.[1]?.trim() || '';
        const durLine = meta.find((l) => /^\d{1,2}:\d{2}(?::\d{2})?$/.test(l));
        if (durLine) durationStr = durLine;
        isSong = !durationStr;
      }
    }

    if (!artist && !durationStr) continue;

    const duration = parseDurationStr(durationStr);
    const { artist: parsedArtist, song } = parseTitle(title, artist);
    tracks.push({
      videoId,
      title: song,
      artist: parsedArtist,
      album,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      duration,
      durationStr,
      type: 'song',
      source: 'YouTube Music',
      channelTitle: artist,
      _type: isSong ? 'song' : 'video',
    });
  }
  return tracks;
}

// --- Fallback de busca via r.jina.ai (página real de search do YouTube Music) ---
// Usado quando a backend function falha (402/credits, timeout, etc.). Dados reais do catálogo.
// Busca a página https://music.youtube.com/search?q=QUERY via r.jina.ai (proxy de leitura),
// que renderiza server-side e devolve markdown. Parseia todos os tipos de resultado.

async function fetchSearchJina(query, filter) {
  const text = await fetchViaJina(`https://music.youtube.com/search?q=${encodeURIComponent(query)}`);
  const all = parseSearchMarkdown(text);
  // Filtros dedicados: pré-filtra no jina (o backend faria isso server-side).
  // filter '' (misto) retorna tudo — o search* caller filtra client-side (videoId / type).
  let filtered = all;
  if (filter === 'artists') filtered = all.filter((t) => t.type === 'artist');
  else if (filter === 'albums') filtered = all.filter((t) => t.type === 'album');
  else if (filter === 'playlists') filtered = all.filter((t) => t.type === 'playlist' || t.type === 'mix');
  return { results: filtered, continuation: '' };
}

// Parser do markdown da página de search do YouTube Music (via r.jina.ai).
// Extrai: músicas (watch), artistas (channel UC), álbuns (browse MP), playlists/mixes (playlist).
function parseSearchMarkdown(text) {
  const results = [];
  const seen = new Set();

  // Músicas — reusa o parser de watch links (extrai videoId, title, artist, album, duration)
  const songs = parseTracksFromMarkdown(text);
  for (const s of songs) {
    if (seen.has(s.videoId)) continue;
    seen.add(s.videoId);
    results.push({ ...s, type: 'song' });
  }

  // Artistas — links de canal (UC...)
  const artistRe = /\[([^\]]+)\]\(https:\/\/music\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]+)/g;
  let m;
  while ((m = artistRe.exec(text)) !== null) {
    const title = m[1].trim();
    const browseId = m[2];
    if (seen.has(browseId) || seen.has(title)) continue;
    seen.add(browseId); seen.add(title);
    results.push({ title, artist: title, type: 'artist', browseId, music_url: `https://music.youtube.com/channel/${browseId}`, source: 'YouTube Music' });
  }

  // Álbuns — links de browse (MPRE/MPSP)
  const albumRe = /\[([^\]]+)\]\(https:\/\/music\.youtube\.com\/browse\/(MP[a-zA-Z0-9]+)/g;
  while ((m = albumRe.exec(text)) !== null) {
    const title = m[1].trim();
    const browseId = m[2];
    if (seen.has(browseId) || seen.has(title)) continue;
    seen.add(browseId); seen.add(title);
    results.push({ title, type: 'album', browseId, music_url: `https://music.youtube.com/browse/${browseId}`, source: 'YouTube Music' });
  }

  // Playlists & Mixes — links de playlist (PL/VL/FL/LL/OL/RD...)
  const plRe = /\[([^\]]+)\]\(https:\/\/music\.youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/g;
  while ((m = plRe.exec(text)) !== null) {
    const title = m[1].trim();
    const playlistId = m[2];
    if (seen.has(playlistId) || seen.has(title)) continue;
    seen.add(playlistId); seen.add(title);
    const isMix = playlistId.startsWith('RD');
    results.push({ title, type: isMix ? 'mix' : 'playlist', playlistId, music_url: `https://music.youtube.com/playlist?list=${playlistId}`, source: 'YouTube Music' });
  }

  return results;
}

// --- Helpers ---

function parseTitle(title, channelTitle) {
  if (!title) return { artist: channelTitle || 'Artista desconhecido', song: 'Título desconhecido' };
  const parts = title.split(' - ');
  if (parts.length >= 2) {
    return { artist: parts[0].trim(), song: parts.slice(1).join(' - ').trim() };
  }
  return { artist: channelTitle || 'Artista desconhecido', song: title };
}

function parseDurationStr(str) {
  if (!str) return 0;
  const parts = str.split(':').map((p) => parseInt(p, 10));
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}