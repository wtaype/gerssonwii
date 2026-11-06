// src/feature/encuesta-app/data/dataAppEncuesta.js
// 🌐 Servicio Firestore para /encuestas/app (Calificación de la App & Sugerencias en Tiempo Real)
// Colección: 'encuestas' | Documento: 'app' (/encuestas/app)
// Transacciones Atómicas Seguras: Consistencia 100%, Spark Tier Optimizado, Límite de Tamaño Protegido

import { db } from '@servicios/firebase.js';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import { guardarEncuestaAppLocal } from './cacheAppEncuesta.js';

export const COLECCION = 'encuestas';
export const DOCUMENTO = 'app';

const docRef = doc(db, COLECCION, DOCUMENTO);

const ESTRUCTURA_BASE = {
  total: 0,
  suma: 0,
  promedio: 0,
  distribucion: {
    '0': 0, '1': 0, '2': 0, '3': 0, '4': 0,
    '5': 0, '6': 0, '7': 0, '8': 0, '9': 0, '10': 0
  },
  feedbacks: []
};

/**
 * Genera un UID oficial único de Firebase sin llamadas de red
 */
export function generarIdFeedback() {
  return doc(collection(db, COLECCION)).id;
}

/**
 * Consulta manual del documento /encuestas/app
 */
export async function consultarEstadisticasApp() {
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) return snap.data();
    const data = {
      ...ESTRUCTURA_BASE,
      creado: serverTimestamp(),
      actualizado: serverTimestamp()
    };
    await setDoc(docRef, data, { merge: true });
    return data;
  } catch (err) {
    console.warn('[Firestore App Encuesta] Error al consultar:', err?.message || err);
    return ESTRUCTURA_BASE;
  }
}

/**
 * Envío de Calificación y Comentario vía Transacción Atómica en /encuestas/app
 * @param {Object} param0
 * @param {number|string} param0.calificacion - Valor de 0 a 10
 * @param {string} [param0.comentario] - Texto opcional de sugerencia/mejora
 */
export async function enviarFeedbackApp({ calificacion, comentario = '' }) {
  const calificacionNum = Math.max(0, Math.min(10, Math.round(Number(calificacion))));
  const comentarioLimpio = String(comentario || '').trim().slice(0, 300);
  const nuevoId = generarIdFeedback();
  const fechaIso = new Date().toISOString();

  const nuevoFeedbackItem = {
    id: nuevoId,
    calificacion: calificacionNum,
    comentario: comentarioLimpio,
    fecha: fechaIso
  };

  try {
    let resultadoFinal = null;

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(docRef);
      const data = snap.exists() ? { ...snap.data() } : { ...ESTRUCTURA_BASE };

      const totalActual = Math.max(0, Number(data.total) || 0) + 1;
      const sumaActual = Math.max(0, Number(data.suma) || 0) + calificacionNum;
      const promedioActual = Number((sumaActual / totalActual).toFixed(1));

      // Actualizar conteo de la distribución
      const distribucion = { ...ESTRUCTURA_BASE.distribucion, ...(data.distribucion || {}) };
      const clavePuntaje = String(calificacionNum);
      distribucion[clavePuntaje] = (Number(distribucion[clavePuntaje]) || 0) + 1;

      // Mantener los últimos 100 comentarios detallados para no inflar el documento
      const listaFeedbacks = Array.isArray(data.feedbacks) ? [...data.feedbacks] : [];
      listaFeedbacks.unshift(nuevoFeedbackItem);
      if (listaFeedbacks.length > 100) {
        listaFeedbacks.length = 100;
      }

      data.total = totalActual;
      data.suma = sumaActual;
      data.promedio = promedioActual;
      data.distribucion = distribucion;
      data.feedbacks = listaFeedbacks;
      data.actualizado = serverTimestamp();

      transaction.set(docRef, data, { merge: true });

      resultadoFinal = {
        total: totalActual,
        promedio: promedioActual,
        distribucion
      };
    });

    // Guardar confirmación en localStorage para evitar re-prompt
    guardarEncuestaAppLocal({ calificacion: calificacionNum, comentario: comentarioLimpio });

    return { success: true, item: nuevoFeedbackItem, stats: resultadoFinal };
  } catch (err) {
    console.warn('[Firestore App Encuesta] Transacción fallida, guardando localmente:', err?.message || err);
    guardarEncuestaAppLocal({ calificacion: calificacionNum, comentario: comentarioLimpio });
    return { success: true, item: nuevoFeedbackItem, error: err?.message };
  }
}
