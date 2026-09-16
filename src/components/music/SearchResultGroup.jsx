import React, { useState, useEffect } from 'react';
import { Play, Plus, ChevronDown, ChevronUp } from 'lucide-react';

// Lista em grade (NÃO carrossel) para resultados de pesquisa e seções filtradas.
// Mostra 3 linhas iniciais; "Ver mais" expande tudo; "Ver menos" recolhe a 3 linhas.
// Colunas responsivas (3 mobile → 6 desktop); o limite inicial acompanha as colunas
// para sempre formar exatamente 3 linhas.
function useCols() {
  const [cols, setCols] = useState(3);
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      if (w >= 1024) setCols(6);
      else if (w >= 768) setCols(5);
      else if (w >= 640) setCols(4);
      else setCols(3);
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);
  return cols;
}

export default function SearchResultGroup({ title, items, onActivate, onAdd }) {
  const cols = useCols();
  const itemsArr = items || [];
  const initialCount = 3 * cols;
  const [expanded, setExpanded] = useState(false);

  if (!itemsArr.length) return null;

  const visible = expanded ? itemsArr : itemsArr.slice(0, initialCount);
  const hasMore = itemsArr.length > initialCount;
  const sub = (it) => it.artist || it.channelTitle || '';

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <span className="text-[11px] text-[#B3B3B3]">{itemsArr.length}</span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
        {visible.map((it, i) => {
          const key = (it.videoId || it.playlistId || it.browseId || it.title) + '-' + i;
          return (
            <div key={key} className="space-y-1">
              <button
                onClick={() => onActivate?.(it)}
                className="relative block w-full rounded-xl overflow-hidden bg-white/5 aspect-square"
              >
                <div className="absolute inset-0 flex items-center justify-center text-[#FF9E9E]/40">
                  <Play className="w-5 h-5" />
                </div>
                {it.thumbnail && (
                  <img
                    src={it.thumbnail}
                    alt=""
                    className="relative w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                )}
              </button>
              <div className="flex items-center justify-between gap-1">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-white truncate">{it.title}</div>
                  <div className="text-[11px] text-[#B3B3B3] truncate">{sub(it)}</div>
                </div>
                <button
                  onClick={() => onAdd?.(it)}
                  className="p-1 text-[#B3B3B3] hover:text-white shrink-0"
                  title="Adicionar à biblioteca"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-xs text-[#B3B3B3] hover:text-white px-1"
        >
          {expanded ? <><ChevronUp className="w-3.5 h-3.5" /> Ver menos</> : <><ChevronDown className="w-3.5 h-3.5" /> Ver mais</>}
        </button>
      )}
    </section>
  );
}