import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Repeat, Repeat1, Shuffle, Music2, AlertCircle, Mic2, VolumeOff, ExternalLink, ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { play, pause, playNext, playPrev, seekTo, setVolume, unlockAudio, isAudioLocked, getCurrentMusicUrl } from '@/lib/music/youtubePlayer';
import { loadMusicSettings, saveMusicSettings } from '@/lib/music/musicSettings';
import { playerEvents } from '@/lib/music/playerEvents';
import { useMusicPlayer } from '@/lib/music/useMusicPlayer';
import MusicSearch from './MusicSearch';

export default function MusicPlayerBar() {
  const { track, progress, settings, error, isPlaying, ttsActive, playbackAvailable, backend } = useMusicPlayer();
  const [muted, setMuted] = useState(false);
  const [audioLocked, setAudioLocked] = useState(() => isAudioLocked());
  const [prevVolume, setPrevVolume] = useState(settings.volume ?? 80);
  const [showMobileVolume, setShowMobileVolume] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Atualiza estado de bloqueio quando uma faixa começa ou é desbloqueada
  useEffect(() => {
    const onUnlock = () => setAudioLocked(false);
    const onTrackStart = () => setAudioLocked(isAudioLocked());
    const offUnlock = playerEvents.on('audio_unlocked', onUnlock);
    const offStart = playerEvents.on('track_started', onTrackStart);
    const offChanged = playerEvents.on('track_changed', onTrackStart);
    return () => {
      offUnlock();
      offStart();
      offChanged();
    };
  }, []);

  function handleUnlock() {
    unlockAudio();
    setAudioLocked(false);
  }

  function handlePlayPause() {
    if (audioLocked) handleUnlock();
    if (isPlaying) pause(); else play();
  }

  function handleNext() {
    if (audioLocked) handleUnlock();
    playNext();
  }

  function handlePrev() {
    if (audioLocked) handleUnlock();
    playPrev();
  }

  function handleVolume(val) {
    const v = val[0];
    setVolume(v);
    setMuted(v === 0);
  }

  function toggleMute() {
    if (muted) {
      setVolume(prevVolume);
      setMuted(false);
    } else {
      setPrevVolume(settings.volume ?? 80);
      setVolume(0);
      setMuted(true);
    }
  }

  function toggleRepeat() {
    const order = ['off', 'all', 'one'];
    const current = settings.repeat || 'off';
    const idx = order.indexOf(current);
    const next = order[(idx + 1) % order.length];
    const s = loadMusicSettings();
    s.repeat = next;
    saveMusicSettings(s);
    playerEvents.emit('player_volume_changed', { volume: s.volume });
  }

  function toggleShuffle() {
    const next = !(settings.shuffle || false);
    const s = loadMusicSettings();
    s.shuffle = next;
    saveMusicSettings(s);
    playerEvents.emit('player_volume_changed', { volume: s.volume });
  }

  const pct = progress.duration > 0 ? (progress.currentTime / progress.duration) * 100 : 0;
  const repeatIcon = (settings.repeat || 'off') === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />;

  return (
    <>
      <div className={`fixed bottom-14 md:bottom-0 left-0 right-0 z-30 safe-bottom bg-[#05060f]/95 backdrop-blur-xl border-t border-cyan-500/20 transition-transform duration-300 ${collapsed ? 'translate-y-full' : 'translate-y-0'} ${ttsActive ? 'opacity-80' : 'opacity-100'}`}>
        {/* Painel de busca integrado ao player — abre acima da barra, dentro da área visual do player */}
        {showSearch && (
          <div className="absolute bottom-full left-0 right-0 mb-0 bg-[#0a0c1b] border-t border-cyan-500/30 shadow-2xl shadow-black/70 max-h-[70vh] overflow-y-auto">
            <div className="max-w-6xl mx-auto px-3 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-display font-bold text-cyan-300">
                  <Search className="w-3.5 h-3.5" /> Buscar no YouTube Music
                </div>
                <button
                  onClick={() => setShowSearch(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Fechar busca"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <MusicSearch />
            </div>
          </div>
        )}
        {/* Indicador de fonte de áudio ativa */}
        {ttsActive && (
          <div className="flex items-center justify-center gap-1 py-0.5 text-[9px] text-amber-300 bg-amber-500/10">
            <Mic2 className="w-2.5 h-2.5" /> TTS ativo — volume da música reduzido
          </div>
        )}

        <div className="max-w-6xl mx-auto px-3 py-2 flex items-center gap-1.5 sm:gap-3">
          {/* Controles de painel — minimizar + pesquisar (LADO ESQUERDO) */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setCollapsed(true)}
              className="p-2.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
              title="Esconder player"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowSearch((v) => !v)}
              className={`p-2.5 rounded-md transition-colors ${showSearch ? 'text-cyan-300 bg-cyan-500/15' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
              title="Buscar música"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          {/* Info da faixa atual */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {track?.thumbnail ? (
              <img src={track.thumbnail} alt="" className="w-10 h-10 rounded-md object-cover shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-md bg-white/5 flex items-center justify-center shrink-0">
                <Music2 className="w-4 h-4 text-slate-500" />
              </div>
            )}
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="text-xs font-medium text-slate-100 font-display">
                <div className="overflow-hidden">
                  <span className="marquee-track">
                    <span className="px-1">{track?.title || 'Nenhuma música'}</span>
                    <span className="px-1" aria-hidden="true">{track?.title || 'Nenhuma música'}</span>
                  </span>
                </div>
              </div>
              <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                {backend === 'audio' && <span className="text-[8px] px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-300 shrink-0">ÁUDIO</span>}
                {track?.artist || (backend === 'audio' ? 'Áudio direto (fallback HTML5)' : 'YouTube Music Player')}
                {track?.album ? ` · ${track.album}` : ''}
              </div>
            </div>
          </div>

          {/* Controles centrais */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={toggleShuffle}
              className={`hidden sm:flex p-1.5 rounded-md transition-colors ${settings.shuffle ? 'text-cyan-300 bg-cyan-500/10' : 'text-slate-400 hover:text-slate-200'}`}
              title="Aleatório"
            >
              <Shuffle className="w-4 h-4" />
            </button>
            <button onClick={handlePrev} className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-white/10 transition-colors" title="Anterior">
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={handlePlayPause}
              className="p-2 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:opacity-90 transition-opacity"
              title={isPlaying ? 'Pausar' : 'Reproduzir'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button onClick={handleNext} className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-white/10 transition-colors" title="Próxima">
              <SkipForward className="w-4 h-4" />
            </button>
            <button
              onClick={toggleRepeat}
              className={`hidden sm:flex p-1.5 rounded-md transition-colors ${(settings.repeat || 'off') !== 'off' ? 'text-cyan-300 bg-cyan-500/10' : 'text-slate-400 hover:text-slate-200'}`}
              title={`Repetir: ${settings.repeat || 'off'}`}
            >
              {repeatIcon}
            </button>
          </div>

          {/* Barra de progresso + tempo */}
          <div className="hidden md:flex items-center gap-2 shrink-0 w-48">
            <span className="text-[10px] font-mono text-slate-400 w-9 text-right">{formatTime(progress.currentTime)}</span>
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer group">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-purple-400 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-slate-400 w-9">{formatTime(progress.duration)}</span>
          </div>

          {/* Volume (desktop) */}
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <button onClick={toggleMute} className="p-1 text-slate-400 hover:text-slate-200" title={muted ? 'Ativar som' : 'Mudo'}>
              {muted || settings.volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={muted ? 0 : (settings.volume ?? 80)}
              onChange={(e) => handleVolume([Number(e.target.value)])}
              className="w-16 h-1 accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Abrir no YouTube Music — usa exclusivamente music.youtube.com */}
          {track?.videoId && (
            <a
              href={`https://music.youtube.com/watch?v=${track.videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md text-fuchsia-300 hover:bg-fuchsia-500/10 transition-colors shrink-0"
              title="Abrir no YouTube Music"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}

          {/* Volume (mobile) */}
          <div className="relative sm:hidden shrink-0">
            <button
              onClick={() => setShowMobileVolume((v) => !v)}
              className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Volume"
            >
              {muted || settings.volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            {showMobileVolume && (
              <div className="absolute bottom-full right-0 mb-2 p-3 rounded-lg bg-[#05060f]/95 border border-cyan-500/20 backdrop-blur-xl shadow-xl">
                <div className="flex items-center gap-2">
                  <button onClick={toggleMute} className="p-1 text-slate-400 hover:text-slate-200 shrink-0">
                    {muted || settings.volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={muted ? 0 : (settings.volume ?? 80)}
                    onChange={(e) => handleVolume([Number(e.target.value)])}
                    className="w-32 h-1.5 accent-cyan-400 cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-slate-400 w-7 text-right">{muted ? 0 : (settings.volume ?? 80)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Barra de progresso (mobile) */}
        <div className="md:hidden px-3 pb-1">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-400 to-purple-400" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Indisponibilidade do YouTube (ambiente restrito) — honestidade (Etapa 7) */}
        {!playbackAvailable && track && (
          <div className="px-3 pb-1.5 flex items-center gap-1.5 text-[10px] text-amber-300">
            <AlertCircle className="w-3 h-3 shrink-0" /> Reprodução YouTube indisponível neste ambiente — use a aba URL (áudio direto) no Player de Música.
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="px-3 pb-1.5 flex items-center gap-1.5 text-[10px] text-rose-300">
            <AlertCircle className="w-3 h-3 shrink-0" /> {error}
          </div>
        )}
      </div>

      {/* Botão flutuante para reabrir o player (desktop) — aparece quando recolhido */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="flex fixed bottom-14 md:bottom-0 right-4 z-30 items-center gap-1.5 px-3 py-1.5 rounded-t-lg bg-[#0a0c1b] border border-b-0 border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/15 transition-colors"
          title="Mostrar player"
        >
          <ChevronUp className="w-4 h-4" />
          <Music2 className="w-4 h-4" />
        </button>
      )}
    </>
  );
}

function formatTime(secs) {
  if (!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}