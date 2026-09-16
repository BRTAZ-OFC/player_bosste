// Mixcloud — API pública, CORS, sem chave. Sets de DJ e programas de rádio com capa.
const TIMEOUT = 12000;

export async function searchMixcloud(query) {
  if (!query || !query.trim()) return [];
  try {
    const res = await fetch(`https://api.mixcloud.com/search/?q=${encodeURIComponent(query)}&type=cloudcast&limit=25`, {
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (!res.ok) throw new Error(`Mixcloud HTTP ${res.status}`);
    const j = await res.json();
    return (j.data || []).map((c) => ({
      title: c.name || '',
      artist: c.user?.username || '',
      type: 'mixcloud_mix',
      thumbnail: c.pictures?.medium || c.pictures?.large || '',
      source: 'Mixcloud',
      music_url: c.url || '',
    }));
  } catch (err) {
    console.warn('[mixcloud] falhou:', err?.message || err);
    return [];
  }
}