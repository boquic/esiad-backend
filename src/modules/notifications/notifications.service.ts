import { Prisma, TriggerEvent } from '@prisma/client';
import twilio from 'twilio';
import { prisma } from '../../config/database';
import { ENV } from '../../config/env';

type OrderWithClient = Prisma.OrderGetPayload<{
  include: {
    client: {
      select: {
        id: true;
        phone: true;
        first_name: true;
      };
    };
  };
}>;

function normalizePhoneForWhatsapp(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  if (digits.startsWith('51') && digits.length > 9) {
    return `whatsapp:+${digits}`;
  }

  return `whatsapp:+51${digits}`;
}

function buildOrderNotificationMessage(order: OrderWithClient, triggerEvent: TriggerEvent): string {
  const shortOrderId = order.id.slice(0, 8);

  switch (triggerEvent) {
    case 'BUDGET_READY':
      return `Tu presupuesto para el pedido #${shortOrderId} esta listo. Monto: S/ ${Number(order.estimated_price).toFixed(2)}. Ingresa a la plataforma para revisar tu pedido.`;
    case 'CLIENT_OBSERVATION_RECEIVED':
      return `Recibimos tus observaciones para el pedido #${shortOrderId}. El equipo revisara los detalles y te avisaremos el siguiente paso.`;
    case 'BUDGET_ADJUSTED':
      return `El presupuesto del pedido #${shortOrderId} fue ajustado. Ingresa a la plataforma para revisar el nuevo monto y confirmar si esta correcto.`;
    case 'OPERATOR_REVIEW_APPROVED':
      return `Tu pedido #${shortOrderId} fue aprobado por el operario. Ya puedes continuar con el pago si corresponde.`;
    case 'PAYMENT_CONFIRMED':
      return `Tu pago fue confirmado. El pedido #${shortOrderId} esta en produccion. Te avisamos cuando este listo.`;
    case 'ORDER_IN_PRODUCTION':
      return `Tu pedido #${shortOrderId} ya esta en produccion. Te avisaremos cuando este listo para recoger.`;
    case 'ORDER_DELAYED':
      return `Tu pedido #${shortOrderId} tiene un retraso. Te avisaremos apenas tengamos una nueva actualizacion.`;
    case 'ORDER_READY':
      return `Tu pedido #${shortOrderId} esta listo para recoger en tienda. Recuerda traer tu DNI.`;
    case 'PICKUP_REMINDER_48H':
      return `Recordatorio: Tu pedido #${shortOrderId} lleva mas de 48 horas listo en tienda.`;
    case 'ORDER_DELIVERED':
      return `Gracias por confirmar la recepcion del pedido #${shortOrderId}. El pedido quedo cerrado como entregado.`;
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
      throw new Error('Pedido no encontrado para notificacion');
    }

    const message = buildOrderNotificationMessage(order, triggerEvent);
    if (!message) {
      return;
    }

    await this.sendWhatsApp(order.client.phone, message, order.id, order.client.id, triggerEvent);
  }

  /**
   * Notificación in-app (no WhatsApp) para un operario: crea el registro en
   * `Notification` directamente, sin pasar por Twilio. Se usa, por ejemplo,
   * cuando el cliente envía un borrador a cotización y hay que avisarle al
   * operario asignado dentro de la plataforma.
   */
  async notifyOperatorInApp(orderId: string, operatorUserId: string, triggerEvent: TriggerEvent): Promise<void> {
    await prisma.notification.create({
      data: {
        order_id: orderId,
        user_id: operatorUserId,
        trigger_event: triggerEvent,
        whatsapp_message_id: null,
        delivery_status: 'SENT'
      }
    });
  }

  async sendWelcomeMessage(firstName: string, phone: string): Promise<void> {
    const message = `Hola ${firstName}. Bienvenido a SIGEPED - ESIAD Proyectos. Gestiona tus pedidos de corte laser, ploteo, impresion 3D y maquetas desde nuestra plataforma.`;

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
