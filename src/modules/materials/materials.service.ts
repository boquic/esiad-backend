import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';

type MaterialInput = {
  service_type_id: string;
  name: string;
  unit_price: Prisma.Decimal | number | string;
  unit: string;
};

type MaterialUpdateInput = {
  name?: string;
  unit_price?: Prisma.Decimal | number | string;
  unit?: string;
  is_active?: boolean;
};

export class MaterialsService {
  async findAll(serviceTypeId?: string, includeInactive = false) {
    const whereClause: Prisma.MaterialWhereInput = {
      ...(serviceTypeId ? { service_type_id: serviceTypeId } : {}),
      ...(includeInactive ? {} : { is_active: true }),
    };

    return await prisma.material.findMany({
      where: whereClause,
      include: {
        service_type: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async create(data: MaterialInput) {
    const { service_type_id, name, unit_price, unit } = data;

    const serviceType = await prisma.serviceType.findUnique({ where: { id: service_type_id } });
    if (!serviceType) {
      throw new Error('Tipo de servicio no encontrado');
    }

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
        unit_price: new Prisma.Decimal(unit_price),
        unit,
      },
    });
  }

  async update(id: string, data: MaterialUpdateInput) {
    if (data.name) {
      const currentMaterial = await prisma.material.findUnique({ where: { id } });
      if (!currentMaterial) {
        throw new Error('Material no encontrado');
      }

      const existingMaterial = await prisma.material.findFirst({
        where: {
          service_type_id: currentMaterial.service_type_id,
          name: data.name,
          NOT: { id },
        },
      });

      if (existingMaterial) {
        throw new Error('El material ya existe para este tipo de servicio');
      }
    }

    const updateData: Prisma.MaterialUpdateInput = {
      ...data,
      ...(data.unit_price !== undefined
        ? { unit_price: new Prisma.Decimal(data.unit_price) }
        : {}),
    };

    return await prisma.material.update({
      where: { id },
      data: updateData,
    });
  }

  async toggle(id: string) {
    const material = await prisma.material.findUnique({ where: { id } });
    if (!material) {
      throw new Error('Material no encontrado');
    }

    return await prisma.material.update({
      where: { id },
      data: {
        is_active: !material.is_active,
      },
    });
  }

  async delete(id: string) {
    return await prisma.material.delete({
      where: { id },
    });
  }
}
