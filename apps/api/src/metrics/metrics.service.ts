import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Rotas longas demais são de robô ou de link quebrado, e não de gente
 * navegando. Cortar no tamanho evita que a tabela vire depósito de lixo.
 */
const TAMANHO_MAXIMO_DA_ROTA = 120;

/** Quanto tempo o painel olha para trás. */
const JANELA_PADRAO_EM_DIAS = 30;

/**
 * Diferença de Brasília para o UTC, em minutos.
 *
 * O servidor roda em UTC, e usar o dia dele fazia uma venda das 22h de terça
 * aparecer na quarta — a lojista olharia o gráfico e não reconheceria o próprio
 * dia de trabalho. O Brasil não tem mais horário de verão, então três horas
 * fixas é exato, e não aproximação.
 */
const MINUTOS_ATRAS_DE_UTC = 3 * 60;

/** O dia em Brasília a que um instante pertence, como "2026-08-19". */
function diaEmBrasilia(instante: Date): string {
  const local = new Date(instante.getTime() - MINUTOS_ATRAS_DE_UTC * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

/**
 * Em qual canal a visita ou a venda entra.
 *
 * A pergunta que decide orçamento não é "de qual site veio", é "o que eu paguei
 * trouxe mais que o que eu não paguei". Por isso o agrupamento é por canal, e
 * não por domínio: `instagram.com`, `l.instagram.com` e `lm.facebook.com` são a
 * mesma coisa para quem decide onde colocar dinheiro.
 *
 * Pago antes de orgânico, sempre. Quem chega por anúncio do Instagram tem o
 * referrer do Instagram junto — classificar pelo referrer creditaria ao
 * orgânico uma visita que foi paga, que é o erro que faz o anúncio parecer
 * inútil.
 */
export const CANAIS_ACEITOS = new Set([
  'Meta Ads',
  'Google Ads',
  'Instagram',
  'Facebook',
  'Google',
  'Direto',
  'Outros',
]);

export type Canal =
  | 'Meta Ads'
  | 'Google Ads'
  | 'Instagram'
  | 'Facebook'
  | 'Google'
  | 'Direto'
  | 'Outros';

export function classificarCanal(dados: {
  utmSource?: string | null;
  utmMedium?: string | null;
  gclid?: string | null;
  referrer?: string | null;
}): Canal {
  const fonte = (dados.utmSource ?? '').toLowerCase();
  const meio = (dados.utmMedium ?? '').toLowerCase();
  const pago = /cpc|ppc|paid|ads|anuncio|an[uú]ncio/.test(meio);

  if (dados.gclid) return 'Google Ads';
  if (/facebook|instagram|meta|fb|ig/.test(fonte) && (pago || !meio)) return 'Meta Ads';
  if (fonte === 'google' && pago) return 'Google Ads';

  if (fonte) {
    // Campanha marcada à mão que não é anúncio: link da bio, e-mail, WhatsApp.
    if (/instagram|ig/.test(fonte)) return 'Instagram';
    if (/facebook|fb/.test(fonte)) return 'Facebook';
    if (fonte === 'google') return 'Google';
    return 'Outros';
  }

  if (dados.referrer) {
    // O navegador manda só o domínio. Pedido gravado antes desta mudança pode
    // ter o endereço inteiro, então a URL continua sendo aceita.
    const host = (() => {
      try {
        return new URL(dados.referrer).hostname.toLowerCase();
      } catch {
        return dados.referrer.toLowerCase();
      }
    })();
    if (/instagram\./.test(host)) return 'Instagram';
    if (/facebook\.|fb\./.test(host)) return 'Facebook';
    if (/google\./.test(host)) return 'Google';
    if (host) return 'Outros';
  }

  return 'Direto';
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Normaliza a rota antes de gravar.
   *
   * Sem isto, `/produtos/legging?utm_source=instagram` e `/produtos/legging`
   * viram duas linhas diferentes, e a peça mais vista da loja aparece dividida
   * em quinze pedaços — cada campanha criando a sua própria fatia.
   *
   * A query string vai fora inteira. Ela não diz para onde a pessoa foi, diz de
   * onde veio, e é justamente onde mora dado pessoal colado por engano em link
   * compartilhado.
   */
  private normalizar(rota: string): string | null {
    const limpa = rota.split('?')[0].split('#')[0].trim();
    if (!limpa.startsWith('/')) return null;
    if (limpa.length > TAMANHO_MAXIMO_DA_ROTA) return null;
    // Barra final não muda a página, mas cria linha nova.
    return limpa.length > 1 ? limpa.replace(/\/+$/, '') : '/';
  }

  /** Meia-noite do dia de hoje em Brasília, para a linha do dia. */
  private hoje(): Date {
    return new Date(`${diaEmBrasilia(new Date())}T00:00:00.000Z`);
  }

  /**
   * Soma uma visita.
   *
   * `upsert` em vez de `create`: uma linha por dia e rota, que sobe. É a
   * diferença entre dezenas de linhas por dia e dezenas de milhares.
   *
   * Falha em silêncio. Contador de visita não pode derrubar a página que está
   * contando — e uma visita perdida não muda decisão nenhuma.
   */
  async registrar(rota: string, novaSessao: boolean, canal?: string): Promise<{ ok: boolean }> {
    const caminho = this.normalizar(rota);
    if (!caminho) return { ok: true };

    // Rótulo desconhecido vira "Outros": a coluna existe para agrupar, e um
    // valor livre vindo da internet transformaria o relatório numa lista.
    const canalValido = CANAIS_ACEITOS.has(canal ?? '') ? (canal as string) : 'Direto';

    try {
      const dia = this.hoje();
      await this.prisma.pageView.upsert({
        where: { dia_rota_canal: { dia, rota: caminho, canal: canalValido } },
        create: { dia, rota: caminho, canal: canalValido, views: 1, sessoes: novaSessao ? 1 : 0 },
        update: {
          views: { increment: 1 },
          ...(novaSessao ? { sessoes: { increment: 1 } } : {}),
        },
      });
    } catch (erro) {
      this.logger.warn(`Não consegui somar a visita em ${caminho}: ${erro}`);
    }

    return { ok: true };
  }

  /**
   * Lança o que foi gasto num dia, num canal.
   *
   * `upsert`: relançar o mesmo dia substitui em vez de somar. A lojista vai
   * digitar olhando o painel do Meta, e conferir duas vezes o mesmo dia é o
   * comportamento normal de quem confere — somar dobraria o custo e faria a
   * campanha parecer o dobro de cara.
   */
  async registrarGasto(dia: string, canal: string, valor: number) {
    const data = new Date(`${dia}T00:00:00.000Z`);
    await this.prisma.adSpend.upsert({
      where: { dia_canal: { dia: data, canal } },
      create: { dia: data, canal, valor },
      update: { valor },
    });
    return { ok: true };
  }

  /** O que já foi lançado no período, para a tela mostrar e permitir corrigir. */
  async gastos(de: string, ate: string) {
    const lancamentos = await this.prisma.adSpend.findMany({
      where: { dia: { gte: new Date(`${de}T00:00:00.000Z`), lte: new Date(`${ate}T00:00:00.000Z`) } },
      orderBy: [{ dia: 'desc' }, { canal: 'asc' }],
    });

    return lancamentos.map((g) => ({
      id: g.id,
      dia: g.dia.toISOString().slice(0, 10),
      canal: g.canal,
      valor: g.valor,
    }));
  }

  /**
   * O resumo que o painel mostra.
   *
   * Junta visita e venda na mesma consulta porque separados eles não dizem
   * nada: mil visitas é ótimo ou péssimo dependendo de quantas viraram pedido,
   * e é essa razão que decide se vale gastar em anúncio.
   */
  async resumo(periodo: { de?: string; ate?: string; dias?: number } = {}) {
    /**
     * Um dia é um período de um dia só, e não um caso especial.
     *
     * O painel tinha 7, 30 e 90 dias, e nada respondia "e ontem?". Olhar um
     * dia é o que se faz depois de postar no Instagram ou de ligar a campanha
     * — e era justamente o recorte que não existia.
     *
     * As datas vêm como "2026-08-29", já no dia de Brasília, e viram os dois
     * extremos inclusive. `de` sem `ate` é um dia só.
     */
    const hoje = this.hoje();
    const desde = periodo.de
      ? new Date(`${periodo.de}T00:00:00.000Z`)
      : (() => {
          const d = new Date(hoje);
          d.setUTCDate(d.getUTCDate() - ((periodo.dias ?? JANELA_PADRAO_EM_DIAS) - 1));
          return d;
        })();

    const ate = periodo.ate
      ? new Date(`${periodo.ate}T00:00:00.000Z`)
      : periodo.de
        ? new Date(`${periodo.de}T00:00:00.000Z`)
        : hoje;

    // O último dia entra inteiro: o pedido das 23h de ontem é de ontem, e um
    // `lte` na meia-noite o deixaria de fora.
    const fimDoPeriodo = new Date(ate);
    fimDoPeriodo.setUTCDate(fimDoPeriodo.getUTCDate() + 1);

    // Pedido é gravado em UTC; o dia dele é o de Brasília. Buscar três horas a
    // mais nas duas pontas e filtrar depois evita perder a venda das 22h.
    const inicioBusca = new Date(desde.getTime() - MINUTOS_ATRAS_DE_UTC * 60 * 1000);
    const fimBusca = new Date(fimDoPeriodo.getTime() + MINUTOS_ATRAS_DE_UTC * 60 * 1000);

    const [linhas, pedidosBrutos, gastos] = await Promise.all([
      this.prisma.pageView.findMany({
        where: { dia: { gte: desde, lte: ate } },
        orderBy: [{ dia: 'asc' }],
      }),
      this.prisma.order.findMany({
        where: {
          createdAt: { gte: inicioBusca, lt: fimBusca },
          status: { not: 'cancelado' },
        },
        select: {
          createdAt: true,
          total: true,
          status: true,
          utmSource: true,
          utmMedium: true,
          utmCampaign: true,
          gclid: true,
          referrer: true,
        },
      }),
      this.prisma.adSpend.findMany({ where: { dia: { gte: desde, lte: ate } } }),
    ]);

    const gastoPorCanal = new Map<string, number>();
    for (const g of gastos) {
      gastoPorCanal.set(g.canal, (gastoPorCanal.get(g.canal) ?? 0) + g.valor);
    }
    const gastoTotal = gastos.reduce((soma, g) => soma + g.valor, 0);

    const primeiroDia = desde.toISOString().slice(0, 10);
    const ultimoDia = ate.toISOString().slice(0, 10);
    const pedidos = pedidosBrutos.filter((p) => {
      const dia = diaEmBrasilia(p.createdAt);
      return dia >= primeiroDia && dia <= ultimoDia;
    });

    const views = linhas.reduce((soma, l) => soma + l.views, 0);
    const sessoes = linhas.reduce((soma, l) => soma + l.sessoes, 0);

    // Por dia, para o gráfico.
    const porDia = new Map<string, { views: number; sessoes: number; pedidos: number }>();
    for (const l of linhas) {
      const chave = l.dia.toISOString().slice(0, 10);
      const atual = porDia.get(chave) ?? { views: 0, sessoes: 0, pedidos: 0 };
      atual.views += l.views;
      atual.sessoes += l.sessoes;
      porDia.set(chave, atual);
    }
    for (const p of pedidos) {
      const chave = diaEmBrasilia(p.createdAt);
      const atual = porDia.get(chave) ?? { views: 0, sessoes: 0, pedidos: 0 };
      atual.pedidos += 1;
      porDia.set(chave, atual);
    }

    // Visitas por canal: a metade que faltava. Saber que a campanha trouxe
    // gente é o primeiro sinal de que ela está entregando, e vem dias antes da
    // primeira venda.
    const visitasPorCanal = new Map<string, { canal: string; views: number; sessoes: number }>();
    for (const l of linhas) {
      const atual =
        visitasPorCanal.get(l.canal) ?? { canal: l.canal, views: 0, sessoes: 0 };
      atual.views += l.views;
      atual.sessoes += l.sessoes;
      visitasPorCanal.set(l.canal, atual);
    }

    // Páginas mais vistas, somando os dias.
    const porRota = new Map<string, number>();
    for (const l of linhas) {
      porRota.set(l.rota, (porRota.get(l.rota) ?? 0) + l.views);
    }

    const paginas = [...porRota.entries()]
      .map(([rota, views]) => ({ rota, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 15);

    const pagos = pedidos.filter((p) => p.status !== 'aguardando_pagamento');
    const receita = pagos.reduce((soma, p) => soma + p.total, 0);

    /**
     * De onde vieram as vendas — pelo registro da loja, não pelo do anunciante.
     *
     * O painel do Meta diz quantas vendas ele acha que trouxe; o do Google diz
     * o mesmo. Os dois contam a mesma venda e os dois contam a mais, porque
     * cada um credita a si qualquer compra que aconteça depois de um clique
     * dele. Somar os dois é decidir orçamento em cima de ficção.
     *
     * Aqui uma venda tem uma origem só: a do último clique de campanha antes
     * da compra. É menos generoso e é o que dá para conferir.
     */
    const porCanal = new Map<string, { canal: string; pedidos: number; receita: number }>();
    const porCampanha = new Map<
      string,
      { canal: string; campanha: string; pedidos: number; receita: number }
    >();

    for (const p of pagos) {
      const canal = classificarCanal(p);

      const noCanal = porCanal.get(canal) ?? { canal, pedidos: 0, receita: 0 };
      noCanal.pedidos += 1;
      noCanal.receita += p.total;
      porCanal.set(canal, noCanal);

      // A campanha só aparece quando existe: agrupar "sem campanha" junto com
      // as marcadas encheria a lista de linhas que não dizem nada.
      if (p.utmCampaign) {
        const chave = `${canal}|${p.utmCampaign}`;
        const naCampanha =
          porCampanha.get(chave) ?? { canal, campanha: p.utmCampaign, pedidos: 0, receita: 0 };
        naCampanha.pedidos += 1;
        naCampanha.receita += p.total;
        porCampanha.set(chave, naCampanha);
      }
    }

    return {
      de: primeiroDia,
      ate: ultimoDia,
      views,
      sessoes,
      pedidos: pedidos.length,
      pedidosPagos: pagos.length,
      receita,
      gastoEmAnuncio: gastoTotal,
      // A conta que interessa: de cada cem pessoas que entraram, quantas
      // compraram. Sem sessão registrada a divisão não existe — e mostrar 0%
      // seria pior do que mostrar nada.
      conversao: sessoes > 0 ? (pagos.length / sessoes) * 100 : null,
      ticketMedio: pagos.length > 0 ? receita / pagos.length : null,
      // Ordenado por receita: a primeira linha é o canal que mais rende, que é
      // a única ordem que ajuda a decidir onde colocar dinheiro.
      canais: [...new Set([...visitasPorCanal.keys(), ...porCanal.keys()])]
        .map((canal) => {
          const visitas = visitasPorCanal.get(canal);
          const vendas = porCanal.get(canal);
          const sessoes = visitas?.sessoes ?? 0;
          const pedidosDoCanal = vendas?.pedidos ?? 0;
          const receitaDoCanal = vendas?.receita ?? 0;
          const gasto = gastoPorCanal.get(canal) ?? 0;

          return {
            canal,
            sessoes,
            views: visitas?.views ?? 0,
            pedidos: pedidosDoCanal,
            receita: receitaDoCanal,
            // A conta que compara canais entre si. Sem visita registrada não há
            // divisão — e 0% seria mentira, não ausência.
            conversao: sessoes > 0 ? (pedidosDoCanal / sessoes) * 100 : null,
            gasto,
            // Quanto voltou para cada real gasto. É o número que decide se a
            // campanha continua — e ele só existe se a lojista tiver lançado o
            // gasto; sem isso, mostrar zero seria dizer que o anúncio foi de
            // graça.
            retorno: gasto > 0 ? receitaDoCanal / gasto : null,
            custoPorVenda: gasto > 0 && pedidosDoCanal > 0 ? gasto / pedidosDoCanal : null,
            custoPorVisitante: gasto > 0 && sessoes > 0 ? gasto / sessoes : null,
          };
        })
        .sort((a, b) => b.receita - a.receita || b.sessoes - a.sessoes),
      campanhas: [...porCampanha.values()].sort((a, b) => b.receita - a.receita).slice(0, 15),
      porDia: [...porDia.entries()]
        .map(([dia, valores]) => ({ dia, ...valores }))
        .sort((a, b) => a.dia.localeCompare(b.dia)),
      paginas,
    };
  }
}
