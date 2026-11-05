// src/feature/cumple/data/dataConocemos.js
// 🌐 Servicio Firestore para /encuestas/conocemos (Documento Único Consolidado)
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
import { OPCIONES } from './cacheConocemos.js';

export const COLECCION = 'encuestas';
export const DOCUMENTO = 'conocemos';

const docRef = doc(db, COLECCION, DOCUMENTO);

const ESTRUCTURA_BASE = {
  iglesia: 0,
  trabajo: 0,
  estudios: 0,
  familia: 0,
  otro: 0,
  total: 0
};

/**
 * Escucha en tiempo real el documento único /encuestas/conocemos
 * @param {(datos: Record<string, any>) => void} onData
 */
export function escucharConocemos(onData) {
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
    (err) => console.warn('[Firestore] Escucha en espera:', err?.message || err)
  );
}

/**
 * Consulta manual del documento /encuestas/conocemos
 */
export async function consultarConocemos() {
  const snap = await getDoc(docRef);
  if (snap.exists()) return snap.data();
  const data = { ...ESTRUCTURA_BASE, creado: serverTimestamp(), actualizado: serverTimestamp() };
  await setDoc(docRef, data, { merge: true });
  return data;
}

/**
 * Voto Seguro vía Transacción Atómica
 * Garantiza:
 * 1) Ningún campo puede bajar de 0 (Math.max(0, ...))
 * 2) El 'total' es siempre la suma exacta de las 5 opciones
 * @param {{ opcionId: string, opcionAnteriorId?: string | null }} params
 */
export async function votarConocemosRemoto({ opcionId, opcionAnteriorId = null }) {
  if (!opcionId) return;

  try {
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(docRef);
      const data = snap.exists() ? { ...snap.data() } : { ...ESTRUCTURA_BASE };

      // Si el usuario cambia de opción, restamos la anterior sin permitir negativos
      if (opcionAnteriorId && opcionAnteriorId !== opcionId) {
        data[opcionAnteriorId] = Math.max(0, (Number(data[opcionAnteriorId]) || 0) - 1);
      }

      // Sumamos la nueva opción
      data[opcionId] = Math.max(0, (Number(data[opcionId]) || 0)) + 1;

      // Recalcular total exacto basado en la suma de las 5 opciones
      data.total = OPCIONES.reduce((acc, opt) => {
        const val = Math.max(0, Number(data[opt.id]) || 0);
        data[opt.id] = val; // sanitizar cualquier residuo negativo
        return acc + val;
      }, 0);

      data.actualizado = serverTimestamp();

      transaction.set(docRef, data, { merge: true });
    });
  } catch (err) {
    console.warn('[Firestore votarConocemos] Error en transacción:', err?.message || err);
  }
}

/**
 * Revierte el voto del usuario de forma segura
 * @param {string} opcionAnteriorId
 */
export async function revertirVotoRemoto(opcionAnteriorId) {
  if (!opcionAnteriorId) return;

  try {
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists()) return;

      const data = { ...snap.data() };
      data[opcionAnteriorId] = Math.max(0, (Number(data[opcionAnteriorId]) || 0) - 1);

      data.total = OPCIONES.reduce((acc, opt) => {
        const val = Math.max(0, Number(data[opt.id]) || 0);
        data[opt.id] = val;
        return acc + val;
      }, 0);

      data.actualizado = serverTimestamp();

      transaction.set(docRef, data, { merge: true });
    });
  } catch (err) {
    console.warn('[Firestore revertirVoto] Error en transacción:', err?.message || err);
  }
}
