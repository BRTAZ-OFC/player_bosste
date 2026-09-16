// Constrói as tags de uma faixa/cabeçalho: [Música/Playlist/Galeria/Mix/Artista]
// + [artista] + [gêneros...]. Cada gênero vira uma tag separada (nunca combinada).
// Usa os metadados do próprio item (genres/sourceTags das fontes) + tags do artista
// (Last.fm) passadas como evidência. Reutilizado pelo cabeçalho e por cada faixa.
import { classifyGenres } from './genreDetect';

const SONG_TYPES = ['song', 'youtube', 'mb_recording', 'jamendo_track', 'itunes_track', 'deezer_track', 'bandcamp_track', 'audius_track'];
const ALBUM_TYPES = ['album', 'mb_release', 'lastfm_album', 'itunes_album', 'bandcamp_album'];
const ARTIST_TYPES = ['artist', 'mb_artist', 'lastfm_artist'];

export function buildItemTags(item, artistTags = []) {
  const tags = [];
  const title = item.title || '';
  const artist = item.artist || item.channelTitle || '';

  if (title && (item.videoId || SONG_TYPES.includes(item.type))) tags.push({ label: 'Música', kind: 'category', query: title });
  if (item.type === 'playlist' && title) tags.push({ label: 'Playlist', kind: 'category', query: title });
  if (ALBUM_TYPES.includes(item.type) && title) tags.push({ label: 'Galeria', kind: 'category', query: title });
  if (['mix', 'mixcloud_mix'].includes(item.type) && title) tags.push({ label: 'Mix', kind: 'category', query: title });
  if (ARTIST_TYPES.includes(item.type) && title) tags.push({ label: 'Artista', kind: 'artist', query: title });
  if (artist && !ARTIST_TYPES.includes(item.type)) tags.push({ label: artist, kind: 'artist', query: artist });

  for (const g of classifyGenres(item, artistTags)) tags.push({ label: g, kind: 'genre', query: g });
  return tags;
}