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
  async registrar(rota: string, novaSessao: boolean): Promise<{ ok: boolean }> {
    const caminho = this.normalizar(rota);
    if (!caminho) return { ok: true };

    try {
      const dia = this.hoje();
      await this.prisma.pageView.upsert({
        where: { dia_rota: { dia, rota: caminho } },
        create: { dia, rota: caminho, views: 1, sessoes: novaSessao ? 1 : 0 },
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

    const [linhas, pedidosBrutos] = await Promise.all([
      this.prisma.pageView.findMany({
        where: { dia: { gte: desde, lte: ate } },
        orderBy: [{ dia: 'asc' }],
      }),
      this.prisma.order.findMany({
        where: {
          createdAt: { gte: inicioBusca, lt: fimBusca },
          status: { not: 'cancelado' },
        },
        select: { createdAt: true, total: true, status: true },
      }),
    ]);

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

    return {
      de: primeiroDia,
      ate: ultimoDia,
      views,
      sessoes,
      pedidos: pedidos.length,
      pedidosPagos: pagos.length,
      receita,
      // A conta que interessa: de cada cem pessoas que entraram, quantas
      // compraram. Sem sessão registrada a divisão não existe — e mostrar 0%
      // seria pior do que mostrar nada.
      conversao: sessoes > 0 ? (pagos.length / sessoes) * 100 : null,
      ticketMedio: pagos.length > 0 ? receita / pagos.length : null,
      porDia: [...porDia.entries()]
        .map(([dia, valores]) => ({ dia, ...valores }))
        .sort((a, b) => a.dia.localeCompare(b.dia)),
      paginas,
    };
  }
}
