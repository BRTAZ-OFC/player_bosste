// Event emitter central do player de música — permite que outras partes do
// painel TTS reajam a eventos de reprodução sem acoplamento direto.

class PlayerEvents {
  constructor() {
    this.listeners = {};
  }

  on(event, cb) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
    return () => {
      this.listeners[event] = (this.listeners[event] || []).filter((c) => c !== cb);
    };
  }

  emit(event, data) {
    (this.listeners[event] || []).forEach((cb) => {
      try { cb(data); } catch { /* ignore listener errors */ }
    });
  }
}

export const playerEvents = new PlayerEvents();