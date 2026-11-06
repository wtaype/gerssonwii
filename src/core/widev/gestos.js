// src/core/widev/gestos.js
// 📱 Motor Universal Agnóstico de Navegación Táctil Móvil (Swipe Left / Swipe Right)
// Compatible con Astro ClientRouter y cualquier framework web SPA
// Autodescubrimiento dinámico de rutas del DOM · Micro-vibración Háptica · Zero Dependencies

import { navigate } from 'astro:transitions/client';

let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let rutasRegistradas = [];

/**
 * Autodescubre las rutas navegables desde los enlaces de la barra de navegación o selector dado
 * @param {string} selector - Selector CSS de los enlaces de navegación
 * @returns {string[]} Lista de rutas normalizadas
 */
export function obtenerRutasActivas(selector = '.geco-nav-bottom a[href], .geco-nav-menu a[href]') {
  if (typeof document === 'undefined') return [];
  const enlaces = Array.from(document.querySelectorAll(selector));
  const rutas = enlaces
    .map((a) => a.getAttribute('href'))
    .filter((h) => h && h.startsWith('/') && !h.startsWith('//') && !h.startsWith('/#'))
    .map((h) => h.replace(/\/$/, '') || '/');

  // Retornar lista de rutas únicas preservando el orden visual
  return Array.from(new Set(rutas));
}

/**
 * Obtiene el índice de la ruta actual dentro del conjunto de rutas registradas
 * @param {string[]} rutas - Lista de rutas
 * @returns {number}
 */
export function obtenerIndiceRutaActual(rutas = rutasRegistradas) {
  if (typeof window === 'undefined' || !rutas.length) return 0;
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const idx = rutas.indexOf(path);
  return idx >= 0 ? idx : 0;
}

/**
 * Ejecuta la navegación por swipe con vibración háptica configurable
 * @param {string} urlDestino - Ruta destino
 * @param {number} duracionVibracion - Milisegundos de vibración háptica (0 para desactivar)
 */
export function ejecutarSwipe(urlDestino, duracionVibracion = 12) {
  if (typeof window === 'undefined' || !urlDestino) return;

  if (duracionVibracion > 0) {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(duracionVibracion);
      }
    } catch (e) {}
  }

  navigate(urlDestino);
}

/**
 * Inicializa los listeners globales de gestos de deslizamiento táctil
 * @param {Object} opciones
 * @param {string[]} [opciones.rutas] - Rutas fijas opcionales (si se omiten, se descubren del DOM)
 * @param {string} [opciones.selectorNav] - Selector para autodescubrimiento
 * @param {number} [opciones.umbral] - Distancia mínima en px (defecto: 50)
 * @param {number} [opciones.vibrar] - Milisegundos de vibración (defecto: 12)
 * @param {string} [opciones.excluir] - Selector de elementos excluidos
 */
export function iniciarGestosSwipe(opciones = {}) {
  if (typeof window === 'undefined') return;

  const {
    rutas = null,
    selectorNav = '.geco-nav-bottom a[href], .geco-nav-menu a[href]',
    umbral = 50,
    vibrar = 12,
    excluir = 'input, textarea, select, button, a, iframe, .no-swipe, [data-no-swipe], #mapaGersson, .geco-survey-btn, .geco-yape-frame'
  } = opciones;

  function actualizarRutas() {
    rutasRegistradas = Array.isArray(rutas) && rutas.length > 0
      ? rutas
      : obtenerRutasActivas(selectorNav);
  }

  actualizarRutas();
  document.addEventListener('astro:page-load', actualizarRutas);

  if (window.__wiGestosIniciados) return;
  window.__wiGestosIniciados = true;

  window.addEventListener('touchstart', (e) => {
    const target = e.target;
    if (target && target.closest && target.closest(excluir)) {
      touchStartX = 0;
      touchStartY = 0;
      return;
    }

    if (e.touches && e.touches.length === 1) {
      const t = e.touches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      touchStartTime = Date.now();
    }
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
    if (!touchStartX) return;

    if (e.changedTouches && e.changedTouches.length === 1) {
      const t = e.changedTouches[0];
      const deltaX = t.clientX - touchStartX;
      const deltaY = t.clientY - touchStartY;
      const tiempo = Date.now() - touchStartTime;

      touchStartX = 0;
      touchStartY = 0;

      // Criterios de validación de gesto swipe limpio:
      // 1. Distancia horizontal mayor al umbral
      // 2. Movimiento horizontal dominante (al menos 1.8x mayor al vertical para no interferir con scroll)
      // 3. Duración rápida (< 500ms)
      if (Math.abs(deltaX) >= umbral && Math.abs(deltaX) >= Math.abs(deltaY) * 1.8 && tiempo <= 500) {
        if (!rutasRegistradas.length) actualizarRutas();
        if (!rutasRegistradas.length) return;

        const idxActual = obtenerIndiceRutaActual(rutasRegistradas);

        if (deltaX < 0 && idxActual < rutasRegistradas.length - 1) {
          // Deslizó hacia la izquierda (←) ➔ Siguiente módulo
          ejecutarSwipe(rutasRegistradas[idxActual + 1], vibrar);
        } else if (deltaX > 0 && idxActual > 0) {
          // Deslizó hacia la derecha (→) ➔ Módulo anterior
          ejecutarSwipe(rutasRegistradas[idxActual - 1], vibrar);
        }
      }
    }
  }, { passive: true });
}
