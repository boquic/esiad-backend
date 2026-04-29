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
}
