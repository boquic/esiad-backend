import request from 'supertest';
import { app } from '../../app';
import { prisma } from '../../config/database';
import bcrypt from 'bcrypt';

describe('Auth Controller (Integration)', () => {
  beforeAll(async () => {
    // Clean up DB before all tests
    await prisma.user.deleteMany({
      where: {
        OR: [
          { dni: { in: ['12345678', '87654321'] } },
          { phone: { in: ['999888777', '999888666'] } }
        ]
      }
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        OR: [
          { dni: { in: ['12345678', '87654321'] } },
          { phone: { in: ['999888777', '999888666'] } }
        ]
      }
    });
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user and return 201', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          dni: '12345678',
          first_name: 'Test',
          last_name: 'User',
          phone: '999888777',
          password: 'password123'
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.dni).toBe('12345678');
      expect(res.body.data).not.toHaveProperty('password_hash');
    });

    it('should return 400 if fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          dni: '12345678'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe(true);
    });

    it('should return 409 if DNI already exists', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          dni: '12345678',
          first_name: 'Test',
          last_name: 'User2',
          phone: '999888666',
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
          identifier: '12345678',
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Credenciales invalidas');
    });

    it('should login user and return token and return 200', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: '12345678',
          password: 'password123'
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.dni).toBe('12345678');
    });
  });
});
