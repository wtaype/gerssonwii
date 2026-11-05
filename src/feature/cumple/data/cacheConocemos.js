// src/feature/cumple/data/cacheConocemos.js
// ⚡ Capa de Caché Ultrarrápida y Síncrona para la Encuesta "¿De dónde nos conocemos?"
// 100% Datos Reales en Vivo - 5 Opciones Oficiales (Sin '/')

import encuestaSeed from '@semillas/encuesta.json';
import { leerStorage, escribirStorage, borrarStorage } from '@widev/storage.js';

export const CLAVE_VOTOS = 'geco_survey_v10_votes';
export const CLAVE_USUARIO = 'geco_survey_v10_user';
export const CLAVE_TIMESTAMP = 'geco_survey_v10_ts';

export const OPCIONES = Array.isArray(encuestaSeed.opciones) ? encuestaSeed.opciones : [];
export const VOTOS_BASE = OPCIONES.map(() => 0);
export const FEEDBACK_MSGS = OPCIONES.map((o) => o.feedback ?? '¡Gracias por responder!');

/**
 * Obtiene el estado actual local en 0ms
 * @returns {{ votos: number[], usuarioEleccion: number | null, total: number, opciones: any[] }}
 */
export function obtenerEstadoLocal() {
  let votos = [...VOTOS_BASE];
  let usuarioEleccion = null;

  try {
    const guardados = leerStorage(CLAVE_VOTOS, null);
    if (Array.isArray(guardados) && guardados.length === OPCIONES.length) {
      votos = guardados.map((v) => Math.max(0, Number(v) || 0));
    }

    const userSaved = leerStorage(CLAVE_USUARIO, null);
    if (userSaved !== null && !isNaN(Number(userSaved))) {
      const idx = Number(userSaved);
      if (idx >= 0 && idx < OPCIONES.length) {
        usuarioEleccion = idx;
      }
    }
  } catch {
    votos = [...VOTOS_BASE];
    usuarioEleccion = null;
  }

  const total = votos.reduce((acc, curr) => acc + curr, 0);

  return {
    votos,
    usuarioEleccion,
    total,
    opciones: OPCIONES
  };
}

/**
 * Guarda la elección local de forma optimista
 * @param {number} nuevoIdx
 * @returns {{ votos: number[], usuarioEleccion: number, total: number }}
 */
export function guardarVotoLocal(nuevoIdx) {
  const { votos, usuarioEleccion } = obtenerEstadoLocal();

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

/**
 * Revierte la elección actual del usuario
 * @returns {{ votos: number[], usuarioEleccion: null, total: number }}
 */
export function revertirVotoLocal() {
  const { votos, usuarioEleccion } = obtenerEstadoLocal();

  if (usuarioEleccion !== null) {
    votos[usuarioEleccion] = Math.max(0, (votos[usuarioEleccion] || 0) - 1);
    borrarStorage(CLAVE_USUARIO);
    escribirStorage(CLAVE_VOTOS, votos);
    escribirStorage(CLAVE_TIMESTAMP, Date.now());
  }

  const total = votos.reduce((acc, curr) => acc + curr, 0);

  return { votos, usuarioEleccion: null, total };
}

/**
 * Reconcilia los totales remotos provenientes de Firestore con la caché local
 * @param {Record<string, any>} mapaTotales - Objeto ej: { iglesia: 1, trabajo: 0, ... }
 * @returns {{ votos: number[], usuarioEleccion: number | null, total: number }}
 */
export function sincronizarDesdeFirestore(mapaTotales) {
  if (!mapaTotales || typeof mapaTotales !== 'object') {
    return obtenerEstadoLocal();
  }

  const { usuarioEleccion } = obtenerEstadoLocal();

  // Mapeamos los totales por ID de opción, asegurando que nunca sea menor a 0
  const votos = OPCIONES.map((opt) => {
    const valRemoto = Number(mapaTotales[opt.id]);
    return !isNaN(valRemoto) ? Math.max(0, valRemoto) : 0;
  });

  const total = votos.reduce((acc, curr) => acc + curr, 0);

  escribirStorage(CLAVE_VOTOS, votos);
  escribirStorage(CLAVE_TIMESTAMP, Date.now());

  return { votos, usuarioEleccion, total };
}

/**
 * Calcula porcentajes normalizados
 * @param {number[]} votos
 * @param {number} total
 * @returns {number[]}
 */
export function calcularPorcentajes(votos, total) {
  if (!total || total <= 0) {
    return votos.map(() => 0);
  }
  return votos.map((v) => Math.round((v / total) * 100));
}
