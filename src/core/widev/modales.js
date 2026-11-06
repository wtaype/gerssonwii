// src/core/widev/modales.js
// 🪟 Gestor Universal de Modales (wiModal) - On-Demand & Ultra-Rápido
// 100% Agnóstico · Zero Hardcoding

let escapeActivo = false;

const manejarEscape = (e) => {
  if (e.key === 'Escape') wiModal.closeAll();
};

const SELECTOR_MODALES_ABIERTOS = '.modal-overlay.open, .wiModal.active, .modal.open, [data-modal].open, [data-drawer].open';

export const wiModal = {
  open: (id, selectorFoco) => {
    if (typeof document === 'undefined') return;
    const m = typeof id === 'string' ? document.getElementById(id) : id;
    if (!m) return;

    m.classList.add('open', 'active');
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';

    // Foco accesible al primer input interactivo
    setTimeout(() => {
      const el = selectorFoco ? m.querySelector(selectorFoco) : m.querySelector('input:not([type=hidden]),select,textarea,button:not(.modal-close-btn)');
      el?.focus();
    }, 40);

    // Activar listener de Escape bajo demanda (solo cuando hay un modal visible)
    if (!escapeActivo) {
      window.addEventListener('keydown', manejarEscape);
      escapeActivo = true;
    }
  },

  close: (id) => {
    if (typeof document === 'undefined') return;
    const m = typeof id === 'string' ? document.getElementById(id) : id;
    m?.classList.remove('open', 'active');

    // Restaurar scroll si ya no quedan modales abiertos
    if (!document.querySelector(SELECTOR_MODALES_ABIERTOS)) {
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      if (escapeActivo) {
        window.removeEventListener('keydown', manejarEscape);
        escapeActivo = false;
      }
    }
  },

  closeAll: () => {
    if (typeof document === 'undefined') return;
    document.querySelectorAll(SELECTOR_MODALES_ABIERTOS).forEach(m => m.classList.remove('open', 'active'));
    document.querySelectorAll('.drawer-backdrop.active, [data-drawer-backdrop].active').forEach(b => b.classList.remove('active'));
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    if (escapeActivo) {
      window.removeEventListener('keydown', manejarEscape);
      escapeActivo = false;
    }
  }
};

// Delegación global ligera para clics en backdrop o botones de cierre
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (target.classList?.contains('modal-overlay') || target.closest?.('[data-modal-close], .modal-close-btn, .modalX')) {
      wiModal.closeAll();
    }
  });
}

// Aliases para compatibilidad total con código existente
export const abrirModal = (id, selector) => wiModal.open(id, selector);
export const cerrarModal = (id) => wiModal.close(id);
export const cerrarTodos = () => wiModal.closeAll();

export default wiModal;
