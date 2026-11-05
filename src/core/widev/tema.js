// src/core/widev/tema.js
// 🎨 Gestor Canónico de Temas BecaWii 2026 (Luz / Noche)
// Soporta: prefers-color-scheme, persistencia manual en 'wiTema', cero FOUC

const CLAVE_TEMA = 'wiTema';

export const TEMAS = {
  noche: '#0a1827',
  luz: '#f4f8fb'
};

/**
 * Obtiene el tema preferido:
 * 1. Elección guardada en localStorage ('noche' o 'luz')
 * 2. Si no hay elección: preferencia del sistema operativo (prefers-color-scheme: dark -> 'noche')
 * 3. Fallback: 'luz'
 */
export function obtenerTemaPreferido() {
  if (typeof window === 'undefined') return 'luz';
  try {
    let guardado = localStorage.getItem(CLAVE_TEMA);
    if (guardado === 'futuro') {
      guardado = 'noche';
      try { localStorage.setItem(CLAVE_TEMA, 'noche'); } catch {}
    }
    if (guardado === 'noche' || guardado === 'luz') {
      return guardado;
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'noche'
      : 'luz';
  } catch {
    return 'luz';
  }
}

/**
 * Aplica un tema al elemento raíz.
 * @param {'luz' | 'noche' | string} tema
 * @param {boolean} persistir - Solo guardar en localStorage si el usuario eligió manualmente
 */
export function aplicarTema(tema, persistir = false) {
  let t = tema === 'futuro' ? 'noche' : tema;
  const temaFinal = t === 'noche' ? 'noche' : 'luz';

  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.dataset.theme = temaFinal;

    // Actualizar meta theme-color para navegadores móviles
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.content = temaFinal === 'noche' ? TEMAS.noche : TEMAS.luz;
    }
  }

  if (persistir) {
    try {
      localStorage.setItem(CLAVE_TEMA, temaFinal);
    } catch {}
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('witema-changed', { detail: temaFinal }));
  }

  return temaFinal;
}

/**
 * Conmuta entre Luz y Noche guardando la elección manual.
 */
export function alternarTema() {
  const actual = (typeof document !== 'undefined' && document.documentElement.dataset.theme) || obtenerTemaPreferido();
  const nuevo = actual === 'noche' ? 'luz' : 'noche';
  return aplicarTema(nuevo, true);
}

/**
 * Escucha cambios en la preferencia del sistema operativo si no hay elección manual guardada.
 */
export function iniciarEscuchaSistema() {
  if (typeof window === 'undefined' || !window.matchMedia) return;

  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = (e) => {
    try {
      const guardado = localStorage.getItem(CLAVE_TEMA);
      if (!guardado) {
        aplicarTema(e.matches ? 'noche' : 'luz', false);
      }
    } catch {}
  };

  if (mq.addEventListener) {
    mq.addEventListener('change', handler);
  } else if (mq.addListener) {
    mq.addListener(handler);
  }
}

// Inicialización y compatibilidad global
if (typeof window !== 'undefined') {
  window.alternarTema = alternarTema;
  window.cambiarTemaGlobal = (t) => aplicarTema(t, true);
  iniciarEscuchaSistema();
}

export const wiTema = {
  get: obtenerTemaPreferido,
  set: (t, persist = true) => aplicarTema(t, persist),
  toggle: alternarTema,
  init: () => {
    aplicarTema(obtenerTemaPreferido(), false);
    iniciarEscuchaSistema();
  }
};

export default wiTema;
