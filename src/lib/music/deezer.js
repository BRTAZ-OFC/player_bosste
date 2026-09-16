// Deezer — descoberta via r.jina.ai (sem chave). Raspa a página de busca e
// extrai faixas (seção Tracks) com capa. A página não traz artista, só título+capa.
const JINA = 'https://r.jina.ai/';
const TIMEOUT = 15000;

export async function searchDeezer(query) {
  if (!query || !query.trim()) return [];
  try {
    const res = await fetch(`${JINA}https://www.deezer.com/search/${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(TIMEOUT),
      headers: { Accept: 'text/plain', 'X-Timeout': '10' },
    });
    if (!res.ok) throw new Error(`Deezer HTTP ${res.status}`);
    const text = await res.text();
    const tracks = [];
    const seen = new Set();
    const section = text.split('### Tracks')[1] || '';
    const lines = section.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/!\[Image \d+\]\((https:\/\/cdn-images\.dzcdn\.net\/[^)]+)\)/);
      if (!m) continue;
      const thumb = m[1];
      let title = '';
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const t = lines[j].trim();
        if (t && !/^\d{1,2}:\d{2}$/.test(t) && !t.startsWith('![') && !t.startsWith('###')) { title = t; break; }
      }
      if (title && !seen.has(title)) {
        seen.add(title);
        tracks.push({ title, artist: '', type: 'deezer_track', thumbnail: thumb, source: 'Deezer' });
      }
    }
    return tracks;
  } catch (err) {
    console.warn('[deezer] falhou:', err?.message || err);
    return [];
  }
}