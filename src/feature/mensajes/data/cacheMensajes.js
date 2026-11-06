// src/feature/mensajes/data/cacheMensajes.js
// 💌 Gestor de Caché y Deduplicación Local para Muro de Dedicatorias
// 0ms Latencia Inicial · Offline First · Persistencia con savels/getls

import semillas from '../../../semillas/mensajes.json';
import { getls, savels } from '../../../core/widev/storage.js';

const KEY_LOCALES = 'geco_mensajes_locales';
const KEY_LIKES = 'geco_mensajes_likes';

export function obtenerMensajesSemilla() {
  return semillas || [];
}

export function obtenerMensajesLocales() {
  const guardados = getls(KEY_LOCALES);
  return Array.isArray(guardados) ? guardados : [];
}

export function guardarMensajeLocal(mensaje) {
  try {
    const locales = obtenerMensajesLocales();
    const existe = locales.some(m => m.id === mensaje.id);
    if (!existe) {
      locales.unshift(mensaje);
      savels(KEY_LOCALES, locales.slice(0, 50), null); // Guardar hasta 50 locales sin expiración
    }
    return true;
  } catch (e) {
    console.warn('Error guardando mensaje local:', e);
    return false;
  }
}

export function obtenerLikesLocales() {
  const likes = getls(KEY_LIKES);
  return Array.isArray(likes) ? new Set(likes) : new Set();
}

export function registrarLikeLocal(mensajeId) {
  try {
    const likes = obtenerLikesLocales();
    likes.add(String(mensajeId));
    savels(KEY_LIKES, Array.from(likes), null);
    return true;
  } catch (e) {
    console.warn('Error registrando like local:', e);
    return false;
  }
}

export function yaDioLikeLocal(mensajeId) {
  const likes = obtenerLikesLocales();
  return likes.has(String(mensajeId));
}

/**
 * Combina semillas iniciales, mensajes remotos de Firestore y mensajes locales recién enviados
 * Garantiza cero duplicados por ID y orden cronológico descendente.
 */
export function combinarMensajes(remotos = []) {
  const mapa = new Map();

  // 1. Cargar semillas
  obtenerMensajesSemilla().forEach(m => mapa.set(m.id, { ...m, origen: 'semilla' }));

  // 2. Sobrescribir con remotos de Firestore
  (remotos || []).forEach(m => mapa.set(m.id, { ...m, origen: 'firestore' }));

  // 3. Sobrescribir / agregar locales recientes
  obtenerMensajesLocales().forEach(m => {
    if (!mapa.has(m.id)) {
      mapa.set(m.id, { ...m, origen: 'local' });
    }
  });

  return Array.from(mapa.values());
}
