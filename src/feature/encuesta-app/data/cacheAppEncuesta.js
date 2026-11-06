// src/feature/encuesta-app/data/cacheAppEncuesta.js
// ⚡ Capa de Caché y Persistencia Local para la Encuesta de Calificación de la App (/encuestas/app)
// 100% Cero Fricción · Control Inteligente de Tiempos · Respeto a la Privacidad del Usuario

import { leerStorage, escribirStorage } from '@widev/storage.js';

export const CLAVE_COMPLETADO = 'geco_app_survey_done';
export const CLAVE_USUARIO = 'geco_app_survey_user';
export const CLAVE_INICIO_SESION = 'geco_app_survey_start_time';
export const CLAVE_DESCARTADO_SESION = 'geco_app_survey_dismissed';

export const TIEMPO_ESPERA_MS = 60000; // 1 minuto exacto (60s) según requerimiento

/**
 * Mensajes de feedback dinámico según la calificación (0 a 10)
 */
export const MENSAJES_PUNTAJE = {
  10: { texto: '¡WOOOW! ¡Muchísimas gracias por el 10! Eres lo máximo 🔥🎉', badge: '¡Nivel Legendario! 🌟' },
  9:  { texto: '¡Excelente! Nos alegra muchísimo que disfrutes la experiencia ✨', badge: '¡Casi Perfecto! 💖' },
  8:  { texto: '¡Genial! Gracias por acompañar a Gersson y tu lindo respaldo 🌟', badge: '¡Muy Bueno! 👏' },
  7:  { texto: '¡Buena onda! Trabajamos con todo el corazón para que sea de 10 😊', badge: '¡Buen Puntaje! 👍' },
  6:  { texto: '¡Gracias! Tomamos nota de todo para que sea aún más fluido 🚀', badge: '¡En Progreso! ⚙️' },
  5:  { texto: '¡Gracias! ¿Qué detalle podemos afinar para sorprenderte? 💡', badge: '¡Por Mejorar! 💭' },
  4:  { texto: '¡Gracias por tu sinceridad! Cuéntanos en qué podemos pulirlo 🙏', badge: '¡Feedback Clave! 🛠️' },
  3:  { texto: '¡Gracias por avisarnos! Queremos que tu visita sea genial 🤝', badge: '¡Atentos a tus Ideas! ✍️' },
  2:  { texto: '¡Gracias por el aviso! Déjanos tu sugerencia para solucionarlo 🙏', badge: '¡Agradecemos tu Tiempo! ❤️' },
  1:  { texto: '¡Gracias por ser sincero! Tu opinión nos ayuda a reconstruir mejor 🙌', badge: '¡Toda Opinión Suma! 📝' },
  0:  { texto: '¡Gracias por decírnoslo! Queremos aprender y mejorar al 100% 🙏', badge: '¡Oportunidad de Oro! 💡' }
};

/**
 * Obtiene el mensaje y badge dinámico para un puntaje dado
 */
export function obtenerFeedbackPuntaje(puntaje) {
  const p = Math.max(0, Math.min(10, Math.round(Number(puntaje))));
  return MENSAJES_PUNTAJE[p] || MENSAJES_PUNTAJE[10];
}

/**
 * Determina si el usuario ya envió su feedback
 */
export function haCompletadoEncuestaApp() {
  if (typeof localStorage === 'undefined') return false;
  return Boolean(leerStorage(CLAVE_COMPLETADO) || localStorage.getItem(CLAVE_COMPLETADO));
}

/**
 * Determina si el usuario cerró el banner en esta sesión
 */
export function haDescartadoEncuestaApp() {
  if (typeof sessionStorage === 'undefined') return false;
  return Boolean(sessionStorage.getItem(CLAVE_DESCARTADO_SESION));
}

/**
 * Registra que el usuario cerró el banner para no volver a molestarlo en esta sesión
 */
export function marcarDescartadaEncuestaApp() {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(CLAVE_DESCARTADO_SESION, 'true');
  }
}

/**
 * Guarda localmente la respuesta del usuario para no mostrarle el pop-up nunca más
 */
export function guardarEncuestaAppLocal({ calificacion, comentario = '' }) {
  const datos = {
    calificacion: Number(calificacion),
    comentario: String(comentario).trim(),
    fecha: new Date().toISOString()
  };
  escribirStorage(CLAVE_COMPLETADO, true);
  escribirStorage(CLAVE_USUARIO, datos);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(CLAVE_COMPLETADO, 'true');
  }
  return datos;
}

/**
 * Recupera el voto previo si existe
 */
export function obtenerVotoAppLocal() {
  return leerStorage(CLAVE_USUARIO) || null;
}

/**
 * Inicia o recupera la marca de tiempo de inicio de sesión
 */
export function obtenerTiempoInicioSesion() {
  if (typeof sessionStorage === 'undefined') return Date.now();
  const guardado = sessionStorage.getItem(CLAVE_INICIO_SESION);
  if (guardado) {
    const num = Number(guardado);
    if (!isNaN(num) && num > 0) return num;
  }
  const ahora = Date.now();
  sessionStorage.setItem(CLAVE_INICIO_SESION, String(ahora));
  return ahora;
}
