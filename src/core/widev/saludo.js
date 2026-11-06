// src/core/widev/saludo.js
// Saludar: Saludos inteligentes localizados en español e inglés
// 100% Agnóstico · Desacoplado · Zero Hardcoding

import { langwii } from './langwii.js';
import { getls } from './storage.js';

/**
 * Obtiene el saludo correspondiente al momento del día (Buenos días, Buenas tardes, Buenas noches)
 * Soporta localización en inglés ('en') e indica español ('es') por defecto.
 * @param {string} [nombre]
 * @param {string} [lang]
 * @returns {string}
 */
export const Saludar = (nombre = '', lang = '') => {
  const hrs = new Date().getHours();
  const isEn = lang && langwii ? langwii.esEn(lang) : false;

  const saludo = hrs < 12
    ? (isEn ? 'Good morning'   : 'Buenos días')
    : hrs < 18
      ? (isEn ? 'Good afternoon' : 'Buenas tardes')
      : (isEn ? 'Good evening'   : 'Buenas noches');

  return nombre ? `${saludo}, ${nombre}` : `${saludo},`;
};

/**
 * saludoSmile: obtiene el nombre de usuario de LocalStorage y saluda cordialmente
 * @param {string} [claveStorage='usuario'] - Clave de LocalStorage a inspeccionar (o 'wiSmile')
 * @param {string} [fallbackNombre='Amigo'] - Nombre por defecto si no hay sesión
 * @param {string} [lang=''] - Idioma ('es' | 'en')
 * @returns {string}
 */
export const saludoSmile = (claveStorage = 'usuario', fallbackNombre = 'Amigo', lang = '') => {
  // Soporte retrocompatible si se llama pasando directamente el idioma: saludoSmile('es')
  let key = claveStorage;
  let fallback = fallbackNombre;
  let idioma = lang;

  if (claveStorage === 'es' || claveStorage === 'en') {
    idioma = claveStorage;
    key = 'usuario';
    fallback = 'Amigo';
  }

  const perfil = getls(key) || getls('wiSmile');
  const nombreCompleto = perfil ? (typeof perfil === 'string' ? perfil : perfil.nombre || perfil.name || '') : '';
  const primerNombre = nombreCompleto.trim().split(/\s+/)[0] || fallback;
  const activeLang = idioma || (langwii ? langwii.get() : 'es');

  return Saludar(primerNombre, activeLang);
};
