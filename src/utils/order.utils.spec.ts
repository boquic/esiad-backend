import { Prisma } from '@prisma/client';
import {
  calculateAdvanceAmount,
  calculateEstimatedDeliveryAt,
  mapPricingModelToSpecialty
} from './order.utils';

describe('Order Utils', () => {
  describe('calculateAdvanceAmount', () => {
    it('should return 50% of the price if paymentCondition is ADVANCE_50', () => {
      const price = new Prisma.Decimal(100);
      const result = calculateAdvanceAmount('ADVANCE_50', price);
      
      expect(result).not.toBeNull();
      expect(result?.toNumber()).toBe(50);
    });

    it('should return null if paymentCondition is CASH_ON_DELIVERY', () => {
      const price = new Prisma.Decimal(100);
      const result = calculateAdvanceAmount('CASH_ON_DELIVERY', price);
      
      expect(result).toBeNull();
    });
  });

  describe('calculateEstimatedDeliveryAt', () => {
    it('should add 2 days for PER_UNIT', () => {
      const now = new Date();
      const result = calculateEstimatedDeliveryAt('PER_UNIT');
      const expectedDays = now.getDate() + 2;
      
      expect(result.getDate()).toBe(new Date(now.setDate(expectedDays)).getDate());
    });

    it('should add 2 days for PER_M2', () => {
      const now = new Date();
      const result = calculateEstimatedDeliveryAt('PER_M2');
      const expectedDays = now.getDate() + 2;
      
      expect(result.getDate()).toBe(new Date(now.setDate(expectedDays)).getDate());
    });

    it('should add 3 days for PER_VOLUME', () => {
      const now = new Date();
      const result = calculateEstimatedDeliveryAt('PER_VOLUME');
      const expectedDays = now.getDate() + 3;
      
      expect(result.getDate()).toBe(new Date(now.setDate(expectedDays)).getDate());
    });

    it('should add 3 days for FIXED', () => {
      const now = new Date();
      const result = calculateEstimatedDeliveryAt('FIXED');
      const expectedDays = now.getDate() + 3;
      
      expect(result.getDate()).toBe(new Date(now.setDate(expectedDays)).getDate());
    });
  });

  describe('mapPricingModelToSpecialty', () => {
    it('should map PER_UNIT to LASER', () => {
      expect(mapPricingModelToSpecialty('PER_UNIT')).toBe('LASER');
    });

    it('should map PER_M2 to PLOTTING', () => {
      expect(mapPricingModelToSpecialty('PER_M2')).toBe('PLOTTING');
    });

    it('should map PER_VOLUME to PRINTING_3D', () => {
      expect(mapPricingModelToSpecialty('PER_VOLUME')).toBe('PRINTING_3D');
    });

    it('should map FIXED to MODEL', () => {
      expect(mapPricingModelToSpecialty('FIXED')).toBe('MODEL');
    });
  });
});
