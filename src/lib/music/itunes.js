// iTunes / Apple Music — API pública, CORS, sem chave.
// Retorna músicas e álbuns comerciais com capa (300px) e link.
const TIMEOUT = 12000;

export async function searchItunes(query) {
  if (!query || !query.trim()) return { tracks: [], albums: [] };
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=30`,
      { signal: AbortSignal.timeout(TIMEOUT) }
    );
    if (!res.ok) throw new Error(`iTunes HTTP ${res.status}`);
    const j = await res.json();
    const tracks = [];
    const albums = [];
    const seenT = new Set();
    const seenA = new Set();
    for (const r of (j.results || [])) {
      const art = r.artworkUrl100 ? r.artworkUrl100.replace('100x100', '300x300') : '';
      if (r.trackName && r.trackViewUrl) {
        if (seenT.has(r.trackId)) continue;
        seenT.add(r.trackId);
        const genres = r.primaryGenreName ? [r.primaryGenreName] : [];
        tracks.push({ title: r.trackName, artist: r.artistName || '', type: 'itunes_track', thumbnail: art, source: 'iTunes', music_url: r.trackViewUrl, genres });
      } else if (r.collectionName && r.collectionViewUrl) {
        if (seenA.has(r.collectionId)) continue;
        seenA.add(r.collectionId);
        const genres = r.primaryGenreName ? [r.primaryGenreName] : [];
        albums.push({ title: r.collectionName, artist: r.artistName || '', type: 'itunes_album', thumbnail: art, source: 'iTunes', music_url: r.collectionViewUrl, genres });
      }
    }
    return { tracks, albums };
  } catch (err) {
    console.warn('[itunes] falhou:', err?.message || err);
    return { tracks: [], albums: [] };
  }
}