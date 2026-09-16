import React, { useState, useEffect, useRef } from 'react';
import { Play, Plus, ChevronLeft, ChevronRight } from 'lucide-react';

// Carrossel real (NÃO marquee): avança UMA faixa por vez, devagar, em ciclo
// infinito — ao chegar ao fim do conjunto duplicado, a última faixa vira a
// primeira e o fluxo continua sem solução de continuidade. Pausa no hover.
// Setas avançam um card. Usado SOMENTE na home (início da galeria).
export default function MusicCarousel({ title, items, onActivate, onAdd, variant = 'default' }) {
  const featured = variant === 'featured';
  const cardW = featured ? 176 : 144;
  const gap = 12;
  const step = cardW + gap;
  const itemsArr = items || [];
  const count = itemsArr.length;

  const [index, setIndex] = useState(0);
  const [noAnim, setNoAnim] = useState(false);
  const pausedRef = useRef(false);

  useEffect(() => { setIndex(0); setNoAnim(false); }, [items]);

  // Auto-advance devagar: um card a cada ~4s.
  useEffect(() => {
    if (count <= 1) return;
    const id = setInterval(() => {
      if (pausedRef.current) return;
      setNoAnim(false);
      setIndex((i) => i + 1);
    }, 4000);
    return () => clearInterval(id);
  }, [count]);

  // Wrap infinito: ao completar um conjunto, volta ao início sem animação
  // (posição visualmente idêntica — o track é duplicado).
  useEffect(() => {
    if (index >= count && count > 0) {
      const t = setTimeout(() => { setNoAnim(true); setIndex(0); }, 700);
      return () => clearTimeout(t);
    }
  }, [index, count]);

  if (!count) return null;

  const shift = (dir) => {
    setNoAnim(false);
    setIndex((i) => {
      const n = i + dir;
      if (n >= count) return 0;
      if (n < 0) return count - 1;
      return n;
    });
  };

  const loop = [...itemsArr, ...itemsArr];
  const offset = index * step;
  const transition = noAnim ? 'none' : 'transform 0.7s ease';

  const sub = (it) => it.artist || it.channelTitle
    || (it.type === 'album' ? 'Álbum' : it.type === 'playlist' ? 'Playlist' : it.type === 'mix' ? 'Mix' : it.type === 'artist' ? 'Artista' : it.type === 'mb_artist' ? 'Artista' : it.type === 'mb_recording' ? 'Gravação' : it.type === 'mb_release' ? 'Lançamento' : it.type === 'lastfm_artist' ? 'Artista' : it.type === 'lastfm_album' ? 'Álbum' : it.type === 'jamendo_track' ? 'Jamendo' : it.type === 'itunes_track' ? 'iTunes' : it.type === 'itunes_album' ? 'iTunes' : it.type === 'deezer_track' ? 'Deezer' : it.type === 'bandcamp_track' ? 'Bandcamp' : it.type === 'bandcamp_album' ? 'Bandcamp' : it.type === 'audius_track' ? 'Audius' : it.type === 'mixcloud_mix' ? 'Mixcloud' : '');

  return (
    <section className="space-y-2">
      {title && (
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-[#B3B3B3] mr-1">{itemsArr.length}</span>
            <button onClick={() => shift(-1)} className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[#B3B3B3] hover:text-white" title="Anterior">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => shift(1)} className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[#B3B3B3] hover:text-white" title="Próximo">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
      <div
        className="overflow-hidden"
        onMouseEnter={() => { pausedRef.current = true; }}
        onMouseLeave={() => { pausedRef.current = false; }}
      >
        <div className="flex" style={{ transform: `translate3d(${-offset}px,0,0)`, transition }}>
          {loop.map((it, i) => {
            const key = (it.videoId || it.playlistId || it.browseId || it.title) + '-' + i;
            return (
              <div key={key} className="shrink-0 group" style={{ width: cardW, marginRight: gap }}>
                <button
                  onClick={() => onActivate?.(it)}
                  className="relative block w-full rounded-xl overflow-hidden bg-white/5 mb-1.5"
                  style={{ height: cardW }}
                >
                  <div className="absolute inset-0 flex items-center justify-center text-[#FF9E9E]/40">
                    <Play className="w-6 h-6" />
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
      </div>
    </section>
  );
}