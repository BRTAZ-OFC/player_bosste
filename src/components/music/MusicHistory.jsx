import React from 'react';
import { History, Trash2, X, RotateCcw } from 'lucide-react';
import { historyManager } from '@/lib/music/historyManager';
import { playTrack } from '@/lib/music/youtubePlayer';
import { useMusicPlayer } from '@/lib/music/useMusicPlayer';

export default function MusicHistory() {
  const { history } = useMusicPlayer();

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1.5 py-4 text-slate-500">
        <History className="w-5 h-5" />
        <span className="text-[11px]">Nenhuma música tocada ainda.</span>
      </div>
    );
  }

  const handleReplay = (item) => {
    playTrack({
      videoId: item.videoId,
      title: item.title,
      artist: item.artist,
      thumbnail: item.thumbnail,
      durationStr: item.durationStr,
    });
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-slate-400 font-mono">{history.length} no histórico</span>
        <button
          onClick={() => historyManager.clear()}
          className="flex items-center gap-1 text-[10px] text-rose-300 hover:text-rose-200 transition-colors"
        >
          <Trash2 className="w-3 h-3" /> Limpar
        </button>
      </div>
      <div className="space-y-1 max-h-[30vh] overflow-y-auto pr-1">
        {history.map((item) => (
          <div
            key={item.videoId}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg border bg-white/[0.03] border-white/10 hover:border-white/20 transition-colors group"
          >
            {item.thumbnail ? (
              <img src={item.thumbnail} alt="" className="w-8 h-8 rounded-md object-cover shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-md bg-white/5 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs truncate text-slate-200">{item.title}</div>
              <div className="text-[10px] text-slate-400 truncate">{item.artist}</div>
            </div>
            <span className="text-[10px] font-mono text-slate-500 shrink-0 hidden sm:inline">{item.durationStr}</span>
            <button
              onClick={() => handleReplay(item)}
              className="p-1 rounded-md text-cyan-300 hover:bg-cyan-500/10 transition-colors shrink-0"
              title="Tocar novamente"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
            <button
              onClick={() => historyManager.remove(item.videoId)}
              className="p-1 rounded-md text-slate-500 hover:text-rose-300 hover:bg-rose-500/10 transition-colors shrink-0"
              title="Remover do histórico"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}