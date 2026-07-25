const ICONS = {
  fabric: 'M8 4 6 6l2 2v12h8V8l2-2-2-2-2 1.5h-4L8 4Z',
  stretch: 'M8 4 4 8l4 4M16 4l4 4-4 4M4 8h16M8 20l-4-4 4-4M16 20l4-4-4-4M4 16h16',
  breathable: 'M4 9h9a3 3 0 1 0-3-3M4 15h13a3 3 0 1 1-3 3M4 12h16',
  dry: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z',
  pocket: 'M5 8h14l-1.5 12a2 2 0 0 1-2 1.8H8.5a2 2 0 0 1-2-1.8L5 8Zm3 0V6a4 4 0 0 1 8 0v2',
  zipper: 'M12 3v18M8 5h8M8 9h8M8 13h8M8 17h8',
  seam: 'M4 12h4l2-4 4 8 2-4h4M4 12v0',
  sun: 'M12 5v-2M12 21v-2M5 12h-2M21 12h-2M6.3 6.3 4.9 4.9M19.1 19.1l-1.4-1.4M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  fit: 'M6 4h12l-1 5-3 2 3 2-1 7H7l-1-7 3-2-3-2Z',
  adjust: 'M4 6h10M17 6h3M4 12h4M11 12h9M4 18h13M20 18h0M14 4v4M9 10v4M17 16v4',
  shield: 'M12 3 4 6v6c0 4.4 3.2 8.2 8 9 4.8-.8 8-4.6 8-9V6l-8-3Z',
  sparkle: 'M12 3v4M12 17v4M3 12h4M17 12h4M5.5 5.5l2.8 2.8M15.7 15.7l2.8 2.8M18.5 5.5l-2.8 2.8M8.3 15.7l-2.8 2.8',
  check: 'M5 13l4 4L19 7',
} as const;

type IconKey = keyof typeof ICONS;

const KEYWORD_ICON: [RegExp, IconKey][] = [
  [/tecido|algod[ãa]o|fleece|canelad/i, 'fabric'],
  [/elasticidade|compress[ãa]o|4 vias|stretch/i, 'stretch'],
  [/respir|ventil|corta-vento|tela/i, 'breathable'],
  [/dry-?fit|absorvente|[aá]gua|antiodor|seca/i, 'dry'],
  [/bolso/i, 'pocket'],
  [/z[íi]per/i, 'zipper'],
  [/costura|flatlock|refor[çc]/i, 'seam'],
  [/uv/i, 'sun'],
  [/cintura|c[óo]s|caimento|modelag/i, 'fit'],
  [/ajust|cord[ãa]o|velcro|punho|el[áa]stico/i, 'adjust'],
  [/couro|prote[çc][ãa]o de palma|refor[çc]ada/i, 'shield'],
  [/bpa|desbota/i, 'sparkle'],
];

function resolveIcon(label: string): IconKey {
  const match = KEYWORD_ICON.find(([pattern]) => pattern.test(label));
  return match ? match[1] : 'check';
}

export function FeatureIcon({ label, className = 'h-4 w-4' }: { label: string; className?: string }) {
  const icon = resolveIcon(label);
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d={ICONS[icon]} />
    </svg>
  );
}
