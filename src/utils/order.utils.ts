import { Prisma, PricingModel, Specialty } from '@prisma/client';

export function calculateAdvanceAmount(paymentCondition: 'ADVANCE_50' | 'CASH_ON_DELIVERY', price: Prisma.Decimal): Prisma.Decimal | null {
  return paymentCondition === 'ADVANCE_50' ? price.mul(0.5) : null;
}

export function calculateEstimatedDeliveryAt(pricingModel: PricingModel): Date {
  const estimatedDeliveryAt = new Date();

  switch (pricingModel) {
    case 'PER_UNIT':
    case 'PER_M2':
      estimatedDeliveryAt.setDate(estimatedDeliveryAt.getDate() + 2);
      break;
    case 'PER_VOLUME':
    case 'FIXED':
    default:
      estimatedDeliveryAt.setDate(estimatedDeliveryAt.getDate() + 3);
      break;
  }

  return estimatedDeliveryAt;
}

export function mapPricingModelToSpecialty(pricingModel: PricingModel): Specialty {
  switch (pricingModel) {
    case 'PER_UNIT':
      return 'LASER';
    case 'PER_M2':
      return 'PLOTTING';
    case 'PER_VOLUME':
      return 'PRINTING_3D';
    case 'FIXED':
    default:
      return 'MODEL';
  }
}
