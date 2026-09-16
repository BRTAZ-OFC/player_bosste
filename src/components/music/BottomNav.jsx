import React from 'react';
import { Compass, Search, Library, LayoutGrid, MoreHorizontal } from 'lucide-react';

// Barra de navegação inferior flutuante (estilo pílula) — mobile apenas.
const ITEMS = [
  { id: 'home', label: 'Início', icon: Compass },
  { id: 'search', label: 'Busca', icon: Search },
  { id: 'queue', label: 'Biblioteca', icon: Library },
  { id: 'history', label: 'Grade', icon: LayoutGrid },
  { id: 'settings', label: 'Mais', icon: MoreHorizontal },
];

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 safe-bottom px-3 pb-2 pt-1">
      <div className="mx-auto max-w-md flex items-center justify-between gap-1 rounded-full bg-[#242020] border border-white/10 px-2 py-1.5 shadow-lg shadow-black/50">
        {ITEMS.map((it) => {
          const Icon = it.icon;
          const isActive = active === it.id;
          return (
            <button
              key={it.id}
              onClick={() => onChange(it.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                isActive ? 'bg-[#FF9E9E] text-[#242020]' : 'text-[#B3B3B3] hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {isActive && <span>{it.label}</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
}