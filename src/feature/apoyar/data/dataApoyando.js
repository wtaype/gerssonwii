// src/feature/apoyar/data/dataApoyando.js
// 🌐 Servicio Firestore para /encuestas/apoyando (Documento Único Consolidado)
// Transacciones Seguras: Cero Números Negativos, Suma de Totales 100% Consistente

import { db } from '@servicios/firebase.js';
import {
  doc,
  getDoc,
  setDoc,
  runTransaction,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { OPCIONES_APOYO } from './cacheApoyando.js';

export const COLECCION = 'encuestas';
export const DOCUMENTO = 'apoyando';

const docRef = doc(db, COLECCION, DOCUMENTO);

const ESTRUCTURA_BASE = {
  oracion: 0,
  yape: 0,
  abrazo: 0,
  sorpresa: 0,
  charla: 0,
  total: 0
};

/**
 * Escucha en tiempo real el documento único /encuestas/apoyando
 * @param {(datos: Record<string, any>) => void} onData
 */
export function escucharApoyando(onData) {
  return onSnapshot(
    docRef,
    async (snap) => {
      if (snap.exists()) {
        onData(snap.data());
      } else {
        const data = { ...ESTRUCTURA_BASE, creado: serverTimestamp(), actualizado: serverTimestamp() };
        await setDoc(docRef, data, { merge: true });
        onData(data);
      }
    },
    (err) => console.warn('[Firestore Apoyando] Escucha en espera:', err?.message || err)
  );
}

/**
 * Consulta manual del documento /encuestas/apoyando
 */
export async function consultarApoyando() {
  const snap = await getDoc(docRef);
  if (snap.exists()) return snap.data();
  const data = { ...ESTRUCTURA_BASE, creado: serverTimestamp(), actualizado: serverTimestamp() };
  await setDoc(docRef, data, { merge: true });
  return data;
}

/**
 * Voto Seguro vía Transacción Atómica
 * @param {{ opcionId: string, opcionAnteriorId?: string | null }} params
 */
export async function votarApoyandoRemoto({ opcionId, opcionAnteriorId = null }) {
  if (!opcionId) return;

  try {
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(docRef);
      const data = snap.exists() ? { ...snap.data() } : { ...ESTRUCTURA_BASE };

      if (opcionAnteriorId && opcionAnteriorId !== opcionId) {
        data[opcionAnteriorId] = Math.max(0, (Number(data[opcionAnteriorId]) || 0) - 1);
      }

      data[opcionId] = Math.max(0, (Number(data[opcionId]) || 0)) + 1;

      data.total = OPCIONES_APOYO.reduce((acc, opt) => {
        const val = Math.max(0, Number(data[opt.id]) || 0);
        data[opt.id] = val;
        return acc + val;
      }, 0);

      data.actualizado = serverTimestamp();

      transaction.set(docRef, data, { merge: true });
    });
  } catch (err) {
    console.warn('[Firestore votarApoyando] Error en transacción:', err?.message || err);
  }
}

/**
 * Revierte el voto del usuario de forma segura
 * @param {string} opcionAnteriorId
 */
export async function revertirApoyandoRemoto(opcionAnteriorId) {
  if (!opcionAnteriorId) return;

  try {
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists()) return;

      const data = { ...snap.data() };
      data[opcionAnteriorId] = Math.max(0, (Number(data[opcionAnteriorId]) || 0) - 1);

      data.total = OPCIONES_APOYO.reduce((acc, opt) => {
        const val = Math.max(0, Number(data[opt.id]) || 0);
        data[opt.id] = val;
        return acc + val;
      }, 0);

      data.actualizado = serverTimestamp();

      transaction.set(docRef, data, { merge: true });
    });
  } catch (err) {
    console.warn('[Firestore revertirApoyando] Error en transacción:', err?.message || err);
  }
}
