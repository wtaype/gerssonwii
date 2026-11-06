// src/feature/musica/lib/audioManager.js
// 🎵 Gestor de Audio Global Persistente para CumpleWii (Gersson Collantes 2026)
// 100% Cero Dependencias Externas · Persistencia SPA con Astro ClientRouter
// Soporte Completo MediaSession API (Controles nativos Android, iOS y Windows)

import playlistData from '../../../semillas/musica.json';
import { app } from '../../../wii.js';
import { savels, getls } from '../../../core/widev/storage.js';
import { Mensaje } from '../../../core/widev/mensajes.js';

class AudioManager {
  constructor() {
    this.playlist = (playlistData || []).map((t, idx) => ({
      id: t.id || idx + 1,
      titulo: t.titulo || `Pista ${idx + 1}`,
      artista: t.artista || 'Gersson Collantes',
      duracion: t.duracion || '--:--',
      peso: t.peso || '',
      categoria: t.categoria || 'cumpleanos',
      icono: t.icono || 'fa-music',
      color: t.color || 'var(--mco)',
      audioUrl: t.audioUrl || ''
    }));

    this.currentIndex = 0;
    this.isPlaying = false;
    this.isShuffle = false;
    this.repeatMode = 'all'; // 'off' | 'all' | 'one'
    this.volume = 0.85;
    this.favorites = new Set();
    this.listeners = new Set();
    this.isInitialized = false;

    // 1. Restaurar preferencias locales (sin vencimiento)
    if (typeof localStorage !== 'undefined') {
      try {
        const savedLikes = getls('musicaLikes');
        if (Array.isArray(savedLikes)) {
          this.favorites = new Set(savedLikes.map(String));
        }

        const savedIndex = getls('becawii_last_track_idx');
        if (savedIndex !== null && !isNaN(savedIndex) && Number(savedIndex) >= 0 && Number(savedIndex) < this.playlist.length) {
          this.currentIndex = Number(savedIndex);
        }

        const savedRepeat = getls('becawii_repeat_mode');
        if (savedRepeat === 'one' || savedRepeat === 'off') {
          this.repeatMode = savedRepeat;
        } else {
          this.repeatMode = 'all'; // Loop continuo activado por defecto
          savels('becawii_repeat_mode', 'all', null);
        }

        const savedVol = getls('becawii_audio_volume');
        if (savedVol !== null && !isNaN(savedVol)) {
          this.volume = Math.max(0, Math.min(1, Number(savedVol)));
        }
      } catch (e) {
        console.warn('AudioManager: aviso leyendo storage inicial', e);
      }
    }

    // 2. Instancia persistente en memoria global del navegador
    if (typeof window !== 'undefined') {
      if (!window.__becawiiNativeAudio) {
        window.__becawiiNativeAudio = new Audio();
        window.__becawiiNativeAudio.preload = 'metadata';
      }
      this.audio = window.__becawiiNativeAudio;
      this.audio.volume = this.volume;
      this._inicializarEventosAudio();
    } else {
      this.audio = null;
    }
  }

  _inicializarEventosAudio() {
    if (!this.audio || this.isInitialized) return;
    this.isInitialized = true;

    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.actualizarMediaSession();
      this.notificar('playState', { isPlaying: true });
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.actualizarMediaSession();
      this.notificar('playState', { isPlaying: false });
    });

    this.audio.addEventListener('loadedmetadata', () => {
      const dur = this.audio.duration || 0;
      this.notificar('metadata', { duration: dur, currentTime: this.audio.currentTime });
    });

    this.audio.addEventListener('timeupdate', () => {
      if (!this.audio) return;
      const dur = this.audio.duration || 0;
      this.notificar('timeUpdate', {
        currentTime: this.audio.currentTime,
        duration: dur,
        progressPct: dur > 0 ? (this.audio.currentTime / dur) * 100 : 0
      });
    });

    this.audio.addEventListener('ended', () => {
      if (this.repeatMode === 'one') {
        this.audio.currentTime = 0;
        this.reproducir();
      } else {
        const isLast = this.currentIndex === this.playlist.length - 1;
        if (isLast && this.repeatMode === 'off' && !this.isShuffle) {
          this.pausar();
          this.audio.currentTime = 0;
        } else {
          this.siguiente();
        }
      }
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('Error en reproducción de audio:', e);
    });

    // Cargar pista inicial sin autoplay forzado
    if (!this.audio.src && this.playlist[this.currentIndex]) {
      this.audio.src = this.playlist[this.currentIndex].audioUrl;
      this.audio.load();
    }

    this.actualizarMediaSession();
  }

  getPistaActual() {
    return this.playlist[this.currentIndex] || null;
  }

  actualizarMediaSession() {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const pista = this.getPistaActual();
    if (!pista) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: pista.titulo,
        artist: pista.artista,
        album: `CumpleWii 2026 • Gersson Collantes`,
        artwork: [
          { src: '/avatar-oficial.jpg', sizes: '512x512', type: 'image/jpeg' },
          { src: '/diosesamor.png', sizes: '512x512', type: 'image/png' }
        ]
      });

      navigator.mediaSession.playbackState = this.isPlaying ? 'playing' : 'paused';

      navigator.mediaSession.setActionHandler('play', () => this.reproducir());
      navigator.mediaSession.setActionHandler('pause', () => this.pausar());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.anterior());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.siguiente());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== null && details.seekTime !== undefined) {
          this.seek(details.seekTime);
        }
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const skip = details.seekOffset || 10;
        this.seek(Math.max((this.audio?.currentTime || 0) - skip, 0));
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const skip = details.seekOffset || 10;
        this.seek(Math.min((this.audio?.currentTime || 0) + skip, this.audio?.duration || 0));
      });
    } catch (e) {
      console.warn('MediaSession aviso:', e);
    }
  }

  suscribir(callback) {
    if (typeof callback === 'function') {
      this.listeners.add(callback);
      try {
        const estadoActual = this.getEstado();
        callback('init', estadoActual, estadoActual);
      } catch (e) {
        console.error('Error en callback de audio:', e);
      }
    }
    return () => this.listeners.delete(callback);
  }

  notificar(evento, datos) {
    const estado = this.getEstado();
    this.listeners.forEach((cb) => {
      try {
        cb(evento, datos, estado);
      } catch (e) {
        console.error('Error notificando a listener de audio:', e);
      }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('geco:audio-update', {
        detail: { evento, datos, estado }
      }));
    }
  }

  getEstado() {
    const pistaActual = this.getPistaActual();
    return {
      pista: pistaActual,
      indice: this.currentIndex,
      isPlaying: this.isPlaying,
      isShuffle: this.isShuffle,
      repeatMode: this.repeatMode,
      volume: this.volume,
      favorites: Array.from(this.favorites),
      totalFavorites: this.favorites.size,
      isCurrentFavorite: pistaActual ? this.esFavorito(pistaActual.id) : false,
      currentTime: this.audio ? this.audio.currentTime : 0,
      duration: this.audio && !isNaN(this.audio.duration) ? this.audio.duration : 0
    };
  }

  cargarPista(index, autoPlay = false) {
    if (index < 0 || index >= this.playlist.length) return;
    const pista = this.playlist[index];
    const yaTieneMismoSrc = this.audio && this.audio.src && this.audio.src.includes(pista.audioUrl);
    this.currentIndex = index;

    savels('becawii_last_track_idx', index, null);

    if (this.audio) {
      if (!yaTieneMismoSrc) {
        this.audio.src = pista.audioUrl;
      }
      if (autoPlay) {
        this.reproducir().catch(() => {
          if (typeof window !== 'undefined' && !window.__gecoAutoplayBound) {
            window.__gecoAutoplayBound = true;
            const unlockAudio = () => {
              window.__gecoAutoplayBound = false;
              if (this.currentIndex === index && !this.isPlaying && this.audio) {
                this.reproducir();
              }
            };
            window.addEventListener('pointerdown', unlockAudio, { once: true });
            window.addEventListener('keydown', unlockAudio, { once: true });
          }
        });
      }
    }

    this.actualizarMediaSession();
    this.notificar('trackChange', { pista, indice: index });
  }

  reproducir() {
    if (!this.audio) return Promise.resolve();
    if (!this.audio.src && this.playlist[this.currentIndex]) {
      this.audio.src = this.playlist[this.currentIndex].audioUrl;
    }

    return this.audio.play().then(() => {
      this.isPlaying = true;
      this.actualizarMediaSession();
      this.notificar('playState', { isPlaying: true });
    }).catch((err) => {
      this.isPlaying = false;
      this.actualizarMediaSession();
      this.notificar('playState', { isPlaying: false });
      throw err;
    });
  }

  pausar() {
    if (!this.audio) return;
    this.audio.pause();
    this.isPlaying = false;
    this.actualizarMediaSession();
    this.notificar('playState', { isPlaying: false });
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pausar();
    } else {
      this.reproducir();
    }
  }

  siguiente() {
    let sig = this.currentIndex + 1;
    if (this.isShuffle) {
      sig = Math.floor(Math.random() * this.playlist.length);
    } else if (sig >= this.playlist.length) {
      sig = 0;
    }
    this.cargarPista(sig, true);
  }

  anterior() {
    let prev = this.currentIndex - 1;
    if (prev < 0) prev = this.playlist.length - 1;
    this.cargarPista(prev, true);
  }

  toggleShuffle() {
    this.isShuffle = !this.isShuffle;
    Mensaje(this.isShuffle ? 'Modo aleatorio activado 🔀' : 'Modo secuencial activado ➡', 'info');
    this.notificar('shuffleChange', { isShuffle: this.isShuffle });
    return this.isShuffle;
  }

  cycleRepeatMode() {
    if (this.repeatMode === 'off') {
      this.repeatMode = 'all';
      Mensaje('Repetir lista completa 🔁', 'info');
    } else if (this.repeatMode === 'all') {
      this.repeatMode = 'one';
      Mensaje('Repitiendo esta canción 🔂', 'info');
    } else {
      this.repeatMode = 'off';
      Mensaje('Repetición desactivada ➡', 'info');
    }
    savels('becawii_repeat_mode', this.repeatMode, null);
    this.notificar('repeatChange', { repeatMode: this.repeatMode });
    return this.repeatMode;
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, Number(vol)));
    if (this.audio) {
      this.audio.volume = this.volume;
    }
    savels('becawii_audio_volume', this.volume, null);
    this.notificar('volumeChange', { volume: this.volume });
    return this.volume;
  }

  getFavoritos() {
    return Array.from(this.favorites);
  }

  esFavorito(trackId) {
    if (!trackId) return false;
    return this.favorites.has(String(trackId));
  }

  toggleFavorito(trackId = null) {
    const id = trackId ? String(trackId) : String(this.getPistaActual()?.id);
    if (!id) return false;

    let isFav = false;
    if (this.favorites.has(id)) {
      this.favorites.delete(id);
      isFav = false;
      Mensaje('Eliminada de tus favoritas', 'info');
    } else {
      this.favorites.add(id);
      isFav = true;
      Mensaje('¡Agregada a tus favoritas! ❤️', 'success');
    }

    savels('musicaLikes', Array.from(this.favorites), null);

    this.notificar('favoriteChange', {
      trackId: id,
      isFavorite: isFav,
      totalFavorites: this.favorites.size
    });

    return isFav;
  }

  seek(segundos) {
    if (!this.audio) return;
    const dur = this.audio.duration;
    if (dur && !isNaN(dur) && dur > 0) {
      this.audio.currentTime = Math.max(0, Math.min(dur, segundos));
      this.notificar('timeUpdate', {
        currentTime: this.audio.currentTime,
        duration: dur,
        progressPct: (this.audio.currentTime / dur) * 100
      });
    } else {
      this.audio.currentTime = Math.max(0, segundos);
    }
  }
}

// Singleton global
export const audioManager = (function() {
  if (typeof window !== 'undefined') {
    if (!window.__becawiiAudioManager) {
      window.__becawiiAudioManager = new AudioManager();
    }
    return window.__becawiiAudioManager;
  }
  return new AudioManager();
})();
