/**
 * A ficha técnica de cada peça, em campos.
 *
 * Compressão, altura do cós, proteção UV, bolso, opacidade — tudo isso já
 * existia, mas só como texto corrido no meio da descrição. Buscador não lê
 * parágrafo procurando adjetivo, e assistente de IA não cita o que não
 * consegue extrair: para os dois, "compressão média" perdido na terceira
 * frase simplesmente não existe.
 *
 * Em campos, a mesma informação vira `additionalProperty` no dado estruturado,
 * entra no título e na descrição da página, e aparece na tela como tabela — que
 * é justamente o formato que responde "essa legging fica transparente?" sem a
 * pessoa precisar ler tudo.
 *
 * **Tudo aqui sai da descrição real da peça, escrita pela loja.** Tabela à mão,
 * e não extração por regex, porque com dez produtos a tabela é mais confiável e
 * porque atributo inventado numa loja de roupa é devolução garantida.
 */

export interface Atributo {
  nome: string;
  valor: string;
}

export const ATRIBUTOS: Record<string, Atributo[]> = {
  legging: [
    { nome: 'Compressão', valor: 'Média' },
    { nome: 'Cós', valor: 'Bem alto e firme' },
    { nome: 'Composição', valor: 'Poliamida com elastano' },
    { nome: 'Conforto térmico', valor: 'Conduz o suor para fora do tecido' },
    { nome: 'Toque', valor: 'Macio' },
  ],
  'legging-runner': [
    { nome: 'Compressão', valor: 'Alta' },
    { nome: 'Cós', valor: 'Bem alto e firme' },
    { nome: 'Bolso', valor: 'Sim — cabe celular ou chave' },
    { nome: 'Proteção solar', valor: 'FPS 50+' },
    { nome: 'Composição', valor: '88% poliamida, 12% elastano' },
    { nome: 'Secagem', valor: 'Rápida, dispensa amaciante e ferro' },
    { nome: 'Termorregulação', valor: 'Minerais bioativos no fio' },
  ],
  shorts: [
    { nome: 'Compressão', valor: 'Média' },
    { nome: 'Cós', valor: 'Cintura alta' },
    { nome: 'Proteção solar', valor: 'FPS 50+' },
    { nome: 'Composição', valor: 'Poliamida com elastano' },
    { nome: 'Secagem', valor: 'Rápida, dispensa amaciante e ferro' },
  ],
  'shorts-bc': [
    { nome: 'Compressão', valor: 'Média' },
    { nome: 'Cós', valor: 'Duplo, mais estreito e alto na cintura' },
    { nome: 'Proteção solar', valor: 'FPS 50+' },
    { nome: 'Composição', valor: '88% poliamida, 12% elastano' },
    { nome: 'Secagem', valor: 'Rápida, dispensa amaciante e ferro' },
  ],
  'shorts-runner': [
    { nome: 'Compressão', valor: 'Tecido de compressão, ajuste firme' },
    { nome: 'Cós', valor: 'Duplo e cintura alta' },
    { nome: 'Bolso', valor: 'Dois bolsos profundos nas laterais' },
    { nome: 'Comprimento', valor: 'Médio — não sobe na coxa no treino' },
    { nome: 'Proteção solar', valor: 'FPS 50+' },
  ],
  'top-basico': [
    { nome: 'Sustentação', valor: 'Alças finas, forro duplo' },
    { nome: 'Bojo', valor: 'Com entrada para bojo' },
    { nome: 'Opacidade', valor: 'Evita transparência' },
    { nome: 'Modelagem', valor: 'Anatômica' },
    { nome: 'Secagem', valor: 'Rápida' },
  ],
  'top-costas': [
    { nome: 'Sustentação', valor: 'Forro duplo' },
    { nome: 'Costas', valor: 'Abertura nas costas' },
    { nome: 'Bojo', valor: 'Com entrada para bojo' },
    { nome: 'Opacidade', valor: 'Evita transparência' },
    { nome: 'Modelagem', valor: 'Anatômica' },
  ],
  'top-regata': [
    { nome: 'Sustentação', valor: 'Alta — alças largas e elásticos internos' },
    { nome: 'Bojo', valor: 'Com entrada para bojo' },
    { nome: 'Proteção solar', valor: 'FPS 50+' },
    { nome: 'Composição', valor: '88% poliamida, 12% elastano' },
    { nome: 'Secagem', valor: 'Rápida, dispensa amaciante e ferro' },
  ],
  'top-strapy': [
    { nome: 'Sustentação', valor: 'Alta — quatro alças com elástico' },
    { nome: 'Bojo', valor: 'Com entrada para bojo' },
    { nome: 'Cintura', valor: 'Elástico para firmeza extra' },
    { nome: 'Proteção solar', valor: 'FPS 50+' },
  ],
  'top-aberto': [
    { nome: 'Sustentação', valor: 'Forro duplo' },
    { nome: 'Costas', valor: 'Abertas — mais ventilação' },
    { nome: 'Opacidade', valor: 'Tecnologia Black Out' },
    { nome: 'Proteção solar', valor: 'FPS 50+' },
    { nome: 'Anti odor', valor: 'Sim' },
    { nome: 'Modelagem', valor: 'Anatômica' },
  ],
};

export function atributosDe(slug: string): Atributo[] {
  return ATRIBUTOS[slug] ?? [];
}

/**
 * O atributo que entra no título, quando existe.
 *
 * "Top Urban" não é buscado por ninguém. "Top fitness com bojo e FPS 50+" é o
 * que a pessoa digita — e é a diferença entre o título dizer o nome que só a
 * loja conhece e dizer o que a peça faz.
 */
export function chamadaDoTitulo(slug: string): string | null {
  const atributos = atributosDe(slug);
  const escolhidos = ['Compressão', 'Bolso', 'Bojo', 'Sustentação', 'Proteção solar']
    .map((nome) => atributos.find((a) => a.nome === nome))
    .filter((a): a is Atributo => Boolean(a))
    .slice(0, 2);

  if (escolhidos.length === 0) return null;

  return escolhidos
    .map((a) => {
      if (a.nome === 'Proteção solar') return 'FPS 50+';
      if (a.nome === 'Compressão') return `compressão ${a.valor.toLowerCase().split(',')[0]}`;
      if (a.nome === 'Bolso') return 'com bolso';
      if (a.nome === 'Bojo') return 'com bojo';
      return a.valor.toLowerCase().split(' —')[0];
    })
    .join(' e ');
}
