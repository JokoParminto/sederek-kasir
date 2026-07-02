/* ================================================================
   BRAND CONFIGURATION — Sederek Kopi
   ----------------------------------------------------------------
   Edit ONLY this file to rebrand string constants.
   CSS tokens live in src/assets/styles/brand.css.
   ================================================================ */

export const brand = {
  name:        'Sederek Kopi',
  tagline:     'Ngopi Bersama Kodok dan Jangkrik',
  taglineFull: 'Ngopi Bersama Kodok dan Jangkrik — kopi enak, suasana asik.',
  description: 'Aplikasi Kasir Sederek Kopi',
  version:     '1.0.0',
  logoPath:    '/logo.webp',
  logoSmPath:  '/logo.webp',
} as const

export type Brand = typeof brand
