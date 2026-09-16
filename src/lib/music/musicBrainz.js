// MusicBrainz + Cover Art Archive — descoberta/metadados, 100% frontend.
// NÃO é engine de reprodução: apenas amplia a busca com artistas, gravações e
// lançamentos do MusicBrainz, e usa capas do Cover Art Archive como miniatura
// (via <img> — o CAA redireciona para archive.org, sem necessidade de fetch/CORS).
//
// Rate limit do MusicBrainz: ~1 req/s — por isso as 3 buscas são sequenciais
// com um pequeno intervalo. Falhas (503/timeout) são silenciosas: retornam vazio.

const MB_BASE = 'https://musicbrainz.org/ws/2';
const CAA_BASE = 'https://coverartarchive.org';
const TIMEOUT = 10000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function mbFetch(entity, query, limit) {
  const url = `${MB_BASE}/${entity}?query=${encodeURIComponent(query)}&fmt=json&limit=${limit}`;
  const attempt = async () => {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT),
      headers: { Accept: 'application/json' },
    });
    if (res.status === 503) return null; // rate limit — tenta novamente abaixo
    if (!res.ok) throw new Error(`MusicBrainz ${entity} HTTP ${res.status}`);
    return res.json();
  };
  let data = await attempt();
  for (let i = 0; data === null && i < 2; i++) { await sleep(1300); data = await attempt(); } // até 2 retries no 503
  if (data === null) throw new Error('MusicBrainz rate limited');
  return data;
}

function creditNames(credit) {
  if (!Array.isArray(credit)) return '';
  return credit
    .map((c) => c.name || (c.artist && c.artist.name))
    .filter(Boolean)
    .join(', ');
}

// Capa do Cover Art Archive para um lançamento — prefere o release-group (mais
// comum ter capa) e cai para o release. A URL é usada diretamente em <img>.
function coverUrl(release) {
  const rgid = release['release-group'] && release['release-group'].id;
  if (rgid) return `${CAA_BASE}/release-group/${rgid}/front-250`;
  if (release.id) return `${CAA_BASE}/release/${release.id}/front-250`;
  return '';
}

export async function searchMusicBrainz(query) {
  if (!query || !query.trim()) return { artists: [], recordings: [], releases: [] };

  const a = await mbFetch('artist', query, 12).catch(() => ({ artists: [] }));
  await sleep(1300);
  const r = await mbFetch('recording', query, 20).catch(() => ({ recordings: [] }));
  await sleep(1300);
  const rel = await mbFetch('release', query, 12).catch(() => ({ releases: [] }));

  const artists = (a.artists || []).map((x) => ({
    title: x.name + (x.disambiguation ? ` (${x.disambiguation})` : ''),
    artist: '',
    type: 'mb_artist',
    mbid: x.id,
    source: 'MusicBrainz',
    music_url: `https://musicbrainz.org/artist/${x.id}`,
  }));

  const recordings = (r.recordings || []).map((x) => ({
    title: x.title,
    artist: creditNames(x['artist-credit']),
    type: 'mb_recording',
    mbid: x.id,
    source: 'MusicBrainz',
    music_url: `https://musicbrainz.org/recording/${x.id}`,
  }));

  const releases = (rel.releases || []).map((x) => ({
    title: x.title,
    artist: creditNames(x['artist-credit']),
    type: 'mb_release',
    mbid: x.id,
    thumbnail: coverUrl(x),
    source: 'MusicBrainz',
    music_url: `https://musicbrainz.org/release/${x.id}`,
  }));

  return { artists, recordings, releases };
}