import React, { useState } from 'react';
import { Search, Play, Plus, Loader2, AlertCircle, ListMusic, Link2, Disc3, Clock, History, X, Trash2, ExternalLink, ChevronDown, User, Disc } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { searchMusic, searchArtists, searchAlbums, searchPlaylists, searchMixes, searchMore, getPlaylistItems, getMixItems, getAlbumItems, getVideoInfo } from '@/lib/music/musicSearch';
import { parseMusicUrl, normalizeMusicUrl, isBlockedUrl } from '@/lib/music/musicUrlManager';
import { queueManager } from '@/lib/music/queueManager';
import { playTrack } from '@/lib/music/youtubePlayer';
import { searchHistoryManager } from '@/lib/music/searchHistoryManager';

// Abas do catálogo do YouTube Music — cada uma mapeia para uma função de busca e um filtro.
// Músicas e Mixes derivam da busca mista (filter ''); Artistas/Álbuns/Playlists usam filter dedicado.
const TABS = [
  { key: 'songs', label: 'Músicas', filter: '' },
  { key: 'artists', label: 'Artistas', filter: 'artists' },
  { key: 'albums', label: 'Álbuns', filter: 'albums' },
  { key: 'playlists', label: 'Playlists', filter: 'playlists' },
  { key: 'mixes', label: 'Mixes', filter: '' },
];

export default function MusicSearch() {
  const [query, setQuery] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('songs');
  const [continuation, setContinuation] = useState('');
  const [searchHistory, setSearchHistory] = useState(() => searchHistoryManager.list());

  // Executa a busca conforme a aba ativa. Cada função retorna { items, continuation }.
  async function handleSearch(e) {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);
    setContinuation('');
    searchHistoryManager.add(query);
    setSearchHistory(searchHistoryManager.list());
    try {
      let res;
      if (tab === 'songs') res = await searchMusic(query);
      else if (tab === 'artists') res = await searchArtists(query);
      else if (tab === 'albums') res = await searchAlbums(query);
      else if (tab === 'playlists') res = await searchPlaylists(query);
      else if (tab === 'mixes') res = await searchMixes(query);
      setResults(res?.items || []);
      setContinuation(res?.continuation || '');
    } catch (err) {
      setError(err.message || 'Erro na busca');
    } finally {
      setLoading(false);
    }
  }

  // Carrega mais resultados via continuation (paginação real do catálogo).
  // Para Músicas/Mixes (busca mista), filtra client-side os novos itens.
  async function handleLoadMore() {
    if (!continuation || loadingMore) return;
    setLoadingMore(true);
    try {
      const tabCfg = TABS.find((t) => t.key === tab);
      const res = await searchMore(query, tabCfg?.filter, continuation);
      let more = res?.items || [];
      if (tab === 'songs') more = more.filter((t) => t && t.videoId);
      else if (tab === 'mixes') more = more.filter((t) => t && t.type === 'mix');
      setResults((prev) => [...prev, ...more]);
      setContinuation(res?.continuation || '');
    } catch (err) {
      setError(err.message || 'Erro ao carregar mais');
    } finally {
      setLoadingMore(false);
    }
  }

  function handleHistoryClick(h) {
    setQuery(h);
    setTimeout(() => {
      const evt = new Event('submit', { bubbles: true, cancelable: true });
      document.querySelector('form')?.dispatchEvent(evt);
    }, 0);
  }

  // Toca um álbum: carrega as faixas via YoutubeMusicAlbum e envia ao player oficial.
  // Fluxo ISOLADO — não reutiliza getPlaylistItems (separação semântica: álbum ≠ playlist).
  async function handlePlayAlbum(album) {
    setLoading(true);
    setError(null);
    try {
      const tracks = await getAlbumItems(album.browseId);
      if (tracks.length === 0) {
        setError('Álbum vazio ou indisponível.');
        return;
      }
      queueManager.setQueue(tracks, 0);
      playTrack(tracks[0]);
    } catch (err) {
      setError(err.message || 'Erro ao carregar álbum');
    } finally {
      setLoading(false);
    }
  }

  // Toca uma playlist/mix: carrega as faixas e envia ao player oficial.
  // Roteamento por type: mix (RD) → getMixItems (YoutubeMusicMix); playlist → getPlaylistItems.
  async function handlePlayPlaylist(playlist) {
    setLoading(true);
    setError(null);
    try {
      const tracks = playlist.type === 'mix'
        ? await getMixItems(playlist.playlistId)
        : await getPlaylistItems(playlist.playlistId);
      if (tracks.length === 0) {
        setError(playlist.type === 'mix' ? 'Mix vazio ou indisponível.' : 'Playlist vazia ou indisponível.');
        return;
      }
      queueManager.setQueue(tracks, 0);
      playTrack(tracks[0]);
    } catch (err) {
      setError(err.message || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }

  // Toca uma música: envia ao PLAYER OFICIAL.
  // ZERO CREDITS: getRelatedTracks removido — era uma segunda busca (base44.functions.invoke)
  // disparada automaticamente a cada track play, consumindo 0.1-0.2 Integration Credits.
  async function handlePlayTrack(track) {
    queueManager.setQueue([track], 0);
    await playTrack(track);
  }

  function handleAddToQueue(track) {
    if (queueManager.length === 0) {
      queueManager.setQueue([track], 0);
      playTrack(track);
    } else {
      queueManager.add(track);
    }
  }

  async function handleLoadUrl(e) {
    e?.preventDefault();
    if (!urlInput.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const normalized = normalizeMusicUrl(urlInput);
      if (!normalized.ok) {
        setError('URL inválida. Cole um link do YouTube Music (music.youtube.com/watch?v=... ou playlist?list=...).');
        return;
      }
      if (isBlockedUrl(urlInput)) {
        // URL veio de domínio bloqueado mas foi normalizada para music.youtube.com — permite
      }
      const parsed = parseMusicUrl(urlInput);
      if (!parsed) {
        setError('URL inválida. Cole um link do YouTube Music (music.youtube.com/watch?v=... ou playlist?list=...).');
        return;
      }
      if (parsed.type === 'video') {
        const track = await getVideoInfo(parsed.videoId);
        queueManager.setQueue([track], 0);
        playTrack(track);
        setUrlInput('');
      } else if (parsed.type === 'playlist') {
        const tracks = await getPlaylistItems(parsed.playlistId);
        if (tracks.length === 0) {
          setError('Playlist vazia ou indisponível.');
          return;
        }
        queueManager.setQueue(tracks, 0);
        playTrack(tracks[0]);
        setUrlInput('');
      }
    } catch (err) {
      setError(err.message || 'Erro ao carregar URL');
    } finally {
      setLoading(false);
    }
  }

  // Ícone por tipo de resultado
  function typeIcon(item) {
    if (item.type === 'artist') return <User className="w-4 h-4 text-slate-500" />;
    if (item.type === 'album') return <Disc className="w-4 h-4 text-slate-500" />;
    if (item.type === 'mix') return <Disc3 className="w-4 h-4 text-slate-500" />;
    return <ListMusic className="w-4 h-4 text-slate-500" />;
  }

  // Renderiza os botões de ação conforme o tipo de resultado.
  // Músicas (videoId): Tocar + Adicionar à fila → PLAYER OFICIAL.
  // Playlists/Mixes (playlistId): Tocar playlist → carrega faixas → PLAYER OFICIAL.
  // Artistas/Álbuns (sem videoId/playlistId): Abrir no YouTube Music (music.youtube.com).
  function renderActions(item) {
    if (item.videoId) {
      return (
        <>
          <button onClick={() => handlePlayTrack(item)} className="p-1.5 rounded-md text-cyan-300 hover:bg-cyan-500/10 transition-colors shrink-0" title="Tocar agora">
            <Play className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => handleAddToQueue(item)} className="p-1.5 rounded-md text-slate-300 hover:bg-white/10 transition-colors shrink-0" title="Adicionar à fila">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </>
      );
    }
    if (item.playlistId) {
      return (
        <button onClick={() => handlePlayPlaylist(item)} className="p-1.5 rounded-md text-cyan-300 hover:bg-cyan-500/10 transition-colors shrink-0" title="Tocar playlist">
          <Play className="w-3.5 h-3.5" />
        </button>
      );
    }
    // Álbum (type=album, tem browseId MPRE/MPSP) → carrega faixas via YoutubeMusicAlbum → player oficial
    if (item.type === 'album' && item.browseId) {
      return (
        <button onClick={() => handlePlayAlbum(item)} className="p-1.5 rounded-md text-cyan-300 hover:bg-cyan-500/10 transition-colors shrink-0" title="Tocar álbum">
          <Play className="w-3.5 h-3.5" />
        </button>
      );
    }
    // Artistas (sem videoId/playlistId/browseId de álbum) — link honesto para o YouTube Music
    if (item.music_url) {
      return (
        <a
          href={item.music_url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-md text-fuchsia-300 hover:bg-fuchsia-500/10 transition-colors shrink-0"
          title="Abrir no YouTube Music"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      );
    }
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Busca por termo */}
      <form onSubmit={handleSearch} className="flex gap-1.5">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar no YouTube Music..."
          className="bg-white/5 border-white/10 text-slate-200 text-xs h-8"
        />
        <Button type="submit" size="sm" disabled={loading || !query.trim()} className="h-8 px-3 bg-cyan-500/80 hover:bg-cyan-500 border-0">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
        </Button>
      </form>

      {/* Tabs: Músicas / Artistas / Álbuns / Playlists / Mixes */}
      <div className="flex gap-1 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setResults([]); setContinuation(''); }}
            className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${tab === t.key ? 'bg-cyan-500/15 text-cyan-300' : 'text-slate-400 hover:text-slate-200'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Histórico de buscas */}
      {searchHistory.length > 0 && !query && results.length === 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-[10px] text-slate-500">
              <History className="w-3 h-3" /> Buscas recentes
            </div>
            <button
              onClick={() => { searchHistoryManager.clear(); setSearchHistory([]); }}
              className="flex items-center gap-1 text-[10px] text-rose-300 hover:text-rose-200 transition-colors"
            >
              <Trash2 className="w-2.5 h-2.5" /> Limpar
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {searchHistory.slice(0, 10).map((h) => (
              <button
                key={h.query}
                onClick={() => { setQuery(h.query); handleSearch({ preventDefault: () => {} }); }}
                className="group flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/10 text-[10px] text-slate-300 hover:border-cyan-500/30 hover:text-cyan-300 transition-colors"
              >
                {h.query}
                <X
                  className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-300"
                  onClick={(e) => { e.stopPropagation(); searchHistoryManager.remove(h.query); setSearchHistory(searchHistoryManager.list()); }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Colar URL do YouTube Music */}
      <div className="space-y-1">
        <div className="flex items-center gap-1 text-[10px] text-slate-500">
          <Link2 className="w-3 h-3" /> Ou cole um link do YouTube Music:
        </div>
        <form onSubmit={handleLoadUrl} className="flex gap-1.5">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://music.youtube.com/watch?v=... ou playlist?list=..."
            className="bg-white/5 border-white/10 text-slate-200 text-xs h-8"
          />
          <Button type="submit" size="sm" variant="ghost" disabled={loading || !urlInput.trim()} className="h-8 px-2 text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/20">
            <Play className="w-3.5 h-3.5" />
          </Button>
        </form>
      </div>

      {error && (
        <div className="flex items-start gap-1.5 text-[10px] text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-md p-2">
          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Resultados */}
      <div className="space-y-1 max-h-[40vh] overflow-y-auto pr-1">
        {results.map((item) => (
          <div
            key={item.videoId || item.playlistId || item.browseId || item.title}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.06] border border-white/10 hover:bg-white/[0.1] hover:border-cyan-500/40 transition-colors"
          >
            {item.thumbnail ? (
              <img src={item.thumbnail} alt="" className="w-10 h-10 rounded-md object-cover shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-md bg-white/5 flex items-center justify-center shrink-0">
                {typeIcon(item)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs text-slate-100 truncate font-medium">{item.title}</div>
              <div className="text-[10px] text-slate-400 truncate flex items-center gap-1.5">
                <span>{item.artist || item.channelTitle}</span>
                {item.album && (
                  <>
                    <span className="text-slate-600">·</span>
                    <span className="inline-flex items-center gap-0.5 text-slate-500">
                      <Disc3 className="w-2.5 h-2.5" /> {item.album}
                    </span>
                  </>
                )}
                {item.durationStr && (
                  <>
                    <span className="text-slate-600">·</span>
                    <span className="inline-flex items-center gap-0.5 text-slate-500">
                      <Clock className="w-2.5 h-2.5" /> {item.durationStr}
                    </span>
                  </>
                )}
                {item.videoCount ? ` · ${item.videoCount} faixas` : ''}
                <span className="text-slate-600">· {item.type || item.source}</span>
              </div>
            </div>
            {renderActions(item)}
          </div>
        ))}
        {!loading && results.length === 0 && query && !error && (
          <div className="text-[11px] text-slate-500 text-center py-4">Nenhum resultado. Tente outro termo.</div>
        )}
      </div>

      {/* Carregar mais — paginação via continuation quando disponível */}
      {continuation && !loading && (
        <button
          onClick={handleLoadMore}
          disabled={loadingMore}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 transition-colors disabled:opacity-50"
        >
          {loadingMore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {loadingMore ? 'Carregando...' : 'Carregar mais'}
        </button>
      )}
    </div>
  );
}