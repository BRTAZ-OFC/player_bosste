import React, { useState } from 'react';
import { Search, ListMusic, History, Link2, Settings2, Music2 } from 'lucide-react';
import MusicPlayerContainer from '@/components/music/MusicPlayerContainer';
import MusicPlayerBar from '@/components/music/MusicPlayerBar';
import MusicSearch from '@/components/music/MusicSearch';
import MusicQueue from '@/components/music/MusicQueue';
import MusicHistory from '@/components/music/MusicHistory';
import MusicDirectUrl from '@/components/music/MusicDirectUrl';
import MusicOverlayConfig from '@/components/music/MusicOverlayConfig';

const NAV_TABS = [
  { id: 'search', label: 'Busca', icon: Search },
  { id: 'queue', label: 'Fila', icon: ListMusic },
  { id: 'history', label: 'Histórico', icon: History },
  { id: 'direct', label: 'URL Direta', icon: Link2 },
  { id: 'settings', label: 'Configurações', icon: Settings2 },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('search');

  return (
    <div className="min-h-screen bg-[#05060f] text-white safe-top safe-bottom pb-28">
      {/* Top Header */}
      <header className="border-b border-cyan-500/20 bg-[#070919]/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
              <Music2 className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-bold text-cyan-300 font-display tracking-wide">Player de Música</h1>
              <p className="text-[11px] text-slate-400">YouTube Music &amp; Áudio Direto</p>
            </div>
          </div>

          {/* Navigation Pills */}
          <nav className="flex items-center gap-1 overflow-x-auto py-1">
            {NAV_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="rounded-xl bg-[#0a0d22] border border-white/10 p-4 md:p-6 shadow-xl">
          {activeTab === 'search' && (
            <div>
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-slate-200 font-display">Pesquisa de Músicas e Catálogo</h2>
                <p className="text-xs text-slate-400">Busque músicas, artistas, álbuns e playlists do YouTube Music</p>
              </div>
              <MusicSearch />
            </div>
          )}

          {activeTab === 'queue' && (
            <div>
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-slate-200 font-display">Fila de Reprodução</h2>
                <p className="text-xs text-slate-400">Gerencie a ordem das próximas faixas</p>
              </div>
              <MusicQueue />
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-slate-200 font-display">Histórico de Reprodução</h2>
                <p className="text-xs text-slate-400">Músicas tocadas recentemente</p>
              </div>
              <MusicHistory />
            </div>
          )}

          {activeTab === 'direct' && (
            <div>
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-slate-200 font-display">Áudio Direto (Fallback HTML5)</h2>
                <p className="text-xs text-slate-400">Reproduza arquivos de áudio diretos (MP3, OGG, WAV, M4A)</p>
              </div>
              <MusicDirectUrl />
            </div>
          )}

          {activeTab === 'settings' && (
            <div>
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-slate-200 font-display">Configurações &amp; Overlay</h2>
                <p className="text-xs text-slate-400">Ajuste de ducking de áudio e visualização de overlay</p>
              </div>
              <MusicOverlayConfig />
            </div>
          )}
        </div>
      </main>

      {/* Persistent Audio Player and Bottom Control Bar */}
      <MusicPlayerContainer />
      <MusicPlayerBar />
    </div>
  );
}

