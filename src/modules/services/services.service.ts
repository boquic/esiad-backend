import { prisma } from '../../config/database';

export class ServicesService {
  async findAllActive() {
    return await prisma.serviceType.findMany({
      where: {
        is_active: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async create(data: { name: string; pricing_model: any }) {
    const { name, pricing_model } = data;

    // Verificar si el nombre ya existe
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

  async update(id: string, data: { name?: string; pricing_model?: any; is_active?: boolean }) {
    // Si se intenta actualizar el nombre, verificamos que no esté en uso por otro servicio
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
}
