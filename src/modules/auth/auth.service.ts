import { Role, User } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ENV } from '../../config/env';
import { prisma } from '../../config/database';

type RegisterInput = {
  dni: string;
  first_name: string;
  last_name: string;
  phone: string;
  password: string;
};

type LoginInput = {
  identifier: string;
  password: string;
};

type SafeUser = Omit<User, 'password_hash'>;

type AuthTokenPayload = {
  id: string;
  role: Role;
  is_frequent: boolean;
};

export class AuthService {
  async register(data: RegisterInput): Promise<SafeUser> {
    const { dni, first_name, last_name, phone, password } = data;

    const existingDni = await prisma.user.findUnique({ where: { dni } });
    if (existingDni) {
      throw new Error('DNI ya registrado');
    }

    const existingPhone = await prisma.user.findUnique({ where: { phone } });
    if (existingPhone) {
      throw new Error('Celular ya registrado');
    }

    const password_hash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        dni,
        first_name,
        last_name,
        phone,
        password_hash,
        role: 'CLIENT',
      },
    });

    const { password_hash: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  async login(data: LoginInput): Promise<{ user: SafeUser; token: string }> {
    const { identifier, password } = data;

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ dni: identifier }, { phone: identifier }],
      },
    });

    if (!user) {
      throw new Error('Credenciales invalidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Credenciales invalidas');
    }

    const payload: AuthTokenPayload = {
      id: user.id,
      role: user.role,
      is_frequent: user.is_frequent,
    };

    const token = jwt.sign(payload, ENV.JWT_SECRET, {
      expiresIn: ENV.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });

    const { password_hash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  }
}
