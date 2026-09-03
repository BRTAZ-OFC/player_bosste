import React from 'react';
import { Label } from '@/components/ui/label';
import { Mic2 } from 'lucide-react';
import { loadMusicSettings, saveMusicSettings } from '@/lib/music/musicSettings';
import { isDuckingEnabled, getDuckingLevel, setDuckingEnabled, setDuckingLevel } from '@/lib/music/ttsMusicIntegration';

export default function MusicOverlayConfig() {
  const [overlay, setOverlay] = React.useState(() => loadMusicSettings().overlay);
  const [duckEnabled, setDuckEnabled] = React.useState(isDuckingEnabled());
  const [duckLevel, setDuckLevelState] = React.useState(getDuckingLevel());

  function updateOverlay(patch) {
    const next = { ...overlay, ...patch };
    setOverlay(next);
    const s = loadMusicSettings();
    s.overlay = next;
    saveMusicSettings(s);
  }

  function toggleDucking() {
    const next = !duckEnabled;
    setDuckEnabled(next);
    setDuckingEnabled(next);
  }

  function changeDuckLevel(v) {
    setDuckLevelState(v);
    setDuckingLevel(v);
  }

  return (
    <div className="space-y-3">
      {/* Ducking TTS × Música */}
      <div className="space-y-2 p-2 rounded-lg bg-purple-500/5 border border-purple-500/15">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Mic2 className="w-3.5 h-3.5 text-purple-300" />
            <Label className="text-[11px] text-purple-300 font-mono">Ducking TTS × Música</Label>
          </div>
          <button
            onClick={toggleDucking}
            className={`w-2 h-2 rounded-full transition-colors ${duckEnabled ? 'bg-purple-400' : 'bg-slate-600'}`}
          />
        </div>
        <p className="text-[10px] text-slate-400 leading-tight">
          Reduz automaticamente o volume da música quando o TTS está falando e restaura após o término.
        </p>
        {duckEnabled && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] text-slate-500">Volume durante TTS</Label>
              <span className="text-[10px] font-mono text-purple-300">{Math.round(duckLevel * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={0.8}
              step={0.05}
              value={duckLevel}
              onChange={(e) => changeDuckLevel(Number(e.target.value))}
              className="w-full h-1 accent-purple-400 cursor-pointer"
            />
          </div>
        )}
      </div>

      <div className="space-y-2 pt-0">
        <Label className="text-xs text-slate-400 font-mono">Overlay de Música</Label>

        {/* Toggles */}
        <div className="grid grid-cols-2 gap-1.5">
          <Toggle label="Capa" value={overlay.showArt} onChange={(v) => updateOverlay({ showArt: v })} />
          <Toggle label="Artista" value={overlay.showArtist} onChange={(v) => updateOverlay({ showArtist: v })} />
          <Toggle label="Álbum" value={overlay.showAlbum} onChange={(v) => updateOverlay({ showAlbum: v })} />
          <Toggle label="Progresso" value={overlay.showProgress} onChange={(v) => updateOverlay({ showProgress: v })} />
        </div>

        {/* Posição */}
        <div className="space-y-1">
          <Label className="text-[10px] text-slate-500">Posição</Label>
          <div className="grid grid-cols-4 gap-1">
            {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((pos) => (
              <button
                key={pos}
                onClick={() => updateOverlay({ position: pos })}
                className={`px-1.5 py-1 rounded-md text-[9px] font-mono transition-colors ${
                  overlay.position === pos ? 'bg-cyan-500/15 text-cyan-300' : 'text-slate-400 hover:text-slate-200 bg-white/5'
                }`}
              >
                {pos === 'top-left' ? '↖' : pos === 'top-right' ? '↗' : pos === 'bottom-left' ? '↙' : '↘'}
              </button>
            ))}
          </div>
        </div>

        {/* Tamanho */}
        <div className="space-y-1">
          <Label className="text-[10px] text-slate-500">Tamanho</Label>
          <div className="grid grid-cols-3 gap-1">
            {['sm', 'md', 'lg'].map((sz) => (
              <button
                key={sz}
                onClick={() => updateOverlay({ size: sz })}
                className={`px-1.5 py-1 rounded-md text-[10px] font-mono transition-colors ${
                  overlay.size === sz ? 'bg-cyan-500/15 text-cyan-300' : 'text-slate-400 hover:text-slate-200 bg-white/5'
                }`}
              >
                {sz === 'sm' ? 'P' : sz === 'md' ? 'M' : 'G'}
              </button>
            ))}
          </div>
        </div>

        {/* Marquee speed */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-slate-500">Velocidade do marquee</Label>
            <span className="text-[10px] font-mono text-cyan-300">{overlay.marqueeSpeed}s</span>
          </div>
          <input
            type="range"
            min={10}
            max={60}
            step={5}
            value={overlay.marqueeSpeed}
            onChange={(e) => updateOverlay({ marqueeSpeed: Number(e.target.value) })}
            className="w-full h-1 accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Opacidade */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-slate-500">Transparência do fundo</Label>
            <span className="text-[10px] font-mono text-cyan-300">{Math.round(overlay.opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={overlay.opacity}
            onChange={(e) => updateOverlay({ opacity: Number(e.target.value) })}
            className="w-full h-1 accent-cyan-400 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`flex items-center justify-between px-2 py-1.5 rounded-md text-[10px] transition-colors ${
        value ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20' : 'bg-white/5 text-slate-400 border border-white/10'
      }`}
    >
      {label}
      <span className={`w-2 h-2 rounded-full ${value ? 'bg-cyan-400' : 'bg-slate-600'}`} />
    </button>
  );
}