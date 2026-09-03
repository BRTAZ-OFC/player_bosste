import React, { useState } from 'react';
import { Play, AlertCircle, Link2 } from 'lucide-react';
import { playTrack } from '@/lib/music/youtubePlayer';
import { queueManager } from '@/lib/music/queueManager';
import { playerEvents } from '@/lib/music/playerEvents';

// Aba "URL" — adicionar fonte de áudio DIRETA (não-YouTube) ao player.
// Usa o backend HTML5 <audio> (fallback). Funciona em ambientes onde o iframe
// do YouTube está bloqueado (ex: Boosteroid). Páginas do YouTube não são aceitas.

const AUDIO_EXT = /\.(mp3|ogg|wav|m4a|aac|flac|opus|webm)(\?|#|$)/i;
const YT_PAGE = /(youtube\.com\/watch|music\.youtube\.com|youtu\.be\/|youtube-nocookie\.com|\/embed\/)/i;

function isDirectAudio(u) {
  if (!u || !/^https?:\/\//i.test(u)) return false;
  if (YT_PAGE.test(u)) return false;
  return AUDIO_EXT.test(u);
}

export default function MusicDirectUrl() {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [err, setErr] = useState('');

  function handleAddAndPlay() {
    setErr('');
    const u = url.trim();
    if (!u) { setErr('Cole uma URL de áudio direta (MP3/OGG/WAV/M4A).'); return; }
    if (!isDirectAudio(u)) {
      setErr('URL inválida: deve ser um arquivo de áudio direto. Páginas do YouTube (watch/embed/music.youtube.com) não são aceitas.');
      return;
    }
    const track = {
      audioUrl: u,
      url: u,
      title: title.trim() || 'Áudio direto',
      artist: artist.trim() || 'Fonte externa',
      source: 'audio',
      videoId: null,
      thumbnail: '',
    };
    queueManager.add(track);
    playerEvents.emit('queue_changed', queueManager.getQueue());
    playTrack(track);
    setUrl('');
    setTitle('');
    setArtist('');
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-[10px] text-emerald-300">
        <Link2 className="w-3 h-3" /> Backend HTML5 &lt;audio&gt; (fallback legítimo)
      </div>
      <div className="text-[10px] text-slate-400 leading-relaxed">
        Adicione uma URL de áudio <strong className="text-emerald-300">direta</strong> (MP3/OGG/WAV/M4A) — uploads próprios ou hospedagem legítima.
        Esta fonte funciona em ambientes onde o iframe do YouTube está bloqueado (ex: Boosteroid).
        Páginas do YouTube não são aceitas.
      </div>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://exemplo.com/musica.mp3"
        className="w-full rounded-md bg-black/40 border border-white/10 px-2.5 py-1.5 text-[11px] text-slate-200 font-mono"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título (opcional)"
          className="rounded-md bg-black/40 border border-white/10 px-2.5 py-1.5 text-[11px] text-slate-200"
        />
        <input
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          placeholder="Artista (opcional)"
          className="rounded-md bg-black/40 border border-white/10 px-2.5 py-1.5 text-[11px] text-slate-200"
        />
      </div>
      {err && (
        <div className="flex items-center gap-1.5 text-[10px] text-rose-300">
          <AlertCircle className="w-3 h-3 shrink-0" /> {err}
        </div>
      )}
      <button
        onClick={handleAddAndPlay}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-[11px] hover:bg-emerald-500/25 transition-colors"
      >
        <Play className="w-3.5 h-3.5" /> Adicionar e tocar
      </button>
    </div>
  );
}