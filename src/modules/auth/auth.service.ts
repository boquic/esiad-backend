import { prisma } from '../../config/database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ENV } from '../../config/env';

export class AuthService {
  async register(data: any) {
    const { dni, first_name, last_name, phone, password } = data;

    // Verificar si el DNI ya está registrado
    const existingDni = await prisma.user.findUnique({ where: { dni } });
    if (existingDni) {
      throw new Error('DNI ya registrado');
    }

    // Verificar si el celular ya está registrado
    const existingPhone = await prisma.user.findUnique({ where: { phone } });
    if (existingPhone) {
      throw new Error('Celular ya registrado');
    }

    // Hashear la contraseña (salt rounds = 10)
    const password_hash = await bcrypt.hash(password, 10);

    // Crear el usuario con rol de cliente por defecto
    const newUser = await prisma.user.create({
      data: {
        dni,
        first_name,
        last_name,
        phone,
        password_hash,
        role: 'CLIENT'
      }
    });

    // Excluir la contraseña al devolver la respuesta
    const { password_hash: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  async login(data: any) {
    const { identifier, password } = data;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { dni: identifier },
          { phone: identifier }
        ]
      }
    });

    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Credenciales inválidas');
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, is_frequent: user.is_frequent },
      ENV.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const { password_hash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token
    };
  }
}
