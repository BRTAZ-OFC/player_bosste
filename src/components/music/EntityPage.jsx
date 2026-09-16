import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { aggregateSearch } from '@/lib/music/musicAggregator';
import SearchResultGroup from './SearchResultGroup';
import { TYPE_LABELS, TYPE_ORDER } from '@/lib/music/sourceLabels';

// Página dedicada de um artista ou gênero (clique em metatag): agrega TODAS as
// fontes e mostra no MESMO formato da busca — lista por plataforma com
// "Ver mais / Ver menos" (3 linhas iniciais). Não usa carrossel.
export default function EntityPage({ name, kind, label, onBack, onActivate, onAdd, onSearch }) {
  const [groups, setGroups] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setGroups(null);
    (async () => {
      try {
        const g = await aggregateSearch(name);
        if (alive) setGroups(g);
      } catch {
        if (alive) setGroups(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [name]);

  const hasAny = groups && TYPE_ORDER.some((t) => (groups[t] || []).length);
  const title = label || name;
  const subtitle = kind === 'genre' ? 'Estilo musical · tudo que temos' : kind === 'artist' ? 'Artista · tudo que temos' : 'Tudo que temos';

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-[#B3B3B3] hover:text-white transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar
      </button>
      <div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <p className="text-xs text-[#B3B3B3]">{subtitle}</p>
      </div>
      {loading && (
        <div className="flex items-center justify-center py-12 text-[#B3B3B3]">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando tudo sobre {title}...
        </div>
      )}
      {!loading && !hasAny && (
        <div className="text-center py-12 space-y-3">
          <p className="text-sm text-[#B3B3B3]">Nada encontrado para {title}.</p>
          <button onClick={() => onSearch?.(name)} className="px-4 py-2 rounded-full bg-[#FF9E9E]/15 border border-[#FF9E9E]/30 text-xs text-[#FF9E9E] hover:bg-[#FF9E9E]/25 transition-colors">
            Buscar mesmo assim
          </button>
        </div>
      )}
      {!loading && hasAny && (
        <>
          {TYPE_ORDER.map((type) => (groups[type] || []).length > 0 && (
            <SearchResultGroup key={type} title={TYPE_LABELS[type]} items={groups[type]} onActivate={onActivate} onAdd={onAdd} />
          ))}
        </>
      )}
    </div>
  );
}