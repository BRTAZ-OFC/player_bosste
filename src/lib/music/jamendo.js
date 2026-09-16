// Jamendo — fonte de descoberta, 100% frontend, via r.jina.ai (sem client_id).
// Raspa a página de busca do jamendo.com e extrai faixas (seção "songs") com capa.
// Se falhar, retorna vazio (as outras fontes continuam).

const JINA = 'https://r.jina.ai/';
const TIMEOUT = 12000;

async function fetchViaJina(targetUrl) {
  const res = await fetch(`${JINA}${targetUrl}`, {
    signal: AbortSignal.timeout(TIMEOUT),
    headers: { Accept: 'text/plain', 'X-Timeout': '10' },
  });
  if (!res.ok) throw new Error(`Jamendo (jina) HTTP ${res.status}`);
  return res.text();
}

function parseTracks(text) {
  const tracks = [];
  const seen = new Set();
  const lines = text.split('\n');
  const re = /\[([^\]]+?)\s+by\s+([^\]]+)\]\(https:\/\/www\.jamendo\.com\/track\/(\d+)\/[^)]*\)/;
  const coverRe = /!\[Image \d+: cover [^\]]*\]\((https:\/\/usercontent\.jamendo\.com\/\?[^)]+)\)/;
  for (const line of lines) {
    const m = line.match(re);
    if (!m) continue;
    const title = m[1].trim();
    const artist = m[2].trim();
    const trackId = m[3];
    if (seen.has(trackId)) continue;
    seen.add(trackId);
    const cm = line.match(coverRe);
    tracks.push({
      title,
      artist,
      type: 'jamendo_track',
      thumbnail: cm ? cm[1] : '',
      source: 'Jamendo',
      music_url: `https://www.jamendo.com/track/${trackId}`,
    });
  }
  return tracks;
}

export async function searchJamendo(query) {
  if (!query || !query.trim()) return [];
  try {
    const text = await fetchViaJina(`https://www.jamendo.com/search?q=${encodeURIComponent(query)}`);
    return parseTracks(text);
  } catch (err) {
    console.warn('[jamendo] falhou:', err?.message || err);
    return [];
  }
}