import React from 'react';
import MusicPlayerContainer from '@/components/music/MusicPlayerContainer';
import MusicPlayerBar from '@/components/music/MusicPlayerBar';

export default function App() {
  return (
    <div className="min-h-screen bg-[#05060f] text-white safe-top safe-bottom">
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
        <h1 className="text-2xl font-bold text-cyan-300 font-display">Player de Música</h1>
        <p className="text-sm text-slate-400">Player standalone + busca no YouTube Music</p>
      </div>
      <MusicPlayerContainer />
      <MusicPlayerBar />
    </div>
  );
}
