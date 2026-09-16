import React from 'react';
import { ChevronRight, History, ListMusic, Users } from 'lucide-react';
import { useMusicPlayer } from '@/lib/music/useMusicPlayer';
import { playTrack, jumpTo } from '@/lib/music/youtubePlayer';

// Home da biblioteca — seções reais baseadas nos dados do player.
export default function LibraryHome() {
  const { history, queue } = useMusicPlayer();

  return (
    <div className="space-y-6">
      <Section title="Tocado recentemente" icon={History} items={history} onPlay={(t) => playTrack(t)} />
      <Section title="Fila atual" icon={ListMusic} items={queue} onPlay={(t) => jumpTo(t._index)} />

      <section className="space-y-2.5">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#FF9E9E]" />
          <h2 className="text-base font-semibold text-white">Da comunidade</h2>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 text-center text-xs text-[#B3B3B3]">
          Em breve — playlists da comunidade aparecerão aqui.
        </div>
      </section>
    </div>
  );
}

function Section({ title, icon: Icon, items, onPlay }) {
  const empty = title === 'Tocado recentemente' ? 'Nenhuma música tocada ainda.' : 'A fila está vazia.';
  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-[#FF9E9E]" />
          <h2 className="text-base font-semibold text-white">{title}</h2>
        </div>
        <ChevronRight className="w-4 h-4 text-[#B3B3B3]" />
      </div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-xs text-[#B3B3B3]">{empty}</div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {items.slice(0, 12).map((t, i) => (
            <button
              key={(t.videoId || 'q') + '-' + (t._index ?? i)}
              onClick={() => onPlay(t)}
              className="w-28 shrink-0 text-left group"
            >
              <div className="w-28 h-28 rounded-xl overflow-hidden bg-white/5 mb-1.5">
                {t.thumbnail ? (
                  <img src={t.thumbnail} alt="" className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" />
                ) : null}
              </div>
              <div className="text-xs font-medium text-white truncate">{t.title}</div>
              <div className="text-[11px] text-[#B3B3B3] truncate">{t.artist}</div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}