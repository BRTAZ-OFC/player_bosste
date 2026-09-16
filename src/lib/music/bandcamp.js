// Bandcamp — descoberta via r.jina.ai (sem chave). Raspa a busca e extrai
// álbuns e faixas com capa e artista. O título vem do slug do link.
const JINA = 'https://r.jina.ai/';
const TIMEOUT = 15000;

function titleCase(s) {
  return (s || '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

export async function searchBandcamp(query) {
  if (!query || !query.trim()) return { tracks: [], albums: [] };
  try {
    const res = await fetch(`${JINA}https://bandcamp.com/search?q=${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(TIMEOUT),
      headers: { Accept: 'text/plain', 'X-Timeout': '10' },
    });
    if (!res.ok) throw new Error(`Bandcamp HTTP ${res.status}`);
    const text = await res.text();
    const tracks = [];
    const albums = [];
    const seen = new Set();
    const lines = text.split('\n');
    const re = /\[!\[Image \d+\]\((https:\/\/f4\.bcbits\.com\/img\/[^)]+)\)\]\((https:\/\/[^)]+\.bandcamp\.com\/(album|track)\/[^)]+)\)(ALBUM|TRACK|ARTIST)/;
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(re);
      if (!m) continue;
      const img = m[1];
      const rawLink = m[2];
      const link = rawLink.split('?')[0];
      const kind = m[3];
      const typeTag = m[4];
      const slugPart = rawLink.split(`/${kind}/`)[1] || '';
      const slug = decodeURIComponent(slugPart.split('?')[0]);
      const title = titleCase(slug);
      let artist = '';
      let sourceTags = [];
      for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
        if (!artist) {
          const byM = lines[j].match(/^by\s+(.+)$/i) || lines[j].match(/from\s+.+\s+by\s+(.+)$/i);
          if (byM) artist = byM[1].trim();
        }
        const tagM = lines[j].match(/^tags:\s*(.+)$/i);
        if (tagM) sourceTags = tagM[1].split(',').map((s) => s.trim()).filter(Boolean);
        if (artist && sourceTags.length) break;
      }
      if (seen.has(link)) continue;
      seen.add(link);
      const base = { title, artist, thumbnail: img, source: 'Bandcamp', music_url: link, sourceTags };
      if (typeTag === 'ALBUM' || kind === 'album') albums.push({ ...base, type: 'bandcamp_album' });
      else tracks.push({ ...base, type: 'bandcamp_track' });
    }
    return { tracks, albums };
  } catch (err) {
    console.warn('[bandcamp] falhou:', err?.message || err);
    return { tracks: [], albums: [] };
  }
}