import cron from 'node-cron';
import { prisma } from '../config/database';
import { notificationsService } from '../modules/notifications/notifications.service';

export function startPickupReminderJob(): void {
  cron.schedule('0 * * * *', async () => {
    try {
      const threshold = new Date(Date.now() - 48 * 60 * 60 * 1000);

      const readyOrders = await prisma.order.findMany({
        where: {
          status: 'READY',
          updated_at: {
            lte: threshold
          },
          notifications: {
            none: {
              trigger_event: 'PICKUP_REMINDER_48H'
            }
          }
        },
        select: {
          id: true
        }
      });

      for (const order of readyOrders) {
        await notificationsService.send(order.id, 'PICKUP_REMINDER_48H');
      }
    } catch (error) {
      console.error('Pickup reminder job failed', error);
    }
  });
}
