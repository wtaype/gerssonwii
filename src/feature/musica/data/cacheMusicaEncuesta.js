// src/feature/musica/data/cacheMusicaEncuesta.js
// ⚡ Capa de Caché Ultrarrápida y Síncrona para la Encuesta de Música (/encuestas/musica)
// 100% Datos en Vivo · Cero Latencia · Persistencia en localStorage

import { leerStorage, escribirStorage, borrarStorage } from '@widev/storage.js';

export const CLAVE_VOTOS = 'geco_musica_encuesta_v1_votes';
export const CLAVE_USUARIO = 'geco_musica_encuesta_v1_user';
export const CLAVE_TIMESTAMP = 'geco_musica_encuesta_v1_ts';

export const OPCIONES_MUSICA_ENCUESTA = [
  {
    id: 'alabanza',
    titulo: 'Alabanza & sintetizadores 🎹',
    descripcion: 'Jubileo, ritmo y energía',
    icono: 'fa-music',
    color: 'var(--mco)',
    feedback: '🎹 ¡Qué nivel! Los teclados y sintetizadores de Gersson sonarán a todo volumen en vivo.'
  },
  {
    id: 'adoracion',
    titulo: 'Adoración profunda y acústicos 🕊️',
    descripcion: 'Paz, gratitud y presencia divina',
    icono: 'fa-dove',
    color: '#3b82f6',
    feedback: '🕊️ ¡Hermoso! La adoración íntima que llena el corazón de paz y gratitud sincera.'
  },
  {
    id: 'festivas',
    titulo: 'Canciones para cantar a coro 🥳',
    descripcion: 'Abrazos, risas y júbilo',
    icono: 'fa-microphone',
    color: '#ec4899',
    feedback: '🎤 ¡A cantar con todo el corazón! Todos juntos entonando las mejores alabanzas.'
  },
  {
    id: 'instrumental',
    titulo: 'Música suave de fondo ☕',
    descripcion: 'Para conversar y cenar rico',
    icono: 'fa-mug-hot',
    color: '#10b981',
    feedback: '☕ ¡La mejor vibra para compartir anécdotas, fotos y una buena conversación!'
  },
  {
    id: 'todas',
    titulo: '¡Todo el playlist BecaWii! 🌟',
    descripcion: 'Las 25 canciones están de 10',
    icono: 'fa-star',
    color: '#f59e0b',
    feedback: '🌟 ¡Eres de los nuestros! El playlist BecaWii completo para celebrar toda la noche.'
  }
];

export const VOTOS_BASE_MUSICA = OPCIONES_MUSICA_ENCUESTA.map(() => 0);
export const FEEDBACK_MSGS_MUSICA = OPCIONES_MUSICA_ENCUESTA.map((o) => o.feedback);

export function obtenerEstadoLocalMusicaEncuesta() {
  let votos = [...VOTOS_BASE_MUSICA];
  let usuarioEleccion = null;

  try {
    const guardados = leerStorage(CLAVE_VOTOS, null);
    if (Array.isArray(guardados) && guardados.length === OPCIONES_MUSICA_ENCUESTA.length) {
      votos = guardados.map((v) => Math.max(0, Number(v) || 0));
    }

    const userSaved = leerStorage(CLAVE_USUARIO, null);
    if (userSaved !== null && !isNaN(Number(userSaved))) {
      const idx = Number(userSaved);
      if (idx >= 0 && idx < OPCIONES_MUSICA_ENCUESTA.length) {
        usuarioEleccion = idx;
      }
    }
  } catch {
    votos = [...VOTOS_BASE_MUSICA];
  }

  const total = votos.reduce((a, b) => a + b, 0);
  return { votos, usuarioEleccion, total };
}

export function guardarVotoLocalMusicaEncuesta(opcionIndex) {
  const { votos, usuarioEleccion } = obtenerEstadoLocalMusicaEncuesta();

  if (usuarioEleccion !== null && usuarioEleccion >= 0 && usuarioEleccion < votos.length) {
    votos[usuarioEleccion] = Math.max(0, votos[usuarioEleccion] - 1);
  }

  if (opcionIndex >= 0 && opcionIndex < votos.length) {
    votos[opcionIndex] = (votos[opcionIndex] || 0) + 1;
  }

  escribirStorage(CLAVE_VOTOS, votos);
  escribirStorage(CLAVE_USUARIO, opcionIndex);
  escribirStorage(CLAVE_TIMESTAMP, Date.now());

  const total = votos.reduce((a, b) => a + b, 0);
  return { votos, usuarioEleccion: opcionIndex, total };
}

export function revertirVotoLocalMusicaEncuesta() {
  const { votos, usuarioEleccion } = obtenerEstadoLocalMusicaEncuesta();

  if (usuarioEleccion !== null && usuarioEleccion >= 0 && usuarioEleccion < votos.length) {
    votos[usuarioEleccion] = Math.max(0, votos[usuarioEleccion] - 1);
  }

  borrarStorage(CLAVE_USUARIO);
  escribirStorage(CLAVE_VOTOS, votos);

  const total = votos.reduce((a, b) => a + b, 0);
  return { votos, usuarioEleccion: null, total };
}

export function sincronizarDesdeFirestoreMusicaEncuesta(datosFirestore) {
  if (!datosFirestore) return obtenerEstadoLocalMusicaEncuesta();

  const { usuarioEleccion } = obtenerEstadoLocalMusicaEncuesta();
  const votos = OPCIONES_MUSICA_ENCUESTA.map((opt) => Math.max(0, Number(datosFirestore[opt.id]) || 0));
  const total = votos.reduce((a, b) => a + b, 0);

  escribirStorage(CLAVE_VOTOS, votos);
  escribirStorage(CLAVE_TIMESTAMP, Date.now());

  return { votos, usuarioEleccion, total };
}

export function calcularPorcentajesMusicaEncuesta(votos, total) {
  if (!total || total === 0) return votos.map(() => 0);
  return votos.map((v) => Math.round((v / total) * 100));
}
