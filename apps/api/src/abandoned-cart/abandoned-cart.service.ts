import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrackAbandonedCartDto } from './dto/abandoned-cart.dto';

/**
 * Quanto tempo depois de um lembrete o mesmo e-mail pode receber outro.
 *
 * Trinta dias é a mesma janela que o varredor usa para ignorar carrinho
 * velho: passado esse prazo, quem volta está começando de novo, e não
 * repetindo a mesma visita.
 */
const CARENCIA_ENTRE_LEMBRETES_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Ate quando um carrinho ainda vale um WhatsApp.
 *
 * Sete dias. Chamar alguem por causa de um carrinho de tres semanas atras nao
 * resgata venda nenhuma - resgata a lembranca de que a loja tem o telefone
 * dela, que e o oposto do efeito desejado.
 */
const JANELA_DE_RESGATE_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AbandonedCartService {
  constructor(private readonly prisma: PrismaService) {}

  async track(dto: TrackAbandonedCartDto) {
    // Sem consentimento não se guarda o e-mail. O carrinho abandonado é
    // comunicação de marketing: sem opt-in não há base legal para enviar, e
    // guardar o endereço "por via das dúvidas" é coleta sem finalidade.
    if (!dto.optIn) return { ok: true, stored: false };

    const existente = await this.prisma.abandonedCart.findUnique({
      where: { email: dto.email },
      select: { remindedAt: true },
    });

    /**
     * Zerar `remindedAt` era um loop de e-mail.
     *
     * O lembrete leva a pessoa de volta ao checkout. Chegando lá, a tela
     * registra o carrinho de novo — e o `update` apagava a marca de "já
     * avisada". Duas horas depois o varredor mandava outro lembrete, que a
     * trazia de volta, que registrava de novo. Quem não comprasse recebia o
     * mesmo e-mail a cada duas horas por trinta dias, que é quando a janela de
     * idade finalmente fecha. É o jeito mais rápido de virar spam e queimar o
     * domínio de envio.
     *
     * Um lembrete por carrinho. A marca só é zerada depois da carência, e aí é
     * um carrinho novo de verdade — alguém que voltou semanas depois, não
     * alguém que acabou de clicar no e-mail.
     */
    const podeLembrarDeNovo =
      !existente?.remindedAt ||
      existente.remindedAt.getTime() < Date.now() - CARENCIA_ENTRE_LEMBRETES_MS;

    await this.prisma.abandonedCart.upsert({
      where: { email: dto.email },
      create: {
        email: dto.email,
        name: dto.name,
        phone: dto.phone,
        itemsJson: JSON.stringify(dto.items),
        total: dto.total,
        optIn: true,
      },
      update: {
        name: dto.name,
        phone: dto.phone,
        itemsJson: JSON.stringify(dto.items),
        total: dto.total,
        optIn: true,
        // `recovered` também não volta atrás por conta própria: quem já comprou
        // uma vez com este e-mail não vira carrinho abandonado só por abrir o
        // checkout de novo.
        ...(podeLembrarDeNovo ? { recovered: false, remindedAt: null } : {}),
      },
    });
    return { ok: true, stored: true };
  }

  /**
   * Carrinhos parados, para a lojista chamar no WhatsApp.
   *
   * O e-mail automático continua saindo, mas e-mail de loja pequena cai em
   * "Promoções" e não é lido. Com o volume de hoje são pouquíssimos carrinhos
   * por semana — automatizar WhatsApp exigiria a API paga da Meta para
   * resolver um problema de três mensagens. A lista pronta com o botão resolve
   * igual, de graça, e a mensagem sai de gente e não de robô.
   *
   * Só quem deu opt-in e ainda não comprou. Recuperado sai da lista sozinho.
   */
  async pendingRecovery() {
    const carrinhos = await this.prisma.abandonedCart.findMany({
      where: {
        optIn: true,
        recovered: false,
        updatedAt: { gte: new Date(Date.now() - JANELA_DE_RESGATE_MS) },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return carrinhos.map((c) => {
      let itens: { productName: string; color: string; size: string; quantity: number }[] = [];
      try {
        itens = JSON.parse(c.itemsJson);
      } catch {
        itens = [];
      }
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        total: c.total,
        itens,
        abandonadoEm: c.updatedAt,
        emailEnviadoEm: c.remindedAt,
      };
    });
  }

  /** Marca como resolvido sem ter comprado — some da lista de resgate. */
  async dismiss(id: string) {
    await this.prisma.abandonedCart.updateMany({
      where: { id },
      data: { recovered: true },
    });
    return { success: true };
  }

  /** Descadastro de um clique, a partir do link no rodapé do e-mail. */
  async unsubscribe(id: string) {
    // Apaga em vez de só desligar: sem consentimento, não há por que guardar.
    await this.prisma.abandonedCart.deleteMany({ where: { id } });
    return { success: true };
  }

  async markRecovered(email: string) {
    await this.prisma.abandonedCart.updateMany({
      where: { email, recovered: false },
      data: { recovered: true },
    });
  }
}
