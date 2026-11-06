// src/core/widev/gestos.js
// 📱 Motor de Navegación Táctil Móvil (Swipe Left / Swipe Right) para Astro ClientRouter
// 4 Módulos VIP: / (Cumple) ↔ /lugar ↔ /apoyar ↔ /mensajes
// Zero Dependencies · Cero Bloqueo de Scroll · Micro-vibración Háptica

import { navigate } from 'astro:transitions/client';

export const RUTAS_MODULOS = [
  '/',
  '/lugar',
  '/apoyar',
  '/mensajes'
];

let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

/**
 * Normaliza la ruta actual a uno de los 4 módulos reconocidos
 */
export function obtenerIndiceRutaActual() {
  if (typeof window === 'undefined') return 0;
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const idx = RUTAS_MODULOS.indexOf(path);
  return idx >= 0 ? idx : 0;
}

/**
 * Ejecuta la navegación por swipe con vibración háptica
 */
export function ejecutarSwipe(urlDestino) {
  if (typeof window === 'undefined' || !urlDestino) return;

  // Mini-vibración háptica nativa (12ms) en móviles compatibles
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(12);
    }
  } catch (e) {}

  navigate(urlDestino);
}

/**
 * Inicializa los listeners globales de gestos de deslizamiento táctil
 */
export function iniciarGestosSwipe() {
  if (typeof window === 'undefined') return;
  if (window.__gecoGestosIniciados) return;
  window.__gecoGestosIniciados = true;

  window.addEventListener('touchstart', (e) => {
    // Evitar interferir con elementos interactivos de escritura o controles
    const target = e.target;
    if (target && target.closest && target.closest('input, textarea, select, button, a, iframe, .no-swipe, #mapaGersson, .geco-survey-btn, .geco-yape-frame')) {
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

      // Validar:
      // 1. Distancia horizontal mínima: 55px
      // 2. Ángulo horizontal estricto (deltaX debe ser al menos 1.8x mayor que deltaY)
      // 3. Tiempo de gesto rápido (< 500ms) para no atrapar scrolls lentos
      if (Math.abs(deltaX) >= 55 && Math.abs(deltaX) >= Math.abs(deltaY) * 1.8 && tiempo <= 500) {
        const idxActual = obtenerIndiceRutaActual();

        if (deltaX < 0 && idxActual < RUTAS_MODULOS.length - 1) {
          // Deslizó hacia la izquierda (←) ➔ Ir al siguiente módulo
          ejecutarSwipe(RUTAS_MODULOS[idxActual + 1]);
        } else if (deltaX > 0 && idxActual > 0) {
          // Deslizó hacia la derecha (→) ➔ Ir al módulo anterior
          ejecutarSwipe(RUTAS_MODULOS[idxActual - 1]);
        }
      }
    }
  }, { passive: true });
}
