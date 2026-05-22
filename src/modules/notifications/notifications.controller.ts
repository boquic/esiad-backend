import { NextFunction, Request, Response } from 'express';
import twilio from 'twilio';
import { handleIncomingMessage } from './bot.service';

type TwilioWebhookBody = {
  From?: string;
  Body?: string;
};

export class NotificationsController {
  async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { From, Body } = req.body as TwilioWebhookBody;

      if (!From || typeof Body !== 'string') {
        res.status(400).json({ error: true, message: 'Payload de Twilio inválido' });
        return;
      }

      const from = From.replace(/^whatsapp:\+51/, '');
      const reply = await handleIncomingMessage(from, Body);

      if (!reply) {
        res.sendStatus(204);
        return;
      }

      const twiml = new twilio.twiml.MessagingResponse();
      twiml.message(reply);

      res.type('text/xml');
      res.send(twiml.toString());
    } catch (error) {
      next(error);
    }
  }
}

export const notificationsController = new NotificationsController();
