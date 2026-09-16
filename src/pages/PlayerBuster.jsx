import React, { useState } from 'react';
import { Search, ListMusic, History } from 'lucide-react';
import MusicPlayerContainer from '@/components/music/MusicPlayerContainer';
import MusicPlayerBar from '@/components/music/MusicPlayerBar';
import MusicGallery from '@/components/music/MusicGallery';
import MusicQueue from '@/components/music/MusicQueue';
import MusicHistory from '@/components/music/MusicHistory';
import LibraryHeader from '@/components/music/LibraryHeader';
import FilterChips from '@/components/music/FilterChips';
import BottomNav from '@/components/music/BottomNav';

// Abas de acesso rápido mantidas no topo.
const TABS = [
{ id: 'search', label: 'Busca', icon: Search },
{ id: 'queue', label: 'Fila', icon: ListMusic },
{ id: 'history', label: 'Histórico', icon: History }];


export default function PlayerBuster() {
  const [view, setView] = useState('home');
  // Busca global (cabeçalho fixo): query = texto do input; submitted = termo disparado.
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [filter, setFilter] = useState(null);

  const handleSearch = (term) => {
    const t = (term || '').trim();
    setQuery(term || '');
    setSubmitted(t);
    setFilter(null);
    if (t) setView('home'); // a galeria (home) mostra os resultados
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white safe-top">
      <LibraryHeader
        onUserGallery={() => setView('home')}
        query={query}
        onQueryChange={setQuery}
        onSearchSubmit={handleSearch} />
      
      <FilterChips
        active={filter}
        onPick={(key) => {
          setFilter((prev) => prev === key ? null : key);
          setSubmitted('');
          setQuery('');
          setView('home');
        }} />
      

      {/* Abas mantidas — acesso rápido */}
      <div className="flex gap-1.5 overflow-x-auto px-4 pb-3">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = view === t.id;
          return null;












        })}
      </div>

      <main className="px-4 pb-28">
        {/* home e search renderizam a mesma galeria (instância preservada) */}
        {(view === 'home' || view === 'search') &&
        <MusicGallery externalQuery={submitted} onSearch={handleSearch} filter={filter} />
        }
        {view === 'queue' && <Panel title="Fila" subtitle="Próximas faixas"><MusicQueue /></Panel>}
        {view === 'history' && <Panel title="Histórico" subtitle="Músicas tocadas"><MusicHistory /></Panel>}
      </main>

      <MusicPlayerContainer />
      <MusicPlayerBar />
      <BottomNav active={view} onChange={setView} />
    </div>);

}

function Panel({ title, subtitle, children }) {
  return (
    <div className="rounded-xl bg-[#1a1a1a] border border-white/10 p-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <p className="text-xs text-[#B3B3B3]">{subtitle}</p>
      </div>
      {children}
    </div>);

}