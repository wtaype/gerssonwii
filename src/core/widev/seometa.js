// src/core/widev/seometa.js
// seometa v10.2: Gestor dinámico universal de metaetiquetas SEO y Schema.org en el cliente
// 100% Agnóstico · Cero dependencias de proyecto · Parámetros configurables

const setTag = (id, val) => {
  if (typeof document === 'undefined' || !val) return;
  const el = document.getElementById(id);
  if (el) el.setAttribute('content', val);
};

const setHref = (id, val) => {
  if (typeof document === 'undefined' || !val) return;
  const el = document.getElementById(id);
  if (el) el.setAttribute('href', val);
};

/**
 * Establece metaetiquetas dinámicas (Title, OpenGraph, Twitter, Canonical, Schema.org)
 * @param {Object} [config]
 * @param {string} [config.title]
 * @param {string} [config.desc]
 * @param {string} [config.keywords]
 * @param {string} [config.img]
 * @param {string} [config.path]
 * @param {string} [config.baseUrl]
 * @param {string} [config.author]
 * @param {string} [config.type]
 * @param {any} [config.datePublished]
 */
export const setMeta = ({
  title = '',
  desc = '',
  keywords = '',
  img = '',
  path = '/',
  baseUrl = '',
  author = '',
  type = 'WebSite',
  datePublished = null
} = {}) => {
  if (typeof document === 'undefined') return;

  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const url = `${origin}${path}`;

  if (title) {
    document.title = title;
    setTag('wi_og_title', title);
    setTag('wi_tw_title', title);
  }

  if (desc) {
    setTag('wi_desc', desc);
    setTag('wi_og_desc', desc);
    setTag('wi_tw_desc', desc);
  }

  if (keywords) {
    setTag('wi_keywords', keywords);
  }

  if (url) {
    setHref('wi_canonical', url);
    setTag('wi_og_url', url);
  }

  if (img) {
    const fullImg = img.startsWith('http') ? img : `${origin}${img}`;
    setTag('wi_og_img', fullImg);
    setTag('wi_tw_img', fullImg);
  }

  // Schema Dinámico JSON-LD
  const oldSchema = document.getElementById('wi_schema_art');
  if (oldSchema) oldSchema.remove();

  if (type === 'Article') {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'wi_schema_art';
    const schemaData = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": title,
      "image": img ? (img.startsWith('http') ? img : `${origin}${img}`) : undefined,
      "datePublished": datePublished ? new Date(datePublished).toISOString() : new Date().toISOString()
    };
    if (author) {
      schemaData.author = { "@type": "Person", "name": author };
    }
    script.textContent = JSON.stringify(schemaData);
    document.head.appendChild(script);
  }
};
