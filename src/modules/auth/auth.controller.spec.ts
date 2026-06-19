import request from 'supertest';
import { app } from '../../app';
import { prisma } from '../../config/database';
import bcrypt from 'bcrypt';

const generateRandomNum = (len: number) => Math.random().toString().slice(2, 2 + len);

describe('Auth Controller (Integration)', () => {
  const testUser = {
    dni: generateRandomNum(8),
    phone: generateRandomNum(9),
  };
  const testUser2 = {
    dni: generateRandomNum(8),
    phone: generateRandomNum(9),
  };

  beforeAll(async () => {
    // Clean up DB before all tests
    await prisma.notification.deleteMany({
      where: { user: { dni: { in: [testUser.dni, testUser2.dni] } } }
    });
    await prisma.user.deleteMany({
      where: { dni: { in: [testUser.dni, testUser2.dni] } }
    });
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({
      where: { user: { dni: { in: [testUser.dni, testUser2.dni] } } }
    });
    await prisma.user.deleteMany({
      where: { dni: { in: [testUser.dni, testUser2.dni] } }
    });
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user and return 201', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          dni: testUser.dni,
          first_name: 'Test',
          last_name: 'User',
          phone: testUser.phone,
          password: 'password123'
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.dni).toBe(testUser.dni);
      expect(res.body.data).not.toHaveProperty('password_hash');
    });

    it('should return 400 if fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          dni: testUser.dni
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe(true);
    });

    it('should return 409 if DNI already exists', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          dni: testUser.dni,
          first_name: 'Test',
          last_name: 'User2',
          phone: testUser2.phone,
          password: 'password123'
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('DNI ya registrado');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return 401 for invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: testUser.dni,
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Credenciales invalidas');
    });

    it('should login user and return token and return 200', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: testUser.dni,
          password: 'password123'
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.dni).toBe(testUser.dni);
    });
  });
});
