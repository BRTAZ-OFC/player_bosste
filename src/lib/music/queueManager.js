// Gerenciador de fila de reprodução — controla ordem, repeat e shuffle.
// Não depende do player diretamente; o player consulta este módulo.

import { playerEvents } from './playerEvents';

class QueueManager {
  constructor() {
    this.queue = [];
    this.currentIndex = -1;
    this.history = []; // índices já tocados (para "anterior")
  }

  get current() {
    return this.currentIndex >= 0 && this.currentIndex < this.queue.length
      ? this.queue[this.currentIndex]
      : null;
  }

  get length() {
    return this.queue.length;
  }

  // Substitui a fila inteira (ex: clicou em uma playlist/álbum)
  setQueue(tracks, startIndex = 0) {
    this.queue = [...tracks];
    this.currentIndex = startIndex;
    this.history = [];
    playerEvents.emit('queue_changed', this.getQueue());
  }

  // Adiciona uma faixa ao final da fila
  add(track) {
    this.queue.push(track);
    playerEvents.emit('queue_changed', this.getQueue());
  }

  // Adiciona uma faixa logo após a atual (próxima posição)
  addNext(track) {
    const insertAt = this.currentIndex + 1;
    this.queue.splice(insertAt, 0, track);
    playerEvents.emit('queue_changed', this.getQueue());
  }

  // Remove uma faixa por índice
  remove(index) {
    if (index < 0 || index >= this.queue.length) return;
    this.queue.splice(index, 1);
    if (index < this.currentIndex) {
      this.currentIndex--;
    } else if (index === this.currentIndex) {
      // Removeu a faixa atual — índice aponta para a próxima (mesma posição)
    }
    if (this.queue.length === 0) this.currentIndex = -1;
    playerEvents.emit('queue_changed', this.getQueue());
  }

  // Reordena: move uma faixa de fromIndex para toIndex
  move(fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= this.queue.length) return;
    if (toIndex < 0 || toIndex >= this.queue.length) return;
    if (fromIndex === toIndex) return;
    const [item] = this.queue.splice(fromIndex, 1);
    this.queue.splice(toIndex, 0, item);
    // Ajusta o índice atual
    if (this.currentIndex === fromIndex) {
      this.currentIndex = toIndex;
    } else if (fromIndex < this.currentIndex && toIndex >= this.currentIndex) {
      this.currentIndex--;
    } else if (fromIndex > this.currentIndex && toIndex <= this.currentIndex) {
      this.currentIndex++;
    }
    playerEvents.emit('queue_changed', this.getQueue());
  }

  // Limpa a fila inteira
  clear() {
    this.queue = [];
    this.currentIndex = -1;
    this.history = [];
    playerEvents.emit('queue_changed', []);
  }

  // Avança para a próxima faixa conforme repeat/shuffle
  next(repeat = 'off', shuffle = false) {
    if (this.queue.length === 0) return null;

    // Repeat one: mesma faixa
    if (repeat === 'one' && this.currentIndex >= 0) {
      return this.queue[this.currentIndex];
    }

    if (this.currentIndex >= 0) this.history.push(this.currentIndex);

    let nextIndex;
    if (shuffle && this.queue.length > 1) {
      // Escolhe um índice aleatório diferente do atual
      do {
        nextIndex = Math.floor(Math.random() * this.queue.length);
      } while (nextIndex === this.currentIndex);
    } else {
      nextIndex = this.currentIndex + 1;
    }

    // Fim da fila + repeat all: volta ao início
    if (nextIndex >= this.queue.length) {
      if (repeat === 'all') {
        nextIndex = 0;
      } else {
        return null; // fila acabou
      }
    }

    this.currentIndex = nextIndex;
    return this.queue[this.currentIndex];
  }

  // Volta para a faixa anterior
  prev() {
    if (this.queue.length === 0) return null;
    if (this.history.length > 0) {
      this.currentIndex = this.history.pop();
      return this.queue[this.currentIndex];
    }
    // Sem histórico: volta um índice
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return this.queue[this.currentIndex];
    }
    return this.queue[0]; // já no início
  }

  // Pula diretamente para um índice específico (clicar na fila)
  jumpTo(index) {
    if (index < 0 || index >= this.queue.length) return null;
    if (this.currentIndex >= 0) this.history.push(this.currentIndex);
    this.currentIndex = index;
    return this.queue[this.currentIndex];
  }

  getQueue() {
    return this.queue.map((t, i) => ({ ...t, _index: i, _current: i === this.currentIndex }));
  }
}

export const queueManager = new QueueManager();