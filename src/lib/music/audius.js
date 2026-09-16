// Audius — API pública, CORS, sem chave. Música independente com capa e player próprio.
const HOST = 'https://discoveryprovider.audius.co';
const TIMEOUT = 12000;

export async function searchAudius(query) {
  if (!query || !query.trim()) return [];
  try {
    const res = await fetch(`${HOST}/v1/tracks/search?query=${encodeURIComponent(query)}&limit=25`, {
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (!res.ok) throw new Error(`Audius HTTP ${res.status}`);
    const j = await res.json();
    return (j.data || []).map((t) => ({
      title: t.title || '',
      artist: t.user?.name || '',
      type: 'audius_track',
      thumbnail: t.artwork?.['480x480'] || t.artwork?.['150x150'] || '',
      source: 'Audius',
      music_url: t.permalink ? `https://audius.co/${t.permalink}` : '',
      genres: t.genre ? [t.genre] : [],
    }));
  } catch (err) {
    console.warn('[audius] falhou:', err?.message || err);
    return [];
  }
}