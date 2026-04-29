import { prisma } from '../../config/database';

export class MaterialsService {
  async findAll(serviceTypeId?: string) {
    const whereClause: any = {
      is_active: true,
    };

    if (serviceTypeId) {
      whereClause.service_type_id = serviceTypeId;
    }

    return await prisma.material.findMany({
      where: whereClause,
      include: {
        service_type: {
          select: {
            name: true,
          }
        }
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async create(data: { service_type_id: string; name: string; unit_price: number; unit: string }) {
    const { service_type_id, name, unit_price, unit } = data;

    // Verificar si el tipo de servicio existe
    const serviceType = await prisma.serviceType.findUnique({ where: { id: service_type_id } });
    if (!serviceType) {
      throw new Error('Tipo de servicio no encontrado');
    }

    // Verificar si el material ya existe para ese servicio
    const existingMaterial = await prisma.material.findUnique({
      where: {
        service_type_id_name: {
          service_type_id,
          name,
        },
      },
    });

    if (existingMaterial) {
      throw new Error('El material ya existe para este tipo de servicio');
    }

    return await prisma.material.create({
      data: {
        service_type_id,
        name,
        unit_price,
        unit,
      },
    });
  }
}
