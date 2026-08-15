const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    join(__dirname, 'src/**/*!(*.stories|*.spec).{ts,tsx,html}'),
  ],
  theme: {
    extend: {
      // Paleta monocromática: preto, papel e cinzas. A única cor da tela é a
      // foto do produto — por isso não existe cor de destaque aqui.
      colors: {
        ink: '#0b0b0d',
        paper: '#f6f6f4',
        line: '#e4e4e1',
        mist: '#d4d4d8',
        steel: '#a1a1aa',
        // Maré: só na página inicial. `foam` é o claro que substituiu os blocos
        // pretos; `tide` é a água da hero, usada pelo SVG do fundo.
        foam: '#eef5f6',
        tide: '#bcd8dd',
        // Nomes antigos: `volt` prometia um neon e sempre entregou cinza.
        // Mantidos como apelido para não quebrar telas que ainda os usam;
        // em código novo, use `mist`/`steel`.
        volt: '#d4d4d8',
        volt2: '#a1a1aa',
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
