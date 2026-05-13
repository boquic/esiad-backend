import {
  DeliveryStatus,
  FileType,
  OrderStatus,
  PaymentCondition,
  PaymentStatus,
  PaymentType,
  PrismaClient,
  PricingModel,
  Role,
  Specialty,
  TriggerEvent,
} from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type SyntheticUserInput = {
  dni: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: Role;
  completedOrdersCount?: number;
  isFrequent?: boolean;
};

type SyntheticOrderInput = {
  code: string;
  clientId: string;
  operatorId?: string;
  serviceTypeId: string;
  materialId: string;
  status: OrderStatus;
  paymentCondition: PaymentCondition;
  estimatedPrice: number;
  advanceAmount?: number;
  budgetExpiresAt: Date;
  createdAt: Date;
  notes?: string;
  fileType: FileType;
  fileUrl: string;
  payments?: Array<{
    amount: number;
    paymentType: PaymentType;
    status: PaymentStatus;
    createdAt: Date;
    reviewedAt?: Date;
    captureUrl?: string;
    adminComment?: string;
  }>;
  notifications?: Array<{
    triggerEvent: TriggerEvent;
    deliveryStatus: DeliveryStatus;
    sentAt: Date;
    whatsappMessageId?: string;
  }>;
};

function atUtc(daysOffset: number, hour: number, minute = 0): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysOffset);
  date.setUTCHours(hour, minute, 0, 0);
  return date;
}

async function upsertUser(input: SyntheticUserInput, passwordHash: string) {
  return prisma.user.upsert({
    where: { dni: input.dni },
    update: {
      first_name: input.firstName,
      last_name: input.lastName,
      phone: input.phone,
      password_hash: passwordHash,
      role: input.role,
      completed_orders_count: input.completedOrdersCount ?? 0,
      is_frequent: input.isFrequent ?? false,
    },
    create: {
      dni: input.dni,
      first_name: input.firstName,
      last_name: input.lastName,
      phone: input.phone,
      password_hash: passwordHash,
      role: input.role,
      completed_orders_count: input.completedOrdersCount ?? 0,
      is_frequent: input.isFrequent ?? false,
    },
  });
}

async function main() {
  console.log('Starting synthetic dashboard seed...');

  const passwordHash = await bcrypt.hash('sigeped123', 10);

  const syntheticDnis = [
    '00000000',
    '80000001',
    '80000002',
    '80000003',
    '70000001',
    '70000002',
    '70000003',
    '70000004',
    '70000005',
    '70000006',
  ];

  const syntheticUsers = await prisma.user.findMany({
    where: { dni: { in: syntheticDnis } },
    select: { id: true, dni: true },
  });

  const syntheticUserIds = syntheticUsers.map((user) => user.id);
  const syntheticOrderIds =
    syntheticUserIds.length > 0
      ? (
          await prisma.order.findMany({
            where: { client_id: { in: syntheticUserIds } },
            select: { id: true },
          })
        ).map((order) => order.id)
      : [];

  if (syntheticOrderIds.length > 0) {
    await prisma.notification.deleteMany({ where: { order_id: { in: syntheticOrderIds } } });
    await prisma.payment.deleteMany({ where: { order_id: { in: syntheticOrderIds } } });
    await prisma.orderFile.deleteMany({ where: { order_id: { in: syntheticOrderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: syntheticOrderIds } } });
  }

  if (syntheticUserIds.length > 0) {
    const syntheticOperators = await prisma.operator.findMany({
      where: { user_id: { in: syntheticUserIds } },
      select: { id: true },
    });

    const syntheticOperatorIds = syntheticOperators.map((operator) => operator.id);

    if (syntheticOperatorIds.length > 0) {
      await prisma.operatorSpecialty.deleteMany({
        where: { operator_id: { in: syntheticOperatorIds } },
      });
    }
  }

  const admin = await upsertUser(
    {
      dni: '00000000',
      firstName: 'Admin',
      lastName: 'Principal',
      phone: '900000000',
      role: Role.ADMIN,
    },
    passwordHash,
  );

  const operatorLaserUser = await upsertUser(
    {
      dni: '80000001',
      firstName: 'Lucia',
      lastName: 'Laser',
      phone: '900000001',
      role: Role.OPERATOR,
    },
    passwordHash,
  );

  const operatorPlottingUser = await upsertUser(
    {
      dni: '80000002',
      firstName: 'Pedro',
      lastName: 'Plotter',
      phone: '900000002',
      role: Role.OPERATOR,
    },
    passwordHash,
  );

  const operator3dUser = await upsertUser(
    {
      dni: '80000003',
      firstName: 'Mia',
      lastName: 'Modeler',
      phone: '900000003',
      role: Role.OPERATOR,
    },
    passwordHash,
  );

  const clientAna = await upsertUser(
    {
      dni: '70000001',
      firstName: 'Ana',
      lastName: 'Torres',
      phone: '900100001',
      role: Role.CLIENT,
      completedOrdersCount: 7,
      isFrequent: true,
    },
    passwordHash,
  );

  const clientBruno = await upsertUser(
    {
      dni: '70000002',
      firstName: 'Bruno',
      lastName: 'Diaz',
      phone: '900100002',
      role: Role.CLIENT,
      completedOrdersCount: 5,
      isFrequent: true,
    },
    passwordHash,
  );

  const clientCarla = await upsertUser(
    {
      dni: '70000003',
      firstName: 'Carla',
      lastName: 'Mejia',
      phone: '900100003',
      role: Role.CLIENT,
      completedOrdersCount: 3,
      isFrequent: false,
    },
    passwordHash,
  );

  const clientDiego = await upsertUser(
    {
      dni: '70000004',
      firstName: 'Diego',
      lastName: 'Ramos',
      phone: '900100004',
      role: Role.CLIENT,
      completedOrdersCount: 2,
      isFrequent: false,
    },
    passwordHash,
  );

  const clientElena = await upsertUser(
    {
      dni: '70000005',
      firstName: 'Elena',
      lastName: 'Paredes',
      phone: '900100005',
      role: Role.CLIENT,
      completedOrdersCount: 6,
      isFrequent: true,
    },
    passwordHash,
  );

  const clientFabian = await upsertUser(
    {
      dni: '70000006',
      firstName: 'Fabian',
      lastName: 'Lopez',
      phone: '900100006',
      role: Role.CLIENT,
      completedOrdersCount: 1,
      isFrequent: false,
    },
    passwordHash,
  );

  const laserOperator = await prisma.operator.upsert({
    where: { user_id: operatorLaserUser.id },
    update: {},
    create: { user_id: operatorLaserUser.id },
  });

  const plottingOperator = await prisma.operator.upsert({
    where: { user_id: operatorPlottingUser.id },
    update: {},
    create: { user_id: operatorPlottingUser.id },
  });

  const modelOperator = await prisma.operator.upsert({
    where: { user_id: operator3dUser.id },
    update: {},
    create: { user_id: operator3dUser.id },
  });

  await prisma.operatorSpecialty.createMany({
    data: [
      { operator_id: laserOperator.id, specialty: Specialty.LASER },
      { operator_id: plottingOperator.id, specialty: Specialty.PLOTTING },
      { operator_id: modelOperator.id, specialty: Specialty.PRINTING_3D },
      { operator_id: modelOperator.id, specialty: Specialty.MODEL },
    ],
    skipDuplicates: true,
  });

  const laser = await prisma.serviceType.upsert({
    where: { name: 'Corte Láser' },
    update: { pricing_model: PricingModel.PER_UNIT, is_active: true },
    create: {
      name: 'Corte Láser',
      pricing_model: PricingModel.PER_UNIT,
    },
  });

  const plotting = await prisma.serviceType.upsert({
    where: { name: 'Ploteo' },
    update: { pricing_model: PricingModel.PER_M2, is_active: true },
    create: {
      name: 'Ploteo',
      pricing_model: PricingModel.PER_M2,
    },
  });

  const printing3d = await prisma.serviceType.upsert({
    where: { name: 'Impresión 3D' },
    update: { pricing_model: PricingModel.PER_VOLUME, is_active: true },
    create: {
      name: 'Impresión 3D',
      pricing_model: PricingModel.PER_VOLUME,
    },
  });

  const model = await prisma.serviceType.upsert({
    where: { name: 'Maqueta' },
    update: { pricing_model: PricingModel.FIXED, is_active: true },
    create: {
      name: 'Maqueta',
      pricing_model: PricingModel.FIXED,
    },
  });

  const mdf3mm = await prisma.material.upsert({
    where: {
      service_type_id_name: { service_type_id: laser.id, name: 'MDF 3mm' },
    },
    update: { unit_price: 5.5, unit: 'unidad', is_active: true },
    create: {
      service_type_id: laser.id,
      name: 'MDF 3mm',
      unit_price: 5.5,
      unit: 'unidad',
    },
  });

  const acrylic2mm = await prisma.material.upsert({
    where: {
      service_type_id_name: { service_type_id: laser.id, name: 'Acrílico 2mm' },
    },
    update: { unit_price: 12, unit: 'unidad', is_active: true },
    create: {
      service_type_id: laser.id,
      name: 'Acrílico 2mm',
      unit_price: 12,
      unit: 'unidad',
    },
  });

  const bond75g = await prisma.material.upsert({
    where: {
      service_type_id_name: { service_type_id: plotting.id, name: 'Bond 75g' },
    },
    update: { unit_price: 3.5, unit: 'm2', is_active: true },
    create: {
      service_type_id: plotting.id,
      name: 'Bond 75g',
      unit_price: 3.5,
      unit: 'm2',
    },
  });

  const bond90g = await prisma.material.upsert({
    where: {
      service_type_id_name: { service_type_id: plotting.id, name: 'Bond 90g' },
    },
    update: { unit_price: 4.2, unit: 'm2', is_active: true },
    create: {
      service_type_id: plotting.id,
      name: 'Bond 90g',
      unit_price: 4.2,
      unit: 'm2',
    },
  });

  const pla = await prisma.material.upsert({
    where: {
      service_type_id_name: { service_type_id: printing3d.id, name: 'PLA' },
    },
    update: { unit_price: 0.85, unit: 'cm3', is_active: true },
    create: {
      service_type_id: printing3d.id,
      name: 'PLA',
      unit_price: 0.85,
      unit: 'cm3',
    },
  });

  const cardboard = await prisma.material.upsert({
    where: {
      service_type_id_name: { service_type_id: model.id, name: 'Carton pluma' },
    },
    update: { unit_price: 95, unit: 'proyecto', is_active: true },
    create: {
      service_type_id: model.id,
      name: 'Carton pluma',
      unit_price: 95,
      unit: 'proyecto',
    },
  });

  const syntheticOrders: SyntheticOrderInput[] = [
    {
      code: 'ORD-ADM-001',
      clientId: clientAna.id,
      operatorId: plottingOperator.id,
      serviceTypeId: plotting.id,
      materialId: bond90g.id,
      status: OrderStatus.DELIVERED,
      paymentCondition: PaymentCondition.CASH_ON_DELIVERY,
      estimatedPrice: 180,
      budgetExpiresAt: atUtc(-18, 18),
      createdAt: atUtc(-21, 10),
      notes: 'Pedido entregado y pagado en tienda.',
      fileType: FileType.PLAN_PDF,
      fileUrl: 'synthetic/orders/ord-adm-001-plan.pdf',
      payments: [
        {
          amount: 180,
          paymentType: PaymentType.FINAL,
          status: PaymentStatus.APPROVED,
          createdAt: atUtc(-16, 12),
          reviewedAt: atUtc(-16, 13),
        },
      ],
      notifications: [
        {
          triggerEvent: TriggerEvent.BUDGET_READY,
          deliveryStatus: DeliveryStatus.DELIVERED,
          sentAt: atUtc(-21, 11),
          whatsappMessageId: 'WA-ORD-ADM-001-A',
        },
        {
          triggerEvent: TriggerEvent.ORDER_READY,
          deliveryStatus: DeliveryStatus.DELIVERED,
          sentAt: atUtc(-17, 17),
          whatsappMessageId: 'WA-ORD-ADM-001-B',
        },
      ],
    },
    {
      code: 'ORD-ADM-002',
      clientId: clientAna.id,
      operatorId: laserOperator.id,
      serviceTypeId: laser.id,
      materialId: acrylic2mm.id,
      status: OrderStatus.READY,
      paymentCondition: PaymentCondition.CASH_ON_DELIVERY,
      estimatedPrice: 240,
      budgetExpiresAt: atUtc(-7, 20),
      createdAt: atUtc(-9, 9),
      notes: 'Listo para recoger; cliente pendiente de visita.',
      fileType: FileType.PLAN_DXF,
      fileUrl: 'synthetic/orders/ord-adm-002-plan.dxf',
      payments: [
        {
          amount: 240,
          paymentType: PaymentType.FINAL,
          status: PaymentStatus.APPROVED,
          createdAt: atUtc(-2, 15),
          reviewedAt: atUtc(-2, 16),
        },
      ],
      notifications: [
        {
          triggerEvent: TriggerEvent.ORDER_READY,
          deliveryStatus: DeliveryStatus.SENT,
          sentAt: atUtc(-2, 17),
          whatsappMessageId: 'WA-ORD-ADM-002-A',
        },
      ],
    },
    {
      code: 'ORD-ADM-003',
      clientId: clientBruno.id,
      operatorId: modelOperator.id,
      serviceTypeId: printing3d.id,
      materialId: pla.id,
      status: OrderStatus.IN_PROGRESS,
      paymentCondition: PaymentCondition.CASH_ON_DELIVERY,
      estimatedPrice: 320,
      budgetExpiresAt: atUtc(1, 18),
      createdAt: atUtc(-3, 14),
      notes: 'Impresion en curso para maqueta universitaria.',
      fileType: FileType.PLAN_PDF,
      fileUrl: 'synthetic/orders/ord-adm-003-plan.pdf',
      payments: [
        {
          amount: 120,
          paymentType: PaymentType.ADVANCE,
          status: PaymentStatus.APPROVED,
          createdAt: atUtc(-3, 16),
          reviewedAt: atUtc(-3, 17),
        },
      ],
      notifications: [
        {
          triggerEvent: TriggerEvent.PAYMENT_CONFIRMED,
          deliveryStatus: DeliveryStatus.DELIVERED,
          sentAt: atUtc(-3, 17),
          whatsappMessageId: 'WA-ORD-ADM-003-A',
        },
      ],
    },
    {
      code: 'ORD-ADM-004',
      clientId: clientCarla.id,
      serviceTypeId: laser.id,
      materialId: mdf3mm.id,
      status: OrderStatus.PENDING_PAYMENT,
      paymentCondition: PaymentCondition.ADVANCE_50,
      estimatedPrice: 110,
      advanceAmount: 55,
      budgetExpiresAt: atUtc(1, 20),
      createdAt: atUtc(-1, 11),
      notes: 'Esperando revision de captura Yape.',
      fileType: FileType.PLAN_DWG,
      fileUrl: 'synthetic/orders/ord-adm-004-plan.dwg',
      payments: [
        {
          amount: 55,
          paymentType: PaymentType.ADVANCE,
          status: PaymentStatus.PENDING,
          createdAt: atUtc(-1, 12),
          captureUrl: 'synthetic/payments/ord-adm-004-yape.jpg',
        },
      ],
      notifications: [
        {
          triggerEvent: TriggerEvent.BUDGET_READY,
          deliveryStatus: DeliveryStatus.SENT,
          sentAt: atUtc(-1, 11),
          whatsappMessageId: 'WA-ORD-ADM-004-A',
        },
      ],
    },
    {
      code: 'ORD-ADM-005',
      clientId: clientDiego.id,
      serviceTypeId: plotting.id,
      materialId: bond75g.id,
      status: OrderStatus.BUDGETED,
      paymentCondition: PaymentCondition.ADVANCE_50,
      estimatedPrice: 68,
      advanceAmount: 34,
      budgetExpiresAt: atUtc(1, 10),
      createdAt: atUtc(0, 8),
      notes: 'Presupuesto enviado; cliente aun no confirma.',
      fileType: FileType.PLAN_PDF,
      fileUrl: 'synthetic/orders/ord-adm-005-plan.pdf',
      notifications: [
        {
          triggerEvent: TriggerEvent.BUDGET_READY,
          deliveryStatus: DeliveryStatus.DELIVERED,
          sentAt: atUtc(0, 8, 30),
          whatsappMessageId: 'WA-ORD-ADM-005-A',
        },
      ],
    },
    {
      code: 'ORD-ADM-006',
      clientId: clientElena.id,
      operatorId: modelOperator.id,
      serviceTypeId: model.id,
      materialId: cardboard.id,
      status: OrderStatus.DELIVERED,
      paymentCondition: PaymentCondition.CASH_ON_DELIVERY,
      estimatedPrice: 450,
      budgetExpiresAt: atUtc(-28, 19),
      createdAt: atUtc(-32, 10),
      notes: 'Proyecto de maqueta entregado completo.',
      fileType: FileType.PLAN_PDF,
      fileUrl: 'synthetic/orders/ord-adm-006-plan.pdf',
      payments: [
        {
          amount: 450,
          paymentType: PaymentType.FINAL,
          status: PaymentStatus.APPROVED,
          createdAt: atUtc(-29, 18),
          reviewedAt: atUtc(-29, 18, 30),
        },
      ],
      notifications: [
        {
          triggerEvent: TriggerEvent.ORDER_READY,
          deliveryStatus: DeliveryStatus.DELIVERED,
          sentAt: atUtc(-30, 15),
          whatsappMessageId: 'WA-ORD-ADM-006-A',
        },
      ],
    },
    {
      code: 'ORD-ADM-007',
      clientId: clientFabian.id,
      serviceTypeId: printing3d.id,
      materialId: pla.id,
      status: OrderStatus.EXPIRED,
      paymentCondition: PaymentCondition.ADVANCE_50,
      estimatedPrice: 95,
      advanceAmount: 47.5,
      budgetExpiresAt: atUtc(-4, 9),
      createdAt: atUtc(-6, 9),
      notes: 'Presupuesto expirado por falta de confirmacion.',
      fileType: FileType.PLAN_PDF,
      fileUrl: 'synthetic/orders/ord-adm-007-plan.pdf',
    },
    {
      code: 'ORD-ADM-008',
      clientId: clientBruno.id,
      operatorId: plottingOperator.id,
      serviceTypeId: plotting.id,
      materialId: bond90g.id,
      status: OrderStatus.CANCELLED,
      paymentCondition: PaymentCondition.ADVANCE_50,
      estimatedPrice: 130,
      advanceAmount: 65,
      budgetExpiresAt: atUtc(-11, 17),
      createdAt: atUtc(-12, 10),
      notes: 'Pedido cancelado por cambio de requerimientos.',
      fileType: FileType.PLAN_PDF,
      fileUrl: 'synthetic/orders/ord-adm-008-plan.pdf',
      payments: [
        {
          amount: 65,
          paymentType: PaymentType.ADVANCE,
          status: PaymentStatus.REJECTED,
          createdAt: atUtc(-12, 12),
          reviewedAt: atUtc(-12, 14),
          captureUrl: 'synthetic/payments/ord-adm-008-yape.jpg',
          adminComment: 'La captura no permite verificar la operacion.',
        },
      ],
    },
  ];

  for (const orderInput of syntheticOrders) {
    const order = await prisma.order.create({
      data: {
        client_id: orderInput.clientId,
        operator_id: orderInput.operatorId,
        service_type_id: orderInput.serviceTypeId,
        material_id: orderInput.materialId,
        status: orderInput.status,
        payment_condition: orderInput.paymentCondition,
        estimated_price: orderInput.estimatedPrice,
        advance_amount: orderInput.advanceAmount,
        budget_expires_at: orderInput.budgetExpiresAt,
        notes: `${orderInput.code} | ${orderInput.notes ?? 'Synthetic dashboard record'}`,
        created_at: orderInput.createdAt,
      },
    });

    await prisma.orderFile.create({
      data: {
        order_id: order.id,
        file_url: orderInput.fileUrl,
        file_type: orderInput.fileType,
      },
    });

    if (orderInput.payments) {
      for (const payment of orderInput.payments) {
        await prisma.payment.create({
          data: {
            order_id: order.id,
            amount: payment.amount,
            payment_type: payment.paymentType,
            capture_url: payment.captureUrl,
            status: payment.status,
            admin_comment: payment.adminComment,
            created_at: payment.createdAt,
            reviewed_at: payment.reviewedAt,
          },
        });
      }
    }

    if (orderInput.notifications) {
      await prisma.notification.createMany({
        data: orderInput.notifications.map((notification) => ({
          order_id: order.id,
          user_id: orderInput.clientId,
          trigger_event: notification.triggerEvent,
          delivery_status: notification.deliveryStatus,
          sent_at: notification.sentAt,
          whatsapp_message_id: notification.whatsappMessageId,
        })),
      });
    }
  }

  console.log('Synthetic admin dashboard data created successfully.');
  console.log(`Admin credentials: ${admin.dni} / sigeped123`);
  console.log('Operator credentials: 80000001, 80000002, 80000003 / sigeped123');
  console.log('Client credentials: 70000001 to 70000006 / sigeped123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
