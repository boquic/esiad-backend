import express, { Router } from 'express';
import { notificationsController } from './notifications.controller';

const router = Router();

router.post(
  '/webhook',
  express.urlencoded({ extended: false }),
  notificationsController.handleWebhook.bind(notificationsController)
);

export default router;
