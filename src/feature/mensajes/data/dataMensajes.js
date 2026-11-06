// src/feature/mensajes/data/dataMensajes.js
// 🌐 Servicio Firestore para /mensajes (Muro de Dedicatorias en Documento Único)
// Colección: 'gersson' | Documento: 'gersson' (/gersson/gersson)
// Estructura: Array de Mapas/Objetos { id: FirebaseUID, nombre, vinculo, vinculoTexto, emoji, mensaje, likes, creado }
// 100% Spark Tier Optimizado · Cero Consultas Redundantes · Generación de UID en Cliente

import { db } from '@servicios/firebase.js';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp
} from 'firebase/firestore';
import { guardarMensajeLocal, registrarLikeLocal } from './cacheMensajes.js';
import semillasDefault from '@semillas/mensajes.json';

export const COLECCION = 'gersson';
export const DOCUMENTO_ID = 'gersson';
const gerssonDocRef = doc(db, COLECCION, DOCUMENTO_ID);

let ultimaConsulta = 0;
let cacheRemota = [];

/**
 * Genera un UID oficial único de Firebase sin llamadas de red
 */
export function generarIdMensaje() {
  return doc(collection(db, COLECCION)).id;
}

/**
 * Consulta las dedicatorias en el documento único /gersson/gersson
 * Throttle de 8 segundos en memoria para máxima velocidad y protección Spark Tier.
 */
export async function consultarMensajes(forzar = false) {
  const ahora = Date.now();
  if (!forzar && ahora - ultimaConsulta < 8000 && cacheRemota.length > 0) {
    return cacheRemota;
  }

  try {
    const snap = await getDoc(gerssonDocRef);
    let items = [];

    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.items)) {
        items = data.items.map((item) => ({
          id: item.id || `msg-${Math.random().toString(36).substring(2, 9)}`,
          nombre: item.nombre || 'Invitado(a)',
          vinculo: item.vinculo || 'amigos',
          vinculoTexto: item.vinculoTexto || 'Amigos',
          emoji: item.emoji || '🎂',
          mensaje: item.mensaje || '',
          likes: Number(item.likes) || 0,
          creado: item.creado,
          fechaTexto: formatearFecha(item.creado)
        }));
      }
    } else {
      // Documento aún no creado: inicializar con semilla SeoWii oficial
      const semillaItems = semillasDefault.map((s) => ({
        ...s,
        id: s.id || generarIdMensaje(),
        creado: new Date().toISOString()
      }));
      await setDoc(gerssonDocRef, {
        items: semillaItems,
        creado: serverTimestamp(),
        actualizado: serverTimestamp()
      }, { merge: true });

      items = semillaItems.map((s) => ({
        ...s,
        fechaTexto: 'Oficial'
      }));
    }

    // Ordenar de más reciente a más antiguo
    items.sort((a, b) => {
      const tA = new Date(a.creado || 0).getTime();
      const tB = new Date(b.creado || 0).getTime();
      return tB - tA;
    });

    ultimaConsulta = ahora;
    cacheRemota = items;
    return items;
  } catch (err) {
    console.warn('[Firestore] Error consultando /gersson/gersson:', err?.message || err);
    return cacheRemota.length > 0 ? cacheRemota : semillasDefault;
  }
}

/**
 * Publica una dedicatoria guardando su mapa dentro del array `items` de /gersson/gersson
 */
export async function enviarMensaje({ id, nombre, vinculo, vinculoTexto, emoji, mensaje }) {
  const itemUid = id || generarIdMensaje();
  const creadoIso = new Date().toISOString();

  const nuevoItem = {
    id: itemUid,
    nombre: String(nombre || '').trim().slice(0, 50),
    vinculo: String(vinculo || 'amigos').toLowerCase(),
    vinculoTexto: String(vinculoTexto || 'Amigos'),
    emoji: String(emoji || '🎂'),
    mensaje: String(mensaje || '').trim().slice(0, 300),
    likes: 0,
    creado: creadoIso
  };

  const itemFrontend = {
    ...nuevoItem,
    fechaTexto: 'Recién ahora'
  };

  // Guardar en caché local y memoria inmediatamente
  guardarMensajeLocal(itemFrontend);
  cacheRemota.unshift(itemFrontend);

  // Sincronizar en segundo plano con Firestore
  try {
    await setDoc(
      gerssonDocRef,
      {
        items: arrayUnion(nuevoItem),
        actualizado: serverTimestamp()
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('[Firestore] Error sincronizando mensaje en /gersson/gersson:', err?.message || err);
  }

  return itemFrontend;
}

/**
 * Incrementa el contador de likes de un mensaje dentro del array `items`
 */
export async function darLikeMensaje(msgId) {
  if (!msgId) return false;
  registrarLikeLocal(msgId);

  // Actualizar en caché en memoria
  const idxMem = cacheRemota.findIndex((m) => m.id === msgId);
  if (idxMem !== -1) {
    cacheRemota[idxMem].likes = (cacheRemota[idxMem].likes || 0) + 1;
  }

  try {
    const snap = await getDoc(gerssonDocRef);
    if (!snap.exists()) return true;

    const data = snap.data();
    const items = Array.isArray(data.items) ? [...data.items] : [];
    const index = items.findIndex((it) => it.id === msgId);

    if (index !== -1) {
      items[index] = {
        ...items[index],
        likes: (Number(items[index].likes) || 0) + 1
      };

      await updateDoc(gerssonDocRef, {
        items,
        actualizado: serverTimestamp()
      });
    }

    return true;
  } catch (err) {
    console.warn('[Firestore] Error registrando like en /gersson/gersson:', err?.message || err);
    return false;
  }
}

function formatearFecha(fechaVal) {
  if (!fechaVal) return 'Hoy';
  try {
    const d = new Date(fechaVal);
    const ahora = Date.now();
    const diffMs = ahora - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMin / 60);

    if (diffMin < 2) return 'Recién ahora';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHoras < 24) return `Hace ${diffHoras} h`;
    return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
  } catch {
    return 'Hoy';
  }
}
