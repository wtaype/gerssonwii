// src/feature/cumple/lib/cumpleClient.js
// 🎂 Cliente Unificado del Feature Cumpleaños (Hero + Timeline Blur-up + Encuesta en Vivo)
// Cero scripts fragmentados · Consolidación de alto rendimiento

import { leerStorage } from '@widev/storage.js';
import { imgwii } from '@widev';
import {
  obtenerEstadoLocal,
  guardarVotoLocal,
  revertirVotoLocal,
  sincronizarDesdeFirestore,
  calcularPorcentajes,
  FEEDBACK_MSGS,
  OPCIONES
} from '../data/cacheConocemos.js';
import { Mensaje } from '@widev/mensajes.js';
import { wiSmart } from '@widev';

// 1. HIDRATACIÓN DEL HERO
export function hidratarHeroCard() {
  try {
    const override = leerStorage('geco_cumple_custom', null);
    if (override && typeof override === 'object') {
      if (override.titulo) {
        const el = document.getElementById('heroTitulo');
        if (el) el.textContent = override.titulo;
      }
      if (override.fecha) {
        const el = document.getElementById('heroFecha');
        if (el) el.textContent = override.fecha;
      }
      if (override.hora) {
        const el = document.getElementById('heroHora');
        if (el) el.textContent = override.hora;
      }
    }
  } catch {}
}

// 2. TIMELINE PROGRESIVO
export function activarTimelineImg() {
  try {
    imgwii.ver('#timelineStream');
  } catch {}
}

// 3. ENCUESTA EN VIVO
let estadoEncuesta = null;
let desuscribirRealtime = null;
let enfriamientoRefresh = false;

export function renderizarEncuesta() {
  if (!estadoEncuesta) estadoEncuesta = obtenerEstadoLocal();
  const { votos, usuarioEleccion, total } = estadoEncuesta;
  const porcentajes = calcularPorcentajes(votos, total);

  const totalTextEl = document.getElementById('surveyTotalText');
  if (totalTextEl) {
    if (total === 0) {
      totalTextEl.innerHTML = `Total de votos: <strong>0 respuestas</strong> (¡Sé el primero en votar!)`;
    } else {
      totalTextEl.innerHTML = `Total de votos: <strong>${total} ${total === 1 ? 'respuesta' : 'respuestas'}</strong>`;
    }
  }

  votos.forEach((_, idx) => {
    const pct = porcentajes[idx] ?? 0;
    const bar = document.getElementById(`surveyBar-${idx}`);
    const pctEl = document.getElementById(`surveyPct-${idx}`);
    if (bar) bar.style.width = `${pct}%`;
    if (pctEl) pctEl.textContent = `${pct}%`;
  });

  document.querySelectorAll('.geco-survey-btn').forEach((btn, idx) => {
    btn.classList.toggle('voted', usuarioEleccion === idx);
  });

  const banner = document.getElementById('surveyFeedbackBanner');
  const bannerText = document.getElementById('surveyFeedbackText');
  const btnReset = document.getElementById('btnCambiarVoto');

  if (usuarioEleccion !== null) {
    if (banner && bannerText) {
      bannerText.textContent = FEEDBACK_MSGS[usuarioEleccion] || '¡Gracias por tu respuesta!';
      banner.classList.add('show');
    }
    if (btnReset) btnReset.classList.add('visible');
  } else {
    if (banner) banner.classList.remove('show');
    if (btnReset) btnReset.classList.remove('visible');
  }
}

export function setupInteraccionesEncuesta() {
  document.querySelectorAll('.geco-survey-btn').forEach((btn) => {
    btn.onclick = () => {
      const idx = Number(btn.getAttribute('data-index'));
      if (!estadoEncuesta) estadoEncuesta = obtenerEstadoLocal();
      if (estadoEncuesta.usuarioEleccion === idx) return;

      const prevIdx = estadoEncuesta.usuarioEleccion;
      const prevOptId = prevIdx !== null ? OPCIONES[prevIdx]?.id : null;
      const opt = OPCIONES[idx];
      if (!opt) return;

      estadoEncuesta = guardarVotoLocal(idx);
      renderizarEncuesta();

      if (typeof window !== 'undefined' && typeof window.lanzarConfeti === 'function') {
        window.lanzarConfeti(80);
      }

      Mensaje(FEEDBACK_MSGS[idx] || '¡Gracias por tu vínculo con Gersson!', 'success');

      import('../data/dataConocemos.js')
        .then(({ votarConocemosRemoto }) => {
          votarConocemosRemoto({
            opcionId: opt.id,
            opcionAnteriorId: prevOptId
          });
        })
        .catch((err) => console.warn('[Conocemos Sync] Error:', err));
    };
  });

  const btnReset = document.getElementById('btnCambiarVoto');
  if (btnReset) {
    btnReset.onclick = () => {
      if (!estadoEncuesta || estadoEncuesta.usuarioEleccion === null) return;
      const prevIdx = estadoEncuesta.usuarioEleccion;
      const prevOptId = prevIdx !== null ? OPCIONES[prevIdx]?.id : null;

      estadoEncuesta = revertirVotoLocal();
      renderizarEncuesta();
      Mensaje('Puedes elegir nuevamente tu vínculo con Gersson.', 'info');

      if (prevOptId) {
        import('../data/dataConocemos.js')
          .then(({ revertirVotoRemoto }) => {
            revertirVotoRemoto(prevOptId);
          })
          .catch((err) => console.warn('[Conocemos Revert] Error:', err));
      }
    };
  }

  const btnRefresh = document.getElementById('btnActualizarVotos');
  if (btnRefresh) {
    btnRefresh.onclick = async () => {
      if (enfriamientoRefresh) {
        Mensaje('Resultados al día. Espera un momento para refrescar.', 'info');
        return;
      }

      enfriamientoRefresh = true;
      btnRefresh.classList.add('cargando');

      try {
        const { consultarConocemos } = await import('../data/dataConocemos.js');
        const datosRemotos = await consultarConocemos();
        if (datosRemotos) {
          estadoEncuesta = sincronizarDesdeFirestore(datosRemotos);
          renderizarEncuesta();
          Mensaje('Resultados actualizados en vivo ✨', 'success');
        }
      } catch {
        Mensaje('Resultados sincronizados localmente.', 'info');
      } finally {
        setTimeout(() => btnRefresh.classList.remove('cargando'), 400);
        setTimeout(() => { enfriamientoRefresh = false; }, 3500);
      }
    };
  }
}

export function conectarTiempoRealEncuesta() {
  wiSmart({
    js: [
      async () => {
        try {
          const { escucharConocemos } = await import('../data/dataConocemos.js');
          if (desuscribirRealtime) desuscribirRealtime();

          desuscribirRealtime = escucharConocemos((datosRemotos) => {
            if (datosRemotos) {
              estadoEncuesta = sincronizarDesdeFirestore(datosRemotos);
              renderizarEncuesta();
            }
          });
        } catch (e) {
          console.warn('[wiSmart] Listener diferido no disponible:', e);
        }
      }
    ]
  });
}

/**
 * Orquestador principal del feature cumple
 */
export function iniciarCumple() {
  hidratarHeroCard();
  activarTimelineImg();

  if (document.getElementById('seccionEncuestaV9')) {
    estadoEncuesta = obtenerEstadoLocal();
    renderizarEncuesta();
    setupInteraccionesEncuesta();
    conectarTiempoRealEncuesta();
  }
}
