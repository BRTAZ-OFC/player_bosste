import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, History, Trash2, Users, ArrowLeft } from 'lucide-react';
import {
  searchAll, searchYouTube, searchMusic, searchPlaylists } from
'@/lib/music/musicSearch';
import { searchMusicBrainz } from '@/lib/music/musicBrainz';
import { searchItunes } from '@/lib/music/itunes';
import { searchDeezer } from '@/lib/music/deezer';
import { searchBandcamp } from '@/lib/music/bandcamp';
import { searchAudius } from '@/lib/music/audius';
import { searchMixcloud } from '@/lib/music/mixcloud';
import { aggregateSearch } from '@/lib/music/musicAggregator';
import { queueManager } from '@/lib/music/queueManager';
import { playTrack } from '@/lib/music/youtubePlayer';
import { searchHistoryManager } from '@/lib/music/searchHistoryManager';
import { libraryManager } from '@/lib/music/libraryManager';
import MusicCarousel from './MusicCarousel';
import SearchResultGroup from './SearchResultGroup';
import MusicDetail from './MusicDetail';
import EntityPage from './EntityPage';
import { TYPE_LABELS, TYPE_ORDER } from '@/lib/music/sourceLabels';

// Galeria estilo YouTube Music — navegação por seção (carrosséis infinitos),
// filtro por categoria (chips) e busca global (cabeçalho fixo).
const TAGS = ['Pop', 'Rock', 'Sertanejo', 'Funk', 'Hip Hop', 'Eletrônica', 'MPB', 'Jazz', 'Lo-fi', 'Trap', 'Gospel', 'Clássica'];
// TYPE_LABELS/TYPE_ORDER importados de @/lib/music/sourceLabels (compartilhados com EntityPage).

const SEED = {
  main: 'músicas mais tocadas 2026',
  mostPlayed: 'top músicas brasil 2026',
  community: 'playlist da comunidade'
};

// Mapa de filtro (chip) -> seção do browse.
const SECTIONS = {
  songs: { label: 'Músicas', variant: 'default' },
  artists: { label: 'Artistas', variant: 'default' },
  mostPlayed: { label: 'Mais tocadas', variant: 'default' },
  playlists: { label: 'Playlists', variant: 'default' },
  gallery: { label: 'Galeria', variant: 'default' },
  community: { label: 'Playlist da Comunidade', variant: 'featured' }
};

export default function MusicGallery({ externalQuery, onSearch, filter }) {
  const [groups, setGroups] = useState({});
  const [browse, setBrowse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);
  const [history, setHistory] = useState(() => searchHistoryManager.list());
  const [nav, setNav] = useState([]);
  const pushView = (v) => setNav((n) => [...n, v]);
  const popView = () => setNav((n) => n.slice(0, -1));
  const currentView = nav[nav.length - 1] || null;

  useEffect(() => {loadBrowse();}, []);

  useEffect(() => {
    const t = (externalQuery || '').trim();
    if (t) {setNav([]);runSearch(t);} else
    {setSearched(false);setGroups({});setError(null);}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalQuery]);

  async function loadBrowse() {
    setBrowseLoading(true);
    try {
      const [main, most, comm, it, bc, au, dz, mx] = await Promise.all([
      searchAll(SEED.main).catch(() => ({ items: [] })),
      searchMusic(SEED.mostPlayed).catch(() => ({ items: [] })),
      searchPlaylists(SEED.community).catch(() => ({ items: [] })),
      searchItunes('top músicas 2026').catch(() => ({ tracks: [], albums: [] })),
      searchBandcamp('brazil indie').catch(() => ({ tracks: [], albums: [] })),
      searchAudius('trending').catch(() => []),
      searchDeezer('top brasil 2026').catch(() => []),
      searchMixcloud('dj mix').catch(() => [])]
      );
      const all = main.items || [];
      const g = {};
      for (const it of all) {const t = it.type || 'song';(g[t] = g[t] || []).push(it);}
      setBrowse({
        community: (comm.items || []).filter((p) => p.playlistId),
        songs: g.song || [],
        artists: g.artist || [],
        mostPlayed: (most.items || []).filter((t) => t.videoId),
        playlists: g.playlist || [],
        gallery: g.album || [],
        itunes: (it.tracks || []).slice(0, 20),
        bandcamp: [...(bc.tracks || []), ...(bc.albums || [])].slice(0, 20),
        audius: (au || []).slice(0, 20),
        deezer: (dz || []).slice(0, 20),
        mixcloud: (mx || []).slice(0, 20)
      });
    } catch (e) {/* silencioso */} finally {setBrowseLoading(false);}
  }

  async function runSearch(q) {
    const term = (q || '').trim();
    if (!term) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    setNav([]);
    searchHistoryManager.add(term);
    setHistory(searchHistoryManager.list());
    try {
      const g = await aggregateSearch(term);
      setGroups(g);
    } catch (err) {
      setError(err.message || 'Erro na busca');
    } finally {
      setLoading(false);
    }
  }

  function handleActivate(item) {pushView({ type: 'detail', item });}
  function handleOpenEntity(e) {pushView({ type: 'entity', ...e });}

  function handleSelect(track, tracks) {
    const idx = tracks.findIndex((t) => t.videoId === track.videoId);
    queueManager.setQueue(tracks, idx >= 0 ? idx : 0);
    playTrack(track);
  }

  function handleAdd(item) {libraryManager.add(item);}

  if (currentView?.type === 'entity') {
    return (
      <EntityPage
        name={currentView.name}
        kind={currentView.kind}
        label={currentView.label}
        onBack={popView}
        onActivate={handleActivate}
        onAdd={handleAdd}
        onSearch={(q) => {setNav([]);onSearch?.(q);}} />);


  }
  if (currentView?.type === 'detail') {
    return (
      <MusicDetail
        item={currentView.item}
        onBack={popView}
        onSelect={handleSelect}
        onAdd={handleAdd}
        onOpenEntity={handleOpenEntity} />);


  }

  const inSearch = searched && (externalQuery || '').trim().length > 0;
  const inFilter = !inSearch && !!filter && !!SECTIONS[filter];
  const sectionItems = inFilter && browse ? browse[filter] || [] : [];

  return (
    <div className="space-y-4">
      {(inSearch || inFilter) &&
      <button onClick={() => onSearch?.('')} className="flex items-center gap-1.5 text-xs text-[#B3B3B3] hover:text-white transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar à galeria
        </button>
      }

      {/* Tags de gênero — só nos modos browse e busca */}
      {!inFilter &&
      <div className="flex gap-2 overflow-x-auto pb-1 hidden">
          {TAGS.map((t) =>
        <button
          key={t}
          onClick={() => onSearch?.(t)}
          className="shrink-0 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-[#B3B3B3] hover:text-white hover:border-[#FF9E9E]/40 transition-colors">
          
              {t}
            </button>
        )}
        </div>
      }

      {/* Buscas recentes — só no modo browse */}
      {!inSearch && !inFilter && history.length > 0 &&
      <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-[11px] text-[#B3B3B3]"><History className="w-3 h-3" /> Buscas recentes</div>
            <button onClick={() => {searchHistoryManager.clear();setHistory([]);}} className="flex items-center gap-1 text-[11px] text-rose-300 hover:text-rose-200">
              <Trash2 className="w-3 h-3" /> Limpar
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {history.slice(0, 10).map((h) =>
          <button key={h.query} onClick={() => onSearch?.(h.query)} className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[11px] text-[#B3B3B3] hover:border-[#FF9E9E]/40 hover:text-white transition-colors">
                {h.query}
              </button>
          )}
          </div>
        </div>
      }

      {error &&
      <div className="flex items-center gap-1.5 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-md p-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </div>
      }

      {inSearch ?
      <>
          {loading &&
        <div className="flex items-center justify-center py-12 text-[#B3B3B3]">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Buscando em YouTube Music, YouTube, MusicBrainz, Last.fm, Jamendo, iTunes, Deezer, Bandcamp, Audius, Mixcloud...
            </div>
        }
          {!loading && Object.keys(groups).length === 0 && !error &&
        <div className="text-center py-12 text-sm text-[#B3B3B3]">Nenhum resultado. Tente outro termo ou tag.</div>
        }
          {!loading && TYPE_ORDER.map((type) =>
        <SearchResultGroup key={type} title={TYPE_LABELS[type]} items={groups[type]} onActivate={handleActivate} onAdd={handleAdd} />
        )}
        </> :
      inFilter ?
      <>
          {browseLoading &&
        <div className="flex items-center justify-center py-12 text-[#B3B3B3]">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
            </div>
        }
          {!browseLoading && sectionItems.length === 0 &&
        <div className="text-center py-12 text-sm text-[#B3B3B3]">Nada por aqui ainda.</div>
        }
          {!browseLoading && sectionItems.length > 0 &&
        <SearchResultGroup
          title={SECTIONS[filter].label}
          items={sectionItems}
          onActivate={handleActivate}
          onAdd={handleAdd} />

        }
        </> :

      <>
          {browseLoading &&
        <div className="flex items-center justify-center py-12 text-[#B3B3B3]">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando galeria...
            </div>
        }

          <section className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <div className="w-8 h-8 rounded-lg bg-[#FF9E9E]/15 flex items-center justify-center">
                <Users className="w-4 h-4 text-[#FF9E9E]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-tight">Playlist da Comunidade</h3>
                <p className="text-[11px] text-[#B3B3B3]">Playlists criadas pela comunidade — toque e descubra</p>
              </div>
            </div>
            <MusicCarousel items={browse?.community} onActivate={handleActivate} onAdd={handleAdd} variant="featured" />
          </section>

          {!browseLoading &&
        <>
              <MusicCarousel title="Músicas" items={browse?.songs} onActivate={handleActivate} onAdd={handleAdd} />
              <MusicCarousel title="Artistas" items={browse?.artists} onActivate={handleActivate} onAdd={handleAdd} />
              <MusicCarousel title="Mais tocadas" items={browse?.mostPlayed} onActivate={handleActivate} onAdd={handleAdd} />
              <MusicCarousel title="Playlists" items={browse?.playlists} onActivate={handleActivate} onAdd={handleAdd} />
              <MusicCarousel title="Galeria" items={browse?.gallery} onActivate={handleActivate} onAdd={handleAdd} />
              <MusicCarousel title="iTunes · Destaques" items={browse?.itunes} onActivate={handleActivate} onAdd={handleAdd} />
              <MusicCarousel title="Deezer · Destaques" items={browse?.deezer} onActivate={handleActivate} onAdd={handleAdd} />
              <MusicCarousel title="Bandcamp · Destaques" items={browse?.bandcamp} onActivate={handleActivate} onAdd={handleAdd} />
              <MusicCarousel title="Audius · Destaques" items={browse?.audius} onActivate={handleActivate} onAdd={handleAdd} />
              <MusicCarousel title="Mixcloud · Destaques" items={browse?.mixcloud} onActivate={handleActivate} onAdd={handleAdd} />
            </>
        }
        </>
      }
    </div>);

}