// src/core/widev/tema.js
// 🎨 Gestor Minimalista y Ultra Eficiente de Tema (Luz / Noche)
// Cero bloated code, cero "futuro", 100% reactivo y compatible con el sistema
const CLAVE = 'wiTema';

/**
 * Detecta el tema preferido:
 * 1) Elección guardada en localStorage ('noche' o 'luz')
 * 2) Preferencia del sistema operativo (dark mode -> 'noche')
 * 3) Fallback: 'luz'
 */
export function obtenerTemaPreferido() {
  if (typeof window === 'undefined') return 'luz';
  try {
    const guardado = localStorage.getItem(CLAVE);
    if (guardado === 'noche' || guardado === 'luz') return guardado;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'noche' : 'luz';
  } catch {
    return 'luz';
  }
}

/**
 * Aplica el tema ('luz' o 'noche') en el <html> y actualiza theme-color
 */
export function aplicarTema(tema, persistir = false) {
  const temaFinal = tema === 'noche' ? 'noche' : 'luz';

  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.dataset.theme = temaFinal;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = temaFinal === 'noche' ? '#080d1a' : '#fcfbf7';
  }

  if (persistir) {
    try { localStorage.setItem(CLAVE, temaFinal); } catch {}
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('witema-changed', { detail: temaFinal }));
  }

  return temaFinal;
}

/**
 * Alterna entre Luz y Noche guardando la elección en localStorage ('wiTema')
 */
export function alternarTema() {
  const actual = (typeof document !== 'undefined' && document.documentElement.dataset.theme) || obtenerTemaPreferido();
  return aplicarTema(actual === 'noche' ? 'luz' : 'noche', true);
}

// Escuchar cambios de preferencia del sistema si el usuario no tiene elección guardada
if (typeof window !== 'undefined') {
  window.alternarTema = alternarTema;
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    try {
      if (!localStorage.getItem(CLAVE)) {
        aplicarTema(e.matches ? 'noche' : 'luz', false);
      }
    } catch {}
  });
}

export const wiTema = {
  get: obtenerTemaPreferido,
  set: (t, persist = true) => aplicarTema(t, persist),
  toggle: alternarTema
};

export default wiTema;
