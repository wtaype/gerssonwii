// src/core/widev/navegador.js
// navegador v10.3: Controladores y limpiadores de rutas/URL 100% agnósticos

export const wiPath = {
  // Limpia rutas especiales, por ejemplo, eliminando subdirectorios base redundantes
  limpiar(ruta, prefijoBase = '') {
    const base = prefijoBase || '/';
    const guar = typeof sessionStorage !== 'undefined' ? sessionStorage.ghPath : null;
    if (guar) {
      sessionStorage.removeItem('ghPath');
      return (prefijoBase ? guar.replace(new RegExp(`^${prefijoBase}`), '') : guar) || '/';
    }
    let r = base !== '/' && ruta?.startsWith(base) ? ruta.slice(base.length - 1) || '/' : ruta || '/';
    if (r !== '/' && !r.startsWith('/')) r = '/' + r;
    return r;
  },

  // Inserta una ruta nueva en la barra de direcciones sin provocar un refresco de página completo
  poner(ruta, titulo = '') {
    if (typeof history !== 'undefined') {
      history.pushState({ ruta }, titulo, ruta);
      if (titulo) document.title = titulo;

      // Lanzar evento nativo popstate para alertar a otros escuchas de que el historial cambió
      window.dispatchEvent(new PopStateEvent('popstate', { state: { ruta } }));
    }
  },

  // Retorna los parámetros de consulta (?search=params) en formato de objeto de clave-valor
  params() {
    return typeof location !== 'undefined' ? Object.fromEntries(new URLSearchParams(location.search)) : {};
  },

  // Retorna el path limpio actual de la página
  get actual() {
    return typeof location !== 'undefined' ? this.limpiar(location.pathname) : '/';
  }
};

export default wiPath;
