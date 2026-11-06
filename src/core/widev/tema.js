// src/core/widev/tema.js
// 🎨 Gestor Minimalista de Tema (Luz / Noche) • CumpleWii
// 100% Reactivo · Persistencia en localStorage ('wiTema') · 22 Líneas Limpias
const CLAVE = 'wiTema';

export function obtenerTema() {
  if (typeof localStorage === 'undefined') return 'luz';
  return localStorage.getItem(CLAVE) || (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'noche' : 'luz');
}

export function aplicarTema(tema) {
  const t = tema === 'noche' ? 'noche' : 'luz';
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = t;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = t === 'noche' ? '#080d1a' : '#fcfbf7';
  }
  try { localStorage.setItem(CLAVE, t); } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('witema-changed', { detail: t }));
  }
  return t;
}

export function alternarTema() {
  return aplicarTema(obtenerTema() === 'noche' ? 'luz' : 'noche');
}

// Compatibilidad widev
export const obtenerTemaPreferido = obtenerTema;
export const setTema = aplicarTema;
export const wiTema = { get: obtenerTema, set: aplicarTema, toggle: alternarTema };
export const witema = wiTema;
export const witemas = wiTema;
export default wiTema;
