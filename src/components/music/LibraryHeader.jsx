import React from 'react';
import { Music2, History, BarChart3, Bell, LayoutGrid, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

// Cabeçalho fixo global: Sonora (esq) + buscador centralizado + ações (dir).
// O buscador é global: persiste independente da aba/página ativa.
export default function LibraryHeader({ onUserGallery, query, onQueryChange, onSearchSubmit }) {
  return (
    <header className="sticky top-0 z-30 bg-[#121212]/95 backdrop-blur border-b border-white/5">
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#FF9E9E]/15 border border-[#FF9E9E]/30 flex items-center justify-center">
            <Music2 className="w-4 h-4 text-[#FF9E9E]" />
          </div>
          <span className="text-base font-bold tracking-tight text-white hidden sm:block">Sonora</span>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSearchSubmit?.(query); }} className="flex-1 min-w-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B3B3B3] pointer-events-none" />
            <Input
              value={query || ''}
              onChange={(e) => onQueryChange?.(e.target.value)}
              placeholder="Pesquisar no YouTube Music e YouTube..."
              className="pl-8 pr-8 bg-white/5 border-white/10 text-white text-sm h-9 rounded-full"
            />
            {query && (
              <button
                type="button"
                onClick={() => { onQueryChange?.(''); onSearchSubmit?.(''); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#B3B3B3] hover:text-white"
                title="Limpar"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>

        <div className="flex items-center gap-1.5 shrink-0">
          <IconBtn title="Histórico"><History className="w-4 h-4" /></IconBtn>
          <IconBtn title="Estatísticas" className="hidden sm:flex"><BarChart3 className="w-4 h-4" /></IconBtn>
          <IconBtn title="Notificações"><Bell className="w-4 h-4" /></IconBtn>
          <IconBtn title="Galeria do usuário" onClick={onUserGallery}><LayoutGrid className="w-4 h-4" /></IconBtn>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF9E9E] to-[#b388ff] flex items-center justify-center text-white text-xs font-bold hidden sm:flex">
            B
          </div>
        </div>
      </div>
    </header>
  );
}

function IconBtn({ title, children, onClick, className = '' }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#B3B3B3] hover:text-white transition-colors ${className}`}
    >
      {children}
    </button>
  );
}