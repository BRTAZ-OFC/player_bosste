// Last.fm — fonte de descoberta, 100% frontend, via r.jina.ai (mesmo mecanismo
// do YouTube/YouTube Music). Sem API key: raspa a página de busca do last.fm e
// extrai artistas + álbuns (com capa). Se falhar, retorna vazio (as outras fontes continuam).

const JINA = 'https://r.jina.ai/';
const TIMEOUT = 12000;

async function fetchViaJina(targetUrl) {
  const res = await fetch(`${JINA}${targetUrl}`, {
    signal: AbortSignal.timeout(TIMEOUT),
    headers: { Accept: 'text/plain', 'X-Timeout': '10' },
  });
  if (!res.ok) throw new Error(`Last.fm (jina) HTTP ${res.status}`);
  return res.text();
}

function parseSections(text) {
  const artists = [];
  const albums = [];
  const artistText = (text.split(/##\s*\[Artists\]/)[1] || '').split(/##\s*\[Albums\]/)[0];
  const albumText = (text.split(/##\s*\[Albums\]/)[1] || '').split(/##\s*\[Tracks\]/)[0];
  const artistRe = /!\[Image \d+: Image for '([^']+)'\]\((https:\/\/lastfm-img[^)]+)\)/g;
  const albumRe = /!\[Image \d+: Image for '([^']+)'\]\((https:\/\/lastfm-img[^)]+)\)/g;
  let m;
  while ((m = artistRe.exec(artistText)) !== null) {
    artists.push({ title: m[1], artist: '', type: 'lastfm_artist', thumbnail: m[2], source: 'Last.fm' });
  }
  while ((m = albumRe.exec(albumText)) !== null) {
    albums.push({ title: m[1], artist: '', type: 'lastfm_album', thumbnail: m[2], source: 'Last.fm' });
  }
  return { artists, albums };
}

export async function searchLastfm(query) {
  if (!query || !query.trim()) return { artists: [], albums: [] };
  try {
    const text = await fetchViaJina(`https://www.last.fm/search?q=${encodeURIComponent(query)}`);
    return parseSections(text);
  } catch (err) {
    console.warn('[lastfm] falhou:', err?.message || err);
    return { artists: [], albums: [] };
  }
}