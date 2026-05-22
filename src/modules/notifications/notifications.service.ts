import { TriggerEvent } from '@prisma/client';
import twilio from 'twilio';
import { prisma } from '../../config/database';
import { ENV } from '../../config/env';

type OrderWithClient = Awaited<ReturnType<typeof prisma.order.findUnique>>;

function normalizePhoneForWhatsapp(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  if (digits.startsWith('51') && digits.length > 9) {
    return `whatsapp:+${digits}`;
  }

  return `whatsapp:+51${digits}`;
}

function buildOrderNotificationMessage(order: NonNullable<OrderWithClient>, triggerEvent: TriggerEvent): string {
  const shortOrderId = order.id.slice(0, 8);

  switch (triggerEvent) {
    case 'BUDGET_READY':
      return `Tu presupuesto para el pedido #${shortOrderId} está listo. Monto: S/ ${Number(order.estimated_price).toFixed(2)}. Ingresa a la plataforma para revisar tu pedido. Responde *1* si ya lo viste.`;
    case 'PAYMENT_CONFIRMED':
      return `✅ Tu pago fue confirmado. El pedido #${shortOrderId} está en producción. Te avisamos cuando esté listo.`;
    case 'ORDER_READY':
      return `🎉 Tu pedido #${shortOrderId} está listo para recoger en tienda. Recuerda traer tu DNI.\nResponde *1* para confirmar que lo viste.`;
    case 'PICKUP_REMINDER_48H':
      return `Recordatorio: Tu pedido #${shortOrderId} lleva más de 48 horas listo en tienda.\nResponde *1* si vas a recogerlo hoy.`;
    default:
      return '';
  }
}

export class NotificationsService {
  private getClient() {
    if (!ENV.TWILIO_ACCOUNT_SID || !ENV.TWILIO_AUTH_TOKEN || !ENV.TWILIO_WHATSAPP_FROM) {
      return null;
    }

    return twilio(ENV.TWILIO_ACCOUNT_SID, ENV.TWILIO_AUTH_TOKEN);
  }

  async send(orderId: string, triggerEvent: TriggerEvent): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        client: {
          select: {
            id: true,
            phone: true,
            first_name: true
          }
        }
      }
    });

    if (!order) {
      throw new Error('Pedido no encontrado para notificación');
    }

    const message = buildOrderNotificationMessage(order, triggerEvent);
    if (!message) {
      return;
    }

    await this.sendWhatsApp(order.client.phone, message, order.id, order.client.id, triggerEvent);
  }

  async sendWelcomeMessage(firstName: string, phone: string): Promise<void> {
    const message = `Hola ${firstName} 👋 Bienvenido a SIGEPED - ESIAD Proyectos.\nGestiona tus pedidos de corte láser, ploteo, impresión 3D y maquetas desde nuestra plataforma.\nResponde *1* para confirmar que recibiste este mensaje.`;

    await this.sendWhatsApp(phone, message);
  }

  async sendWhatsApp(
    toPhone: string,
    message: string,
    orderId?: string,
    userId?: string,
    triggerEvent?: TriggerEvent
  ): Promise<void> {
    const client = this.getClient();

    if (!client) {
      if (orderId && userId && triggerEvent) {
        await prisma.notification.create({
          data: {
            order_id: orderId,
            user_id: userId,
            trigger_event: triggerEvent,
            whatsapp_message_id: null,
            delivery_status: 'FAILED'
          }
        });
      }

      return;
    }

    try {
      const twilioMessage = await client.messages.create({
        from: ENV.TWILIO_WHATSAPP_FROM,
        to: normalizePhoneForWhatsapp(toPhone),
        body: message
      });

      if (orderId && userId && triggerEvent) {
        await prisma.notification.create({
          data: {
            order_id: orderId,
            user_id: userId,
            trigger_event: triggerEvent,
            whatsapp_message_id: twilioMessage.sid,
            delivery_status: 'SENT'
          }
        });
      }
    } catch (error) {
      console.error('Twilio error:', error);

      if (orderId && userId && triggerEvent) {
        await prisma.notification.create({
          data: {
            order_id: orderId,
            user_id: userId,
            trigger_event: triggerEvent,
            whatsapp_message_id: null,
            delivery_status: 'FAILED'
          }
        });
      }
    }
  }
}

export const notificationsService = new NotificationsService();
