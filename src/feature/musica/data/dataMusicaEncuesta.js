// src/feature/musica/data/dataMusicaEncuesta.js
// 🌐 Servicio Firestore para /encuestas/musica (Preferencias Musicales en Tiempo Real)
// Transacciones Atómicas Seguras: Cero Inconsistencias, Spark Tier Optimizado

import { db } from '@servicios/firebase.js';
import {
  doc,
  getDoc,
  setDoc,
  runTransaction,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { OPCIONES_MUSICA_ENCUESTA } from './cacheMusicaEncuesta.js';

export const COLECCION = 'encuestas';
export const DOCUMENTO = 'musica';

const docRef = doc(db, COLECCION, DOCUMENTO);

const ESTRUCTURA_BASE = {
  alabanza: 0,
  adoracion: 0,
  festivas: 0,
  instrumental: 0,
  todas: 0,
  total: 0
};

/**
 * Escucha en tiempo real el documento único /encuestas/musica
 */
export function escucharMusicaEncuesta(onData) {
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
    (err) => console.warn('[Firestore Musica Encuesta] Escucha en espera:', err?.message || err)
  );
}

/**
 * Consulta manual del documento /encuestas/musica
 */
export async function consultarMusicaEncuesta() {
  const snap = await getDoc(docRef);
  if (snap.exists()) return snap.data();
  const data = { ...ESTRUCTURA_BASE, creado: serverTimestamp(), actualizado: serverTimestamp() };
  await setDoc(docRef, data, { merge: true });
  return data;
}

/**
 * Voto Seguro vía Transacción Atómica
 */
export async function votarMusicaRemoto({ opcionId, opcionAnteriorId = null }) {
  if (!opcionId) return;

  try {
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(docRef);
      const data = snap.exists() ? { ...snap.data() } : { ...ESTRUCTURA_BASE };

      if (opcionAnteriorId && opcionAnteriorId !== opcionId) {
        data[opcionAnteriorId] = Math.max(0, (Number(data[opcionAnteriorId]) || 0) - 1);
      }

      data[opcionId] = Math.max(0, (Number(data[opcionId]) || 0)) + 1;

      data.total = OPCIONES_MUSICA_ENCUESTA.reduce((acc, opt) => {
        const val = Math.max(0, Number(data[opt.id]) || 0);
        data[opt.id] = val;
        return acc + val;
      }, 0);

      data.actualizado = serverTimestamp();

      transaction.set(docRef, data, { merge: true });
    });
  } catch (err) {
    console.warn('[Firestore votarMusicaRemoto] Error en transacción:', err?.message || err);
  }
}

/**
 * Revierte el voto del usuario de forma segura
 */
export async function revertirMusicaRemoto(opcionAnteriorId) {
  if (!opcionAnteriorId) return;

  try {
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists()) return;

      const data = { ...snap.data() };
      data[opcionAnteriorId] = Math.max(0, (Number(data[opcionAnteriorId]) || 0) - 1);

      data.total = OPCIONES_MUSICA_ENCUESTA.reduce((acc, opt) => {
        const val = Math.max(0, Number(data[opt.id]) || 0);
        data[opt.id] = val;
        return acc + val;
      }, 0);

      data.actualizado = serverTimestamp();
      transaction.set(docRef, data, { merge: true });
    });
  } catch (err) {
    console.warn('[Firestore revertirMusicaRemoto] Error:', err?.message || err);
  }
}
