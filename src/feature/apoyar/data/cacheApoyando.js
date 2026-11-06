// src/feature/apoyar/data/cacheApoyando.js
// ⚡ Capa de Caché Ultrarrápida y Síncrona para la Encuesta Divertida "¿Cómo apoyar a Gersson?"
// 100% Datos Reales en Vivo - 5 Opciones Divertidas

import { leerStorage, escribirStorage, borrarStorage } from '@widev/storage.js';

export const CLAVE_VOTOS = 'geco_apoyando_v10_votes';
export const CLAVE_USUARIO = 'geco_apoyando_v10_user';
export const CLAVE_TIMESTAMP = 'geco_apoyando_v10_ts';

export const OPCIONES_APOYO = [
  {
    id: 'oracion',
    titulo: 'Oración y bendición 🙏',
    descripcion: 'Amor espiritual puro',
    icono: 'fa-hands-praying',
    color: 'var(--mco)',
    feedback: '🙏 ¡Amén! La oración del justo puede mucho. ¡El mejor regalo espiritual de todos!'
  },
  {
    id: 'yape',
    titulo: 'Yape de cariño 💜',
    descripcion: 'Para el buffet y antojo',
    icono: 'fa-mobile-screen-button',
    color: 'var(--yape-primary)',
    feedback: '💜 ¡Qué rico! ¡El buffet, la torta y los proyectos musicales te lo agradecen con el corazón!'
  },
  {
    id: 'abrazo',
    titulo: 'Un abrazo fuerte 🫂',
    descripcion: 'Con foto y sonrisa',
    icono: 'fa-heart',
    color: '#ec4899',
    feedback: '🤗 ¡Ese abrazo rompecostillas quedará grabado para la historia! ¡Prepárate para la foto!'
  },
  {
    id: 'sorpresa',
    titulo: 'Regalo sorpresa 🎁',
    descripcion: 'Detalle con emoción',
    icono: 'fa-gift',
    color: '#f59e0b',
    feedback: '🎁 ¡Woooow! Me encantan las sorpresas, ¡qué emoción abrir ese paquete misterioso!'
  },
  {
    id: 'charla',
    titulo: 'Charlas y risas 😊',
    descripcion: 'Tiempo de calidad',
    icono: 'fa-comments',
    color: '#10b981',
    feedback: '☕ ¡Lo mejor de la vida! Compartir tiempo, música y risas sinceras no tiene precio.'
  }
];

export const VOTOS_BASE_APOYO = OPCIONES_APOYO.map(() => 0);
export const FEEDBACK_MSGS_APOYO = OPCIONES_APOYO.map((o) => o.feedback);

export function obtenerEstadoLocalApoyo() {
  let votos = [...VOTOS_BASE_APOYO];
  let usuarioEleccion = null;

  try {
    const guardados = leerStorage(CLAVE_VOTOS, null);
    if (Array.isArray(guardados) && guardados.length === OPCIONES_APOYO.length) {
      votos = guardados.map((v) => Math.max(0, Number(v) || 0));
    }

    const userSaved = leerStorage(CLAVE_USUARIO, null);
    if (userSaved !== null && !isNaN(Number(userSaved))) {
      const idx = Number(userSaved);
      if (idx >= 0 && idx < OPCIONES_APOYO.length) {
        usuarioEleccion = idx;
      }
    }
  } catch {
    votos = [...VOTOS_BASE_APOYO];
    usuarioEleccion = null;
  }

  const total = votos.reduce((acc, curr) => acc + curr, 0);

  return {
    votos,
    usuarioEleccion,
    total,
    opciones: OPCIONES_APOYO
  };
}

export function guardarVotoLocalApoyo(nuevoIdx) {
  const { votos, usuarioEleccion } = obtenerEstadoLocalApoyo();

  if (usuarioEleccion !== null && usuarioEleccion !== nuevoIdx) {
    votos[usuarioEleccion] = Math.max(0, (votos[usuarioEleccion] || 0) - 1);
  }

  if (usuarioEleccion !== nuevoIdx) {
    votos[nuevoIdx] = (votos[nuevoIdx] || 0) + 1;
  }

  const total = votos.reduce((acc, curr) => acc + curr, 0);

  escribirStorage(CLAVE_VOTOS, votos);
  escribirStorage(CLAVE_USUARIO, nuevoIdx);
  escribirStorage(CLAVE_TIMESTAMP, Date.now());

  return { votos, usuarioEleccion: nuevoIdx, total };
}

export function revertirVotoLocalApoyo() {
  const { votos, usuarioEleccion } = obtenerEstadoLocalApoyo();

  if (usuarioEleccion !== null) {
    votos[usuarioEleccion] = Math.max(0, (votos[usuarioEleccion] || 0) - 1);
    borrarStorage(CLAVE_USUARIO);
    escribirStorage(CLAVE_VOTOS, votos);
    escribirStorage(CLAVE_TIMESTAMP, Date.now());
  }

  const total = votos.reduce((acc, curr) => acc + curr, 0);

  return { votos, usuarioEleccion: null, total };
}

export function sincronizarDesdeFirestoreApoyo(mapaTotales) {
  if (!mapaTotales || typeof mapaTotales !== 'object') {
    return obtenerEstadoLocalApoyo();
  }

  const { usuarioEleccion } = obtenerEstadoLocalApoyo();

  const votos = OPCIONES_APOYO.map((opt) => {
    const valRemoto = Number(mapaTotales[opt.id]);
    return !isNaN(valRemoto) ? Math.max(0, valRemoto) : 0;
  });

  const total = votos.reduce((acc, curr) => acc + curr, 0);

  escribirStorage(CLAVE_VOTOS, votos);
  escribirStorage(CLAVE_TIMESTAMP, Date.now());

  return { votos, usuarioEleccion, total };
}

export function calcularPorcentajesApoyo(votos, total) {
  if (!total || total <= 0) {
    return votos.map(() => 0);
  }
  return votos.map((v) => Math.round((v / total) * 100));
}
