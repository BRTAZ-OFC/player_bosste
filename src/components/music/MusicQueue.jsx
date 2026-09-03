import React from 'react';
import { Trash2, Play, ListMusic, X, ChevronUp, ChevronDown } from 'lucide-react';
import { queueManager } from '@/lib/music/queueManager';
import { jumpTo } from '@/lib/music/youtubePlayer';
import { useMusicPlayer } from '@/lib/music/useMusicPlayer';

export default function MusicQueue() {
  const { queue, track } = useMusicPlayer();

  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1.5 py-4 text-slate-500">
        <ListMusic className="w-5 h-5" />
        <span className="text-[11px]">Fila vazia — adicione músicas pela busca.</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-slate-400 font-mono">{queue.length} na fila</span>
        <button
          onClick={() => queueManager.clear()}
          className="flex items-center gap-1 text-[10px] text-rose-300 hover:text-rose-200 transition-colors"
        >
          <Trash2 className="w-3 h-3" /> Limpar
        </button>
      </div>
      <div className="space-y-1 max-h-[30vh] overflow-y-auto pr-1">
        {queue.map((item, idx) => {
          const isCurrent = item.videoId === track?.videoId;
          return (
            <div
              key={`${item.videoId}-${item._index}`}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors ${
                isCurrent
                  ? 'bg-cyan-500/10 border-cyan-500/30'
                  : 'bg-white/[0.03] border-white/10 hover:border-white/20'
              }`}
            >
              {/* Reordenação: subir/descer */}
              <div className="flex flex-col shrink-0">
                <button
                  onClick={() => queueManager.move(item._index, item._index - 1)}
                  disabled={item._index === 0}
                  className="p-0.5 text-slate-500 hover:text-cyan-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                  title="Mover para cima"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  onClick={() => queueManager.move(item._index, item._index + 1)}
                  disabled={item._index === queue.length - 1}
                  className="p-0.5 text-slate-500 hover:text-cyan-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                  title="Mover para baixo"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>

              {/* Thumbnail + info */}
              <div
                className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                onClick={() => jumpTo(item._index)}
              >
                {item.thumbnail ? (
                  <img src={item.thumbnail} alt="" className="w-8 h-8 rounded-md object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-md bg-white/5 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className={`text-xs truncate ${isCurrent ? 'text-cyan-300 font-medium' : 'text-slate-200'}`}>
                    {isCurrent && <Play className="w-2.5 h-2.5 inline mr-1" />}
                    {item.title}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {item.artist}
                    {item.album ? ` · ${item.album}` : ''}
                  </div>
                </div>
              </div>

              {/* Duração + remover */}
              <span className="text-[10px] font-mono text-slate-500 shrink-0">{item.durationStr}</span>
              <button
                onClick={(e) => { e.stopPropagation(); queueManager.remove(item._index); }}
                className="p-1 rounded-md text-slate-500 hover:text-rose-300 hover:bg-rose-500/10 transition-colors shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}