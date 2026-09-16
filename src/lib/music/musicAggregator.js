// Camada de agregação da busca — consulta fontes independentes em paralelo,
// normaliza título/artista e deduplica antes de exibir. Se uma fonte falha ou
// limita, as outras continuam. Não toca no player/engine de reprodução.
//
// Fontes: YouTube Music, YouTube, MusicBrainz, Last.fm, Jamendo (descoberta).
// Saída: grupos no mesmo formato que a galeria já consome (song, youtube, artist,
// album, playlist, mix, mb_*, lastfm_track, jamendo_track).

import { searchAll, searchYouTube } from './musicSearch';
import { searchMusicBrainz } from './musicBrainz';
import { searchLastfm } from './lastfm';
import { searchJamendo } from './jamendo';
import { searchItunes } from './itunes';
import { searchDeezer } from './deezer';
import { searchBandcamp } from './bandcamp';
import { searchAudius } from './audius';
import { searchMixcloud } from './mixcloud';

// Normaliza título+artista para chave de dedup: lowercase, sem acentos/pontuação,
// sem sufixos "feat./ft.".
export function normalizeKey(title, artist = '') {
  const norm = (s) =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+(feat|ft)\s.*$/i, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  return `${norm(title)}|${norm(artist)}`;
}

function dedupeList(list) {
  const seen = new Set();
  const out = [];
  for (const it of list) {
    const key = it.videoId ? `v:${it.videoId}` : normalizeKey(it.title, it.artist);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

// Agrega todas as fontes e devolve grupos prontos para a galeria.
export async function aggregateSearch(term) {
  const [ytMusic, yt, mb, lastfm, jamendo, itunes, deezer, bandcamp, audius, mixcloud] = await Promise.all([
    searchAll(term).catch(() => ({ items: [] })),
    searchYouTube(term).catch(() => ({ items: [] })),
    searchMusicBrainz(term).catch(() => ({ artists: [], recordings: [], releases: [] })),
    searchLastfm(term).catch(() => ({ artists: [], albums: [] })),
    searchJamendo(term).catch(() => []),
    searchItunes(term).catch(() => ({ tracks: [], albums: [] })),
    searchDeezer(term).catch(() => []),
    searchBandcamp(term).catch(() => ({ tracks: [], albums: [] })),
    searchAudius(term).catch(() => []),
    searchMixcloud(term).catch(() => []),
  ]);

  const groups = {};
  for (const it of (ytMusic.items || [])) { const t = it.type || 'song'; (groups[t] = groups[t] || []).push(it); }
  for (const it of (yt.items || [])) (groups.youtube = groups.youtube || []).push(it);
  if (mb) {
    (groups.mb_artist = groups.mb_artist || []).push(...mb.artists);
    (groups.mb_recording = groups.mb_recording || []).push(...mb.recordings);
    (groups.mb_release = groups.mb_release || []).push(...mb.releases);
  }

  // Dedup intra-grupo
  for (const k of Object.keys(groups)) groups[k] = dedupeList(groups[k]);

  // Itens já tocáveis (YT Music + YouTube) — descartam descobertas duplicadas
  const playables = new Set();
  for (const it of (groups.song || [])) playables.add(normalizeKey(it.title, it.artist));
  for (const it of (groups.youtube || [])) playables.add(normalizeKey(it.title, it.artist));

  const lastfmArtists = dedupeList(lastfm.artists || []);
  const lastfmAlbums = dedupeList(lastfm.albums || []);
  const jamendoTracks = dedupeList(jamendo).filter((it) => !playables.has(normalizeKey(it.title, it.artist)));
  if (lastfmArtists.length) groups.lastfm_artist = lastfmArtists;
  if (lastfmAlbums.length) groups.lastfm_album = lastfmAlbums;
  if (jamendoTracks.length) groups.jamendo_track = jamendoTracks;

  const itunesTracks = dedupeList(itunes.tracks || []).filter((it) => !playables.has(normalizeKey(it.title, it.artist)));
  const itunesAlbums = dedupeList(itunes.albums || []);
  const deezerTracks = dedupeList(deezer).filter((it) => !playables.has(normalizeKey(it.title, it.artist)));
  const bandcampTracks = dedupeList(bandcamp.tracks || []).filter((it) => !playables.has(normalizeKey(it.title, it.artist)));
  const bandcampAlbums = dedupeList(bandcamp.albums || []);
  const audiusTracks = dedupeList(audius).filter((it) => !playables.has(normalizeKey(it.title, it.artist)));
  const mixcloudMixes = dedupeList(mixcloud);
  if (itunesTracks.length) groups.itunes_track = itunesTracks;
  if (itunesAlbums.length) groups.itunes_album = itunesAlbums;
  if (deezerTracks.length) groups.deezer_track = deezerTracks;
  if (bandcampTracks.length) groups.bandcamp_track = bandcampTracks;
  if (bandcampAlbums.length) groups.bandcamp_album = bandcampAlbums;
  if (audiusTracks.length) groups.audius_track = audiusTracks;
  if (mixcloudMixes.length) groups.mixcloud_mix = mixcloudMixes;

  return groups;
}