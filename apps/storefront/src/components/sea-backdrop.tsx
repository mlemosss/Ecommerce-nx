/**
 * Fundo de mar da página inicial.
 *
 * É desenhado em SVG, não é foto: pesa alguns kilobytes em vez de alguns
 * megabytes, nunca aparece desfocado em tela grande, não depende de licença de
 * banco de imagem e não precisa de um segundo carregamento para a dobra
 * principal aparecer inteira.
 *
 * Se um dia entrar uma foto de verdade, ela vira o `background-image` desta
 * mesma seção e as camadas de onda continuam servindo de véu por cima — foi
 * por isso que o degradê do céu ficou separado das ondas.
 */
export function SeaBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg
        className="h-full w-full"
        viewBox="0 0 1440 720"
        preserveAspectRatio="xMidYMid slice"
        role="presentation"
      >
        <defs>
          {/* Céu: quase branco no alto, ganhando o azul só perto da linha d'água. */}
          <linearGradient id="ceu" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbfdfd" />
            <stop offset="55%" stopColor="#e6f2f5" />
            <stop offset="100%" stopColor="#c9e2e9" />
          </linearGradient>

          {/* Água: mais funda logo abaixo do horizonte, clareando na areia. */}
          <linearGradient id="agua" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6ba8bb" />
            <stop offset="35%" stopColor="#84bccb" />
            <stop offset="100%" stopColor="#d8eaed" />
          </linearGradient>

          {/* Brilho do sol na água, logo abaixo do horizonte. */}
          <radialGradient id="reflexo" cx="0.62" cy="0.06" r="0.55">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>

          {/* Grão finíssimo: sem ele o degradê fica com faixas em tela grande. */}
          <filter id="grao">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>

        <rect width="1440" height="720" fill="url(#ceu)" />

        {/* Horizonte em 38% da altura. O `slice` corta o SVG na vertical em
            tela larga, então o horizonte sobe: colocado no meio, sumia. */}
        <g>
          <path d="M0 274 H1440 V720 H0 Z" fill="url(#agua)" />
          <rect y="274" width="1440" height="260" fill="url(#reflexo)" />
          {/* Linha do horizonte: é ela que faz o olho ler "mar" e não "degradê". */}
          <path d="M0 274 H1440" stroke="#ffffff" strokeWidth="1.5" opacity="0.5" />

          {/* Ondas: três camadas translúcidas, cada uma mais clara e mais
              baixa, para dar profundidade sem virar desenho animado. */}
          <path
            d="M0 352 C 220 326, 400 374, 640 352 S 1080 326, 1440 356 L1440 720 H0 Z"
            fill="#ffffff"
            opacity="0.14"
          />
          <path
            d="M0 448 C 260 420, 470 478, 730 450 S 1150 418, 1440 454 L1440 720 H0 Z"
            fill="#ffffff"
            opacity="0.2"
          />
          <path
            d="M0 556 C 300 526, 520 588, 800 558 S 1180 526, 1440 564 L1440 720 H0 Z"
            fill="#ffffff"
            opacity="0.34"
          />
          {/* Espuma na beirada da última onda. */}
          <path
            d="M0 556 C 300 526, 520 588, 800 558 S 1180 526, 1440 564"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.5"
            opacity="0.6"
          />
        </g>

        <rect width="1440" height="720" filter="url(#grao)" opacity="0.035" />
      </svg>

      {/* Véu branco no pé da seção, para o conteúdo seguinte emendar sem corte. */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-white" />
    </div>
  );
}
