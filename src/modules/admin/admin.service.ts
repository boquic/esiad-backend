import { Prisma, PricingModel, Role, Specialty } from '@prisma/client';
import bcrypt from 'bcrypt';
import * as XLSX from 'xlsx';
import { prisma } from '../../config/database';

type DateRangeKey = 'today' | 'week' | 'month';

type SalesStatsFilters = {
  startDate?: string;
  endDate?: string;
  range?: string;
};

type OrdersFilters = {
  status?: string;
  startDate?: string;
  endDate?: string;
};

type CreateOperatorInput = {
  dni: string;
  first_name: string;
  last_name: string;
  phone: string;
  password: string;
  specialties: Specialty[];
};

type UpdateOperatorInput = {
  dni?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  password?: string;
  specialties?: Specialty[];
};

type ClientFrequentInput = {
  is_frequent: boolean;
};

function getDateRange(range?: string): { start?: Date; end?: Date } {
  if (!range) {
    return {};
  }

  const normalizedRange = range.toLowerCase() as DateRangeKey;
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (normalizedRange === 'today') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (normalizedRange === 'week') {
    const day = start.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diffToMonday);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (normalizedRange === 'month') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  throw new Error('Rango de fechas inválido');
}

function buildDateFilter(startDate?: string, endDate?: string, range?: string): Prisma.DateTimeFilter | undefined {
  const explicitStart = startDate ? new Date(startDate) : undefined;
  const explicitEnd = endDate ? new Date(endDate) : undefined;

  if (explicitStart && Number.isNaN(explicitStart.getTime())) {
    throw new Error('startDate inválido');
  }

  if (explicitEnd && Number.isNaN(explicitEnd.getTime())) {
    throw new Error('endDate inválido');
  }

  const rangeValues = getDateRange(range);
  const finalStart = explicitStart ?? rangeValues.start;
  const finalEnd = explicitEnd ?? rangeValues.end;

  if (!finalStart && !finalEnd) {
    return undefined;
  }

  const filter: Prisma.DateTimeFilter = {};

  if (finalStart) {
    filter.gte = finalStart;
  }

  if (finalEnd) {
    const end = new Date(finalEnd);
    if (endDate && endDate.length === 10) {
      end.setHours(23, 59, 59, 999);
    }
    filter.lte = end;
  }

  if (filter.gte && filter.lte && filter.gte > filter.lte) {
    throw new Error('El rango de fechas es inválido');
  }

  return filter;
}

function mapPricingModelToSpecialty(pricingModel: PricingModel): Specialty {
  switch (pricingModel) {
    case 'PER_UNIT':
      return 'LASER';
    case 'PER_M2':
      return 'PLOTTING';
    case 'PER_VOLUME':
      return 'PRINTING_3D';
    case 'FIXED':
      return 'MODEL';
    default:
      return 'MODEL';
  }
}

function sanitizeSpecialties(specialties: string[]): Specialty[] {
  return specialties
    .map((specialty) => specialty.trim().toUpperCase())
    .filter((specialty): specialty is Specialty =>
      ['LASER', 'PLOTTING', 'PRINTING_3D', 'MODEL'].includes(specialty),
    );
}

export class AdminService {
  async getPendingPayments() {
    return prisma.payment.findMany({
      where: { status: 'PENDING' },
      include: {
        order: {
          include: {
            client: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                dni: true,
                phone: true,
              },
            },
            service_type: true,
          },
        },
      },
      orderBy: { created_at: 'asc' },
    });
  }

  async approvePayment(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });

    if (!payment) {
      throw new Error('Pago no encontrado');
    }

    if (payment.status !== 'PENDING') {
      throw new Error('El pago no está pendiente de revisión');
    }

    return prisma.$transaction(async (tx) => {
      const approvedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'APPROVED',
          reviewed_at: new Date(),
        },
      });

      await tx.order.update({
        where: { id: payment.order_id },
        data: { status: 'IN_PROGRESS' },
      });

      return approvedPayment;
    });
  }

  async rejectPayment(paymentId: string, adminComment: string) {
    if (!adminComment || adminComment.trim() === '') {
      throw new Error('El comentario de rechazo es obligatorio');
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new Error('Pago no encontrado');
    }

    if (payment.status !== 'PENDING') {
      throw new Error('El pago no está pendiente de revisión');
    }

    return prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'REJECTED',
        admin_comment: adminComment.trim(),
        reviewed_at: new Date(),
      },
    });
  }

  async assignOperator(orderId: string, operatorId: string) {
    if (!operatorId) {
      throw new Error('El ID del operario es requerido');
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { service_type: true },
    });

    if (!order) {
      throw new Error('Pedido no encontrado');
    }

    const operator = await prisma.operator.findUnique({
      where: { id: operatorId },
      include: { specialties: true },
    });

    if (!operator) {
      throw new Error('Operario no encontrado');
    }

    const requiredSpecialty = mapPricingModelToSpecialty(order.service_type.pricing_model);
    const hasMatchingSpecialty = operator.specialties.some(
      (specialty) => specialty.specialty === requiredSpecialty,
    );

    if (!hasMatchingSpecialty) {
      throw new Error('La especialidad del operario no coincide con el servicio del pedido');
    }

    return prisma.order.update({
      where: { id: orderId },
      data: { operator_id: operatorId },
    });
  }

  async getSalesStats(filters: SalesStatsFilters) {
    const reviewedAtFilter = buildDateFilter(filters.startDate, filters.endDate, filters.range);
    const whereClause: Prisma.PaymentWhereInput = {
      status: 'APPROVED',
      ...(reviewedAtFilter ? { reviewed_at: reviewedAtFilter } : {}),
    };

    const payments = await prisma.payment.findMany({
      where: whereClause,
      select: {
        amount: true,
        reviewed_at: true,
        payment_type: true,
      },
      orderBy: { reviewed_at: 'asc' },
    });

    const salesByDate: Record<string, number> = {};
    let totalSales = 0;
    let advanceSales = 0;
    let finalSales = 0;

    for (const payment of payments) {
      const amount = Number(payment.amount);
      totalSales += amount;

      if (payment.payment_type === 'ADVANCE') {
        advanceSales += amount;
      } else {
        finalSales += amount;
      }

      if (payment.reviewed_at) {
        const dateKey = payment.reviewed_at.toISOString().split('T')[0] as string;
        salesByDate[dateKey] = (salesByDate[dateKey] ?? 0) + amount;
      }
    }

    const dailySales = Object.entries(salesByDate).map(([date, total]) => ({ date, total }));

    return {
      totalSales,
      advanceSales,
      finalSales,
      totalPayments: payments.length,
      dailySales,
    };
  }

  async getServicesStats() {
    const orders = await prisma.order.groupBy({
      by: ['service_type_id'],
      _count: { id: true },
    });

    const services = await prisma.serviceType.findMany({
      select: { id: true, name: true },
    });

    return orders
      .map((orderGroup) => {
        const service = services.find((item) => item.id === orderGroup.service_type_id);

        return {
          service_id: orderGroup.service_type_id,
          service_name: service?.name ?? 'Desconocido',
          count: orderGroup._count.id,
        };
      })
      .sort((left, right) => right.count - left.count);
  }

  async getTopClients() {
    const deliveredOrders = await prisma.order.groupBy({
      by: ['client_id'],
      where: { status: 'DELIVERED' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const clientIds = deliveredOrders.map((item) => item.client_id);
    const clients = clientIds.length
      ? await prisma.user.findMany({
          where: { id: { in: clientIds }, role: 'CLIENT' },
          select: {
            id: true,
            first_name: true,
            last_name: true,
            dni: true,
            phone: true,
            completed_orders_count: true,
            is_frequent: true,
          },
        })
      : [];

    return deliveredOrders.map((item) => {
      const client = clients.find((entry) => entry.id === item.client_id);

      return {
        client_id: item.client_id,
        first_name: client?.first_name ?? 'Desconocido',
        last_name: client?.last_name ?? '',
        dni: client?.dni ?? '',
        phone: client?.phone ?? '',
        delivered_orders_count: item._count.id,
        registered_completed_orders_count: client?.completed_orders_count ?? 0,
        is_frequent: client?.is_frequent ?? false,
      };
    });
  }

  async getOperatorsStats() {
    const operators = await prisma.operator.findMany({
      include: {
        user: {
          select: {
            first_name: true,
            last_name: true,
          },
        },
        specialties: true,
        orders: {
          where: {
            status: { in: ['READY', 'DELIVERED'] },
          },
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            payments: {
              where: { status: 'APPROVED' },
              select: {
                reviewed_at: true,
              },
              orderBy: { reviewed_at: 'asc' },
            },
          },
        },
      },
    });

    return operators
      .map((operator) => {
        const orderDurations = operator.orders
          .map((order) => {
            const firstApprovedPayment = order.payments.find((payment) => payment.reviewed_at);
            const startTime = firstApprovedPayment?.reviewed_at ?? order.created_at;

            return order.updated_at.getTime() - startTime.getTime();
          })
          .filter((duration) => duration >= 0);

        const averageTimeHours =
          orderDurations.length > 0
            ? Number(
                (
                  orderDurations.reduce((total, duration) => total + duration, 0) /
                  orderDurations.length /
                  (1000 * 60 * 60)
                ).toFixed(2),
              )
            : 0;

        return {
          operator_id: operator.id,
          first_name: operator.user.first_name,
          last_name: operator.user.last_name,
          specialties: operator.specialties.map((specialty) => specialty.specialty),
          orders_attended: operator.orders.length,
          average_time_hours: averageTimeHours,
        };
      })
      .sort((left, right) => right.orders_attended - left.orders_attended);
  }

  async getOrdersByStatusStats() {
    const groupedOrders = await prisma.order.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    return groupedOrders.map((group) => ({
      status: group.status,
      count: group._count.id,
    }));
  }

  async getAdminOrders(filters: OrdersFilters) {
    const createdAtFilter = buildDateFilter(filters.startDate, filters.endDate);
    const whereClause: Prisma.OrderWhereInput = {
      ...(filters.status ? { status: filters.status as Prisma.OrderWhereInput['status'] } : {}),
      ...(createdAtFilter ? { created_at: createdAtFilter } : {}),
    };

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        client: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            dni: true,
            phone: true,
            is_frequent: true,
          },
        },
        operator: {
          include: {
            user: {
              select: {
                first_name: true,
                last_name: true,
              },
            },
          },
        },
        service_type: true,
        material: true,
        payments: {
          orderBy: { created_at: 'asc' },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return {
      data: orders,
      total: orders.length,
    };
  }

  async getClients() {
    const clients = await prisma.user.findMany({
      where: { role: 'CLIENT' },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        dni: true,
        phone: true,
        completed_orders_count: true,
        is_frequent: true,
        created_at: true,
        _count: {
          select: {
            orders: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return {
      data: clients,
      total: clients.length,
    };
  }

  async getOperators() {
    const operators = await prisma.operator.findMany({
      include: {
        user: {
          select: {
            id: true,
            dni: true,
            first_name: true,
            last_name: true,
            phone: true,
            role: true,
            created_at: true,
          },
        },
        specialties: true,
        _count: {
          select: {
            orders: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return {
      data: operators,
      total: operators.length,
    };
  }

  async toggleOperator(operatorId: string) {
    const operator = await prisma.operator.findUnique({
      where: { id: operatorId },
      select: {
        id: true,
        is_active: true,
      },
    });

    if (!operator) {
      throw new Error('Operario no encontrado');
    }

    return prisma.operator.update({
      where: { id: operatorId },
      data: {
        is_active: !operator.is_active,
      },
      include: {
        user: {
          select: {
            id: true,
            dni: true,
            first_name: true,
            last_name: true,
            phone: true,
            role: true,
            created_at: true,
          },
        },
        specialties: true,
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });
  }

  async createOperator(input: CreateOperatorInput) {
    if (input.specialties.length === 0) {
      throw new Error('Debe asignar al menos una especialidad al operario');
    }

    const existingDni = await prisma.user.findUnique({ where: { dni: input.dni } });
    if (existingDni) {
      throw new Error('DNI ya registrado');
    }

    const existingPhone = await prisma.user.findUnique({ where: { phone: input.phone } });
    if (existingPhone) {
      throw new Error('Celular ya registrado');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          dni: input.dni,
          first_name: input.first_name,
          last_name: input.last_name,
          phone: input.phone,
          password_hash: passwordHash,
          role: Role.OPERATOR,
        },
      });

      const operator = await tx.operator.create({
        data: {
          user_id: user.id,
        },
      });

      await tx.operatorSpecialty.createMany({
        data: input.specialties.map((specialty) => ({
          operator_id: operator.id,
          specialty,
        })),
        skipDuplicates: true,
      });

      return tx.operator.findUnique({
        where: { id: operator.id },
        include: {
          user: {
            select: {
              id: true,
              dni: true,
              first_name: true,
              last_name: true,
              phone: true,
              role: true,
            },
          },
          specialties: true,
        },
      });
    });
  }

  async updateOperator(operatorId: string, input: UpdateOperatorInput) {
    const operator = await prisma.operator.findUnique({
      where: { id: operatorId },
      include: {
        user: true,
      },
    });

    if (!operator) {
      throw new Error('Operario no encontrado');
    }

    if (input.specialties && input.specialties.length === 0) {
      throw new Error('Debe asignar al menos una especialidad al operario');
    }

    if (input.dni && input.dni !== operator.user.dni) {
      const existingDni = await prisma.user.findUnique({ where: { dni: input.dni } });
      if (existingDni) {
        throw new Error('DNI ya registrado');
      }
    }

    if (input.phone && input.phone !== operator.user.phone) {
      const existingPhone = await prisma.user.findUnique({ where: { phone: input.phone } });
      if (existingPhone) {
        throw new Error('Celular ya registrado');
      }
    }

    return prisma.$transaction(async (tx) => {
      const userData: Prisma.UserUpdateInput = {};

      if (input.dni) {
        userData.dni = input.dni;
      }
      if (input.first_name) {
        userData.first_name = input.first_name;
      }
      if (input.last_name) {
        userData.last_name = input.last_name;
      }
      if (input.phone) {
        userData.phone = input.phone;
      }
      if (input.password) {
        userData.password_hash = await bcrypt.hash(input.password, 10);
      }

      if (Object.keys(userData).length > 0) {
        await tx.user.update({
          where: { id: operator.user_id },
          data: userData,
        });
      }

      if (input.specialties) {
        await tx.operatorSpecialty.deleteMany({
          where: { operator_id: operatorId },
        });

        await tx.operatorSpecialty.createMany({
          data: input.specialties.map((specialty) => ({
            operator_id: operatorId,
            specialty,
          })),
        });
      }

      return tx.operator.findUnique({
        where: { id: operatorId },
        include: {
          user: {
            select: {
              id: true,
              dni: true,
              first_name: true,
              last_name: true,
              phone: true,
              role: true,
            },
          },
          specialties: true,
        },
      });
    });
  }

  async deleteOperator(operatorId: string) {
    const operator = await prisma.operator.findUnique({
      where: { id: operatorId },
      include: {
        orders: {
          where: { status: 'IN_PROGRESS' },
          select: { id: true },
        },
      },
    });

    if (!operator) {
      throw new Error('Operario no encontrado');
    }

    if (operator.orders.length > 0) {
      throw new Error('No se puede eliminar un operario con pedidos activos en progreso');
    }

    await prisma.$transaction(async (tx) => {
      await tx.operatorSpecialty.deleteMany({
        where: { operator_id: operatorId },
      });

      await tx.operator.delete({
        where: { id: operatorId },
      });

      await tx.user.delete({
        where: { id: operator.user_id },
      });
    });
  }

  async updateClientFrequentStatus(clientId: string, input: ClientFrequentInput) {
    const client = await prisma.user.findFirst({
      where: { id: clientId, role: 'CLIENT' },
    });

    if (!client) {
      throw new Error('Cliente no encontrado');
    }

    return prisma.user.update({
      where: { id: clientId },
      data: {
        is_frequent: input.is_frequent,
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        dni: true,
        phone: true,
        completed_orders_count: true,
        is_frequent: true,
      },
    });
  }

  async exportOrdersReport(filters: OrdersFilters) {
    const ordersResult = await this.getAdminOrders(filters);

    const rows = ordersResult.data.map((order) => ({
      order_id: order.id,
      created_at: order.created_at.toISOString(),
      status: order.status,
      payment_condition: order.payment_condition,
      estimated_price: Number(order.estimated_price),
      advance_amount: order.advance_amount ? Number(order.advance_amount) : null,
      budget_expires_at: order.budget_expires_at.toISOString(),
      client_name: `${order.client.first_name} ${order.client.last_name}`,
      client_dni: order.client.dni,
      client_phone: order.client.phone,
      client_is_frequent: order.client.is_frequent ? 'YES' : 'NO',
      service_name: order.service_type.name,
      pricing_model: order.service_type.pricing_model,
      material_name: order.material.name,
      operator_name: order.operator
        ? `${order.operator.user.first_name} ${order.operator.user.last_name}`
        : 'UNASSIGNED',
      payments_count: order.payments.length,
      approved_payments_total: order.payments
        .filter((payment) => payment.status === 'APPROVED')
        .reduce((total, payment) => total + Number(payment.amount), 0),
      notes: order.notes ?? '',
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  parseSpecialties(rawSpecialties: string[]): Specialty[] {
    const parsed = sanitizeSpecialties(rawSpecialties);

    if (rawSpecialties.length > 0 && parsed.length !== rawSpecialties.length) {
      throw new Error('Especialidad inválida');
    }

    return parsed;
  }
}

export const adminService = new AdminService();
