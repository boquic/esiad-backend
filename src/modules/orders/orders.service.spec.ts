import { PrismaClient } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { OrdersService } from './orders.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../utils/errors';
import { Prisma } from '@prisma/client';

describe('OrdersService (Unit with Dependency Injection)', () => {
  let prismaMock: DeepMockProxy<PrismaClient>;
  let notificationsMock: DeepMockProxy<NotificationsService>;
  let ordersService: OrdersService;

  beforeEach(() => {
    prismaMock = mockDeep<PrismaClient>();
    notificationsMock = mockDeep<NotificationsService>();
    ordersService = new OrdersService(prismaMock, notificationsMock);
  });

  describe('create', () => {
    const clientId = 'client-1';
    const baseData = {
      service_type_id: 'st-1',
      material_id: 'mat-1',
      quantity: 10,
    };

    it('should throw ConflictError if user has an active order of same type (RN6)', async () => {
      // Configurar el mock para devolver un pedido activo
      prismaMock.order.findFirst.mockResolvedValueOnce({ id: 'active-order' } as any);

      await expect(ordersService.create(clientId, baseData)).rejects.toThrow(
        new ConflictError('RN6: Ya tienes un pedido de este tipo en progreso')
      );
    });

    it('should throw NotFoundError if serviceType does not exist', async () => {
      prismaMock.order.findFirst.mockResolvedValueOnce(null);
      prismaMock.serviceType.findUnique.mockResolvedValueOnce(null);

      await expect(ordersService.create(clientId, baseData)).rejects.toThrow(NotFoundError);
    });

    it('should calculate estimatedPrice correctly for PER_UNIT and create order', async () => {
      prismaMock.order.findFirst.mockResolvedValueOnce(null);
      prismaMock.serviceType.findUnique.mockResolvedValueOnce({ id: 'st-1', pricing_model: 'PER_UNIT', is_active: true } as any);
      prismaMock.material.findUnique.mockResolvedValueOnce({ 
        id: 'mat-1', 
        unit_price: new Prisma.Decimal(5.5), 
        is_active: true, 
        service_type_id: 'st-1' 
      } as any);

      prismaMock.user.findUnique.mockResolvedValueOnce({ is_frequent: false } as any);
      prismaMock.operator.findFirst.mockResolvedValueOnce({ id: 'op-1' } as any);

      prismaMock.order.create.mockResolvedValueOnce({ id: 'new-order' } as any);

      const result = await ordersService.create(clientId, baseData);

      expect(prismaMock.order.create).toHaveBeenCalled();
      const callArgs = prismaMock.order.create.mock.calls[0][0];
      
      expect(callArgs.data.estimated_price).toEqual(new Prisma.Decimal(55)); // 5.5 * 10
      expect(callArgs.data.payment_condition).toBe('ADVANCE_50'); // Since is_frequent = false
      expect(callArgs.data.advance_amount).toEqual(new Prisma.Decimal(27.5));
      expect(result.id).toBe('new-order');

      // El pedido nace como borrador: sin operario asignado ni notificación.
      expect(callArgs.data.status).toBe('DRAFT');
      expect(callArgs.data.operator_id).toBeUndefined();
      expect(notificationsMock.send).not.toHaveBeenCalled();
    });

    it('should set CASH_ON_DELIVERY for frequent users', async () => {
      prismaMock.order.findFirst.mockResolvedValueOnce(null);
      prismaMock.serviceType.findUnique.mockResolvedValueOnce({ id: 'st-1', pricing_model: 'FIXED', is_active: true } as any);
      prismaMock.material.findUnique.mockResolvedValueOnce({ 
        id: 'mat-1', 
        unit_price: new Prisma.Decimal(100), 
        is_active: true, 
        service_type_id: 'st-1' 
      } as any);

      prismaMock.user.findUnique.mockResolvedValueOnce({ is_frequent: true } as any);
      prismaMock.operator.findFirst.mockResolvedValueOnce({ id: 'op-1' } as any);

      prismaMock.order.create.mockResolvedValueOnce({ id: 'new-order' } as any);

      await ordersService.create(clientId, baseData);

      const callArgs = prismaMock.order.create.mock.calls[0][0];
      expect(callArgs.data.payment_condition).toBe('CASH_ON_DELIVERY');
      expect(callArgs.data.advance_amount).toBeNull();
    });
  });

  describe('draft endpoints (PATCH / DELETE)', () => {
    const clientId = 'client-1';
    const draft = {
      id: 'o1',
      client_id: clientId,
      service_type_id: 'st-1',
      status: 'DRAFT',
      payment_condition: 'ADVANCE_50',
    } as any;

    describe('update', () => {
      it('should throw NotFoundError if the order does not exist', async () => {
        prismaMock.order.findUnique.mockResolvedValueOnce(null);

        await expect(
          ordersService.update('o1', clientId, { notes: 'Escala 50%' })
        ).rejects.toThrow(NotFoundError);
      });

      it('should throw ForbiddenError if the order belongs to another client', async () => {
        prismaMock.order.findUnique.mockResolvedValueOnce({ ...draft, client_id: 'other' });

        await expect(
          ordersService.update('o1', clientId, { notes: 'Escala 50%' })
        ).rejects.toThrow(ForbiddenError);
      });

      it('should throw BadRequestError (400) if the order is not DRAFT', async () => {
        prismaMock.order.findUnique.mockResolvedValueOnce({ ...draft, status: 'IN_PROGRESS' });

        await expect(
          ordersService.update('o1', clientId, { notes: 'Escala 50%' })
        ).rejects.toThrow(BadRequestError);
      });

      it('should throw BadRequestError if no fields were sent', async () => {
        prismaMock.order.findUnique.mockResolvedValueOnce(draft);

        await expect(ordersService.update('o1', clientId, {})).rejects.toThrow(BadRequestError);
      });

      it('should update the notes of a draft', async () => {
        prismaMock.order.findUnique.mockResolvedValueOnce(draft);
        prismaMock.order.update.mockResolvedValueOnce({ id: 'o1', notes: 'Escala 50%' } as any);

        const result = await ordersService.update('o1', clientId, { notes: '  Escala 50%  ' });

        const callArgs = prismaMock.order.update.mock.calls[0][0];
        expect(callArgs.data.notes).toBe('Escala 50%');
        expect(result.id).toBe('o1');
      });

      it('should reassign material and recalculate price when the service changes', async () => {
        prismaMock.order.findUnique.mockResolvedValueOnce(draft);
        prismaMock.serviceType.findUnique.mockResolvedValueOnce({
          id: 'st-2',
          pricing_model: 'FIXED',
          is_active: true,
        } as any);
        prismaMock.material.findFirst.mockResolvedValueOnce({
          id: 'mat-2',
          unit_price: new Prisma.Decimal(80),
          is_active: true,
          service_type_id: 'st-2',
        } as any);
        prismaMock.order.update.mockResolvedValueOnce({ id: 'o1' } as any);

        await ordersService.update('o1', clientId, { service_type_id: 'st-2' });

        const callArgs = prismaMock.order.update.mock.calls[0][0];
        expect(callArgs.data.service_type).toEqual({ connect: { id: 'st-2' } });
        expect(callArgs.data.material).toEqual({ connect: { id: 'mat-2' } });
        expect(callArgs.data.estimated_price).toEqual(new Prisma.Decimal(80));
      });
    });

    describe('remove', () => {
      it('should throw BadRequestError (400) if the order is not DRAFT', async () => {
        prismaMock.order.findUnique.mockResolvedValueOnce({ ...draft, status: 'BUDGETED' });

        await expect(ordersService.remove('o1', clientId)).rejects.toThrow(BadRequestError);
      });

      it('should throw ForbiddenError if the order belongs to another client', async () => {
        prismaMock.order.findUnique.mockResolvedValueOnce({ ...draft, client_id: 'other' });

        await expect(ordersService.remove('o1', clientId)).rejects.toThrow(ForbiddenError);
      });

      it('should physically delete the draft and its files', async () => {
        prismaMock.order.findUnique.mockResolvedValueOnce(draft);
        prismaMock.orderFile.findMany.mockResolvedValueOnce([] as any);
        prismaMock.$transaction.mockResolvedValueOnce([] as any);

        const result = await ordersService.remove('o1', clientId);

        expect(prismaMock.$transaction).toHaveBeenCalled();
        expect(result).toEqual({ id: 'o1', deleted: true });
      });
    });

    describe('submitDraft', () => {
      it('should throw BadRequestError (400) if the order is not DRAFT', async () => {
        prismaMock.order.findUnique.mockResolvedValueOnce({ ...draft, status: 'BUDGETED' });

        await expect(ordersService.submitDraft('o1', clientId)).rejects.toThrow(BadRequestError);
      });

      it('should throw BadRequestError if the draft has no attached file', async () => {
        prismaMock.order.findUnique.mockResolvedValueOnce(draft);
        prismaMock.serviceType.findUnique.mockResolvedValueOnce({
          id: 'st-1',
          pricing_model: 'PER_UNIT',
          is_active: true,
        } as any);
        prismaMock.orderFile.count.mockResolvedValueOnce(0);

        await expect(ordersService.submitDraft('o1', clientId)).rejects.toThrow(BadRequestError);
      });

      it('should assign an operator, move it to BUDGETED and notify', async () => {
        prismaMock.order.findUnique.mockResolvedValueOnce(draft);
        prismaMock.serviceType.findUnique.mockResolvedValueOnce({
          id: 'st-1',
          pricing_model: 'PER_UNIT',
          is_active: true,
        } as any);
        prismaMock.orderFile.count.mockResolvedValueOnce(1);
        prismaMock.operator.findFirst.mockResolvedValueOnce({ id: 'op-1' } as any);
        prismaMock.order.update.mockResolvedValueOnce({ id: 'o1', status: 'BUDGETED' } as any);

        const result = await ordersService.submitDraft('o1', clientId);

        const callArgs = prismaMock.order.update.mock.calls[0][0];
        expect(callArgs.data.status).toBe('BUDGETED');
        expect(callArgs.data.operator_id).toBe('op-1');
        expect(result.status).toBe('BUDGETED');
        expect(notificationsMock.send).toHaveBeenCalledWith('o1', 'BUDGET_READY');
      });
    });
  });

  describe('confirmPickup', () => {
    it('should throw BadRequestError if order is not READY', async () => {
      prismaMock.order.findFirst.mockResolvedValueOnce({ id: 'o1', status: 'IN_PROGRESS' } as any);

      await expect(ordersService.confirmPickup('o1', 'c1')).rejects.toThrow(BadRequestError);
    });

    it('should update user to frequent if they reach 5 orders', async () => {
      prismaMock.order.findFirst.mockResolvedValueOnce({ id: 'o1', status: 'READY' } as any);
      
      // Simular $transaction manual
      prismaMock.$transaction.mockImplementationOnce(async (callback) => {
        return await callback(prismaMock as any);
      });

      prismaMock.order.update.mockResolvedValueOnce({ id: 'o1', status: 'DELIVERED' } as any);
      prismaMock.user.update.mockResolvedValueOnce({ completed_orders_count: 5 } as any); // First call increments
      prismaMock.user.update.mockResolvedValueOnce({ is_frequent: true } as any); // Second call if >= 5

      await ordersService.confirmPickup('o1', 'c1');

      expect(prismaMock.user.update).toHaveBeenCalledTimes(2);
      expect(notificationsMock.send).toHaveBeenCalledWith('o1', 'ORDER_DELIVERED');
    });
  });
});
