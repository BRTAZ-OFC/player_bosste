import React, { useEffect, useRef } from 'react';
import { initPlayer } from '@/lib/music/youtubePlayer';

// Container oculto do player de música — sempre montado (exceto em overlays)
// para manter o iframe e o broadcast ativos durante a navegação entre abas.
export default function MusicPlayerContainer() {
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    initPlayer('yt-music-player').catch(() => {});
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        width: 320,
        height: 180,
        bottom: -200,
        right: -220,
        opacity: 0.01,
        pointerEvents: 'none',
        zIndex: -1,
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      <div id="yt-music-player" style={{ width: '100%', height: '100%' }} />
    </div>
  );
}