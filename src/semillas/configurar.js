// src/semillas/configurar.js
// 🎛️ Tablero de Control Maestro de CumpleWii (Gersson Collantes 2026)
// Vinculado a src/wii.js · Cero hardcoding en componentes

import wii from '../wii.js';

export const configurarSistema = {
  id: wii.id,
  app: wii.app,
  nombre: 'Cumpleaños • Gersson Collantes (Geco)',
  descripcion: 'Invitación oficial de cumpleaños de Gersson Collantes. Historia en fotos, mapa interactivo, música y dedicatorias.',
  version: wii.versionName,
  versionNum: wii.version,
  linkweb: wii.linkweb,
  anio: '2026',
  temaDefecto: 'luz',

  // 🧭 Menú de Navegación Desacoplado
  navegacion: [
    { id: 'cumple',   href: '/',          label: 'Invitación',   icono: 'fa-cake-candles',       badge: 'Principal' },
    { id: 'lugar',    href: '/lugar',     label: 'Lugar & Mapa', icono: 'fa-map-location-dot',   badge: null },
    { id: 'apoyar',   href: '/apoyar',    label: 'Apoyar (Yape)',icono: 'fa-gift',               badge: null },
    { id: 'musica',   href: '/musica',    label: 'Música BecaWii',icono: 'fa-music',             badge: '22' },
    { id: 'mensajes', href: '/mensajes',  label: 'Dedicatorias', icono: 'fa-comments',           badge: null }
  ],

  // Banderas de funcionalidades
  modulos: {
    musica: true,
    encuesta: true,
    dedicatorias: true,
    confetti: true,
    yape: true
  }
};

export default configurarSistema;
