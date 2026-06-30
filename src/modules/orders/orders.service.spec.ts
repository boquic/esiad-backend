import { PrismaClient } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { OrdersService } from './orders.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BadRequestError, ConflictError, NotFoundError } from '../../utils/errors';
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
      
      expect(notificationsMock.send).toHaveBeenCalledWith('new-order', 'BUDGET_READY');
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
