const COLOR_MAP: Record<string, string> = {
  preto: '#111111',
  branco: '#f5f5f5',
  grafite: '#4b5563',
  chumbo: '#374151',
  marinho: '#1e293b',
  bege: '#d8c3a5',
  cinza: '#9ca3af',
  'cinza mescla': '#a3a3a3',
  rosa: '#ec4899',
  'verde musgo': '#4d6b4d',
  'verde neon': '#a3e635',
  'azul royal': '#1d4ed8',
  transparente: '#e5e7eb',
};

export function colorSwatch(name: string): string {
  return COLOR_MAP[name.trim().toLowerCase()] ?? '#a1a1aa';
}
