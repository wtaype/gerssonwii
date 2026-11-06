// src/feature/lugar/data/cacheAsistencia.js
// ⚡ Capa de Caché Ultrarrápida y Síncrona para la Encuesta de Asistencia (/encuestas/asistencia)
// 100% Datos en Vivo · Cero Latencia · Persistencia en localStorage

import { leerStorage, escribirStorage, borrarStorage } from '@widev/storage.js';

export const CLAVE_VOTOS = 'geco_asistencia_v1_votes';
export const CLAVE_USUARIO = 'geco_asistencia_v1_user';
export const CLAVE_TIMESTAMP = 'geco_asistencia_v1_ts';

export const OPCIONES_ASISTENCIA = [
  {
    id: 'confirmo',
    titulo: '¡Confirmo con alegría! 🎉',
    descripcion: 'Puntual para celebrar y cantar',
    icono: 'fa-circle-check',
    color: 'var(--mco)',
    feedback: '🎉 ¡Gloria a Dios! Tu lugar en la mesa y en la fiesta está reservadísimo. ¡Nos vemos el sábado!'
  },
  {
    id: 'recontra',
    titulo: '¡Ahí estaré de todas maneras! 🥳',
    descripcion: 'Con ganas de cena y buffet',
    icono: 'fa-utensils',
    color: '#f59e0b',
    feedback: '🍽️ ¡Prepárate para una noche de rica cena, torta y bendiciones al máximo!'
  },
  {
    id: 'tarde',
    titulo: 'Llego un poquito tarde ⏰',
    descripcion: 'Pero con toda la energía viva',
    icono: 'fa-bolt',
    color: '#3b82f6',
    feedback: '⏰ ¡Te esperamos con los brazos abiertos cuando llegues! ¡La fiesta durará hasta tarde!'
  },
  {
    id: 'gato',
    titulo: 'No podré, mi gato está solito 🐱',
    descripcion: 'Cosas que pasan jajaja',
    icono: 'fa-cat',
    color: '#ec4899',
    feedback: '🐱 jajaja ¡Dale un abrazo a tu gatito de nuestra parte! Te extrañaremos mucho bro.'
  },
  {
    id: 'oracion',
    titulo: 'No podré pero les bendigo 🙏',
    descripcion: 'De corazón presente',
    icono: 'fa-hands-praying',
    color: '#10b981',
    feedback: '🙏 ¡Amén! Sentiremos tu cariño y oración a la distancia. ¡Que Dios te bendiga mucho!'
  }
];

export const VOTOS_BASE_ASISTENCIA = OPCIONES_ASISTENCIA.map(() => 0);
export const FEEDBACK_MSGS_ASISTENCIA = OPCIONES_ASISTENCIA.map((o) => o.feedback);

export function obtenerEstadoLocalAsistencia() {
  let votos = [...VOTOS_BASE_ASISTENCIA];
  let usuarioEleccion = null;

  try {
    const guardados = leerStorage(CLAVE_VOTOS, null);
    if (Array.isArray(guardados) && guardados.length === OPCIONES_ASISTENCIA.length) {
      votos = guardados.map((v) => Math.max(0, Number(v) || 0));
    }

    const userSaved = leerStorage(CLAVE_USUARIO, null);
    if (userSaved !== null && !isNaN(Number(userSaved))) {
      const idx = Number(userSaved);
      if (idx >= 0 && idx < OPCIONES_ASISTENCIA.length) {
        usuarioEleccion = idx;
      }
    }
  } catch {
    votos = [...VOTOS_BASE_ASISTENCIA];
  }

  const total = votos.reduce((a, b) => a + b, 0);
  return { votos, usuarioEleccion, total };
}

export function guardarVotoLocalAsistencia(opcionIndex) {
  const { votos, usuarioEleccion } = obtenerEstadoLocalAsistencia();

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

export function revertirVotoLocalAsistencia() {
  const { votos, usuarioEleccion } = obtenerEstadoLocalAsistencia();

  if (usuarioEleccion !== null && usuarioEleccion >= 0 && usuarioEleccion < votos.length) {
    votos[usuarioEleccion] = Math.max(0, votos[usuarioEleccion] - 1);
  }

  borrarStorage(CLAVE_USUARIO);
  escribirStorage(CLAVE_VOTOS, votos);

  const total = votos.reduce((a, b) => a + b, 0);
  return { votos, usuarioEleccion: null, total };
}

export function sincronizarDesdeFirestoreAsistencia(datosFirestore) {
  if (!datosFirestore) return obtenerEstadoLocalAsistencia();

  const { usuarioEleccion } = obtenerEstadoLocalAsistencia();
  const votos = OPCIONES_ASISTENCIA.map((opt) => Math.max(0, Number(datosFirestore[opt.id]) || 0));
  const total = votos.reduce((a, b) => a + b, 0);

  escribirStorage(CLAVE_VOTOS, votos);
  escribirStorage(CLAVE_TIMESTAMP, Date.now());

  return { votos, usuarioEleccion, total };
}

export function calcularPorcentajesAsistencia(votos, total) {
  if (!total || total === 0) return votos.map(() => 0);
  return votos.map((v) => Math.round((v / total) * 100));
}
