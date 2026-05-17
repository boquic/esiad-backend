import { PricingModel, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';

type ServiceInput = {
  name: string;
  pricing_model: PricingModel;
};

type ServiceUpdateInput = {
  name?: string;
  pricing_model?: PricingModel;
  is_active?: boolean;
};

export class ServicesService {
  async findAllActive(includeInactive = false) {
    const whereClause: Prisma.ServiceTypeWhereInput = includeInactive
      ? {}
      : {
          is_active: true,
        };

    return await prisma.serviceType.findMany({
      where: whereClause,
      orderBy: {
        name: 'asc',
      },
    });
  }

  async create(data: ServiceInput) {
    const { name, pricing_model } = data;

    const existingService = await prisma.serviceType.findUnique({ where: { name } });
    if (existingService) {
      throw new Error('Servicio ya registrado');
    }

    return await prisma.serviceType.create({
      data: {
        name,
        pricing_model,
      },
    });
  }

  async update(id: string, data: ServiceUpdateInput) {
    if (data.name) {
      const existingService = await prisma.serviceType.findFirst({
        where: {
          name: data.name,
          NOT: { id },
        },
      });

      if (existingService) {
        throw new Error('Servicio ya registrado');
      }
    }

    return await prisma.serviceType.update({
      where: { id },
      data,
    });
  }

  async toggle(id: string) {
    const service = await prisma.serviceType.findUnique({
      where: { id },
    });

    if (!service) {
      throw new Error('Servicio no encontrado');
    }

    return await prisma.serviceType.update({
      where: { id },
      data: {
        is_active: !service.is_active,
      },
    });
  }

  async delete(id: string) {
    return await prisma.serviceType.delete({
      where: { id },
    });
  }
}
