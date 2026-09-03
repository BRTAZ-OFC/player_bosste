// MusicUrlManager — criação e validação exclusiva de URLs do YouTube Music.
// NUNCA converte para youtube.com. Preserva o domínio music.youtube.com sempre.
// Valida IDs antes de montar URLs. Codifica termos de busca. Trata URLs inválidas sem travar.

const MUSIC_BASE = 'https://music.youtube.com';

// === Regra global do projeto ===
// MUSIC_PROVIDER = "youtube_music"
// ALLOWED_DOMAINS: music.youtube.com
// BLOCKED_AS_PRIMARY_DESTINATION: youtube.com, www.youtube.com, m.youtube.com, youtu.be

// Domínios bloqueados como destino principal (nunca abrir diretamente)
const BLOCKED_DOMAINS = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'];

// Único domínio permitido como destino principal
const ALLOWED_DOMAIN = 'music.youtube.com';

// normalizeMusicUrl(url) — função central de normalização.
// Regras:
// 1. Se já for music.youtube.com → permite
// 2. Se for youtube.com/www/m/youtu.be → nunca abre como destino principal
// 3. Extrai videoId e playlistId disponíveis
// 4. Gera URL equivalente em music.youtube.com
// 5. Nunca faz fallback para youtube.com
// 6. Valida e bloqueia domínios não permitidos
// Retorna { ok, type, videoId, playlistId, url, blocked } ou { ok: false } se inválida.
export function normalizeMusicUrl(url) {
  if (!url || typeof url !== 'string') return { ok: false, reason: 'empty' };
  const trimmed = url.trim();
  if (!trimmed) return { ok: false, reason: 'empty' };

  // Tenta extrair playlistId (qualquer domínio youtube)
  const playlistMatch = trimmed.match(/list=([a-zA-Z0-9_-]+)/);
  // Tenta extrair videoId (qualquer domínio youtube + youtu.be + ID cru)
  const videoMatch = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|music\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/);
  const rawId = videoMatch?.[1] || (isValidVideoId(trimmed) ? trimmed : null);

  // Verifica se a URL usa um domínio bloqueado
  const isBlocked = BLOCKED_DOMAINS.some((d) => trimmed.includes(d));
  const isAllowed = trimmed.includes(ALLOWED_DOMAIN);

  // Se tem playlistId → normaliza para music.youtube.com/playlist
  if (playlistMatch && isValidPlaylistId(playlistMatch[1])) {
    return {
      ok: true,
      type: 'playlist',
      playlistId: playlistMatch[1],
      url: buildPlaylistUrl(playlistMatch[1]),
      blocked: isBlocked && !isAllowed, // veio de domínio bloqueado mas foi normalizado
    };
  }

  // Se tem videoId → normaliza para music.youtube.com/watch
  if (rawId && isValidVideoId(rawId)) {
    return {
      ok: true,
      type: 'video',
      videoId: rawId,
      url: buildWatchUrl(rawId),
      blocked: isBlocked && !isAllowed,
    };
  }

  // URL de busca do YT Music
  if (trimmed.includes('music.youtube.com/search')) {
    const qMatch = trimmed.match(/[?&]q=([^&]+)/);
    const query = qMatch ? decodeURIComponent(qMatch[1]) : '';
    return { ok: true, type: 'search', query, url: trimmed };
  }

  return { ok: false, reason: 'no_valid_id' };
}

// Valida se uma URL é permitida como destino principal (apenas music.youtube.com)
export function isAllowedMusicUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return url.includes(ALLOWED_DOMAIN);
}

// Valida se uma URL está bloqueada como destino principal
export function isBlockedUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return BLOCKED_DOMAINS.some((d) => url.includes(d)) && !url.includes(ALLOWED_DOMAIN);
}

// Valida um videoId do YouTube (exatamente 11 caracteres: A-Z a-z 0-9 - _)
export function isValidVideoId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(id);
}

// Valida um playlistId do YouTube (prefixos comuns: PL, FL, RD, LL, OL, etc.)
export function isValidPlaylistId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{10,}$/.test(id);
}

// Cria URL de música no YouTube Music: https://music.youtube.com/watch?v=VIDEO_ID
export function buildWatchUrl(videoId) {
  if (!isValidVideoId(videoId)) return null;
  return `${MUSIC_BASE}/watch?v=${videoId}`;
}

// Cria URL de playlist no YouTube Music: https://music.youtube.com/playlist?list=PLAYLIST_ID
export function buildPlaylistUrl(playlistId) {
  if (!isValidPlaylistId(playlistId)) return null;
  return `${MUSIC_BASE}/playlist?list=${playlistId}`;
}

// Cria URL de busca no YouTube Music: https://music.youtube.com/search?q=TERMO
export function buildSearchUrl(query) {
  if (!query || !query.trim()) return null;
  return `${MUSIC_BASE}/search?q=${encodeURIComponent(query.trim())}`;
}

// Parseia uma URL colada pelo usuário.
// Aceita youtube.com, youtu.be, music.youtube.com — mas SEMPRE retorna URL do music.youtube.com.
// Nunca normaliza para youtube.com. Trata URLs inválidas retornando null (sem travar).
export function parseMusicUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Playlist (qualquer domínio youtube)
  const playlistMatch = trimmed.match(/list=([a-zA-Z0-9_-]+)/);
  if (playlistMatch && isValidPlaylistId(playlistMatch[1])) {
    return { type: 'playlist', playlistId: playlistMatch[1], url: buildPlaylistUrl(playlistMatch[1]) };
  }

  // Vídeo: aceita youtube.com/watch?v=, youtu.be/, music.youtube.com/watch?v=
  const videoMatch = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|music\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/);
  if (videoMatch && isValidVideoId(videoMatch[1])) {
    return { type: 'video', videoId: videoMatch[1], url: buildWatchUrl(videoMatch[1]) };
  }

  // Video ID cru (11 chars)
  if (isValidVideoId(trimmed)) {
    return { type: 'video', videoId: trimmed, url: buildWatchUrl(trimmed) };
  }

  return null; // URL inválida — não trava, retorna null
}