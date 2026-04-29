import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting seed...');

  // 1. Crear Admin
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { dni: '00000000' },
    update: {},
    create: {
      dni: '00000000',
      first_name: 'Admin',
      last_name: 'Principal',
      phone: '000000000',
      password_hash: adminPassword,
      role: 'ADMIN',
    },
  });
  console.log('✅ Admin user created:', admin.dni);

  // 2. Crear Tipos de Servicios
  const laser = await prisma.serviceType.upsert({
    where: { name: 'Corte Láser' },
    update: {},
    create: {
      name: 'Corte Láser',
      pricing_model: 'PER_UNIT',
    },
  });

  const plotting = await prisma.serviceType.upsert({
    where: { name: 'Ploteo' },
    update: {},
    create: {
      name: 'Ploteo',
      pricing_model: 'PER_M2',
    },
  });

  const printing3d = await prisma.serviceType.upsert({
    where: { name: 'Impresión 3D' },
    update: {},
    create: {
      name: 'Impresión 3D',
      pricing_model: 'PER_VOLUME',
    },
  });
  console.log('✅ Service types created');

  // 3. Crear Materiales
  await prisma.material.upsert({
    where: { service_type_id_name: { service_type_id: laser.id, name: 'MDF 3mm' } },
    update: {},
    create: {
      service_type_id: laser.id,
      name: 'MDF 3mm',
      unit_price: 5.50,
      unit: 'unidad',
    },
  });

  await prisma.material.upsert({
    where: { service_type_id_name: { service_type_id: laser.id, name: 'Acrílico 2mm' } },
    update: {},
    create: {
      service_type_id: laser.id,
      name: 'Acrílico 2mm',
      unit_price: 12.00,
      unit: 'unidad',
    },
  });

  await prisma.material.upsert({
    where: { service_type_id_name: { service_type_id: plotting.id, name: 'Bond 75g' } },
    update: {},
    create: {
      service_type_id: plotting.id,
      name: 'Bond 75g',
      unit_price: 3.50,
      unit: 'm2',
    },
  });

  console.log('✅ Materials created');
  console.log('✨ Seed finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
