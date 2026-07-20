import { Role, User } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import { ENV } from '../../config/env';
import { prisma } from '../../config/database';
import { notificationsService } from '../notifications/notifications.service';
import { ConflictError, UnauthorizedError } from '../../utils/errors';

const TOTP_ISSUER = 'SIGEPED';

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

type VerifyInput = LoginInput & {
  code: string;
};

// Nunca exponemos el hash ni el secreto TOTP.
type SafeUser = Omit<User, 'password_hash' | 'two_factor_secret'>;

type AuthTokenPayload = {
  id: string;
  role: Role;
  is_frequent: boolean;
};

// Respuesta del paso 1 del login. Para CLIENT (HU-19: sin 2FA) ya viene con
// el token; para OPERATOR/ADMIN sigue siendo el reto 2FA (sin token todavía).
type LoginChallenge =
  | { requires_2fa_setup: true; otpauth_url: string; secret: string }
  | { requires_2fa: true }
  | { user: SafeUser; token: string };

function toSafeUser(user: User): SafeUser {
  const { password_hash: _p, two_factor_secret: _s, ...safe } = user;
  return safe;
}

export class AuthService {
  async register(data: RegisterInput): Promise<SafeUser> {
    const { dni, first_name, last_name, phone, password } = data;

    const existingDni = await prisma.user.findUnique({ where: { dni } });
    if (existingDni) {
      throw new ConflictError('DNI ya registrado');
    }

    const existingPhone = await prisma.user.findUnique({ where: { phone } });
    if (existingPhone) {
      throw new ConflictError('Celular ya registrado');
    }

    const password_hash = await bcrypt.hash(password, 10);

    // Se genera el secreto TOTP al crear la cuenta; el enrolamiento (QR)
    // se entrega en el primer login y se confirma al verificar el codigo.
    const newUser = await prisma.user.create({
      data: {
        dni,
        first_name,
        last_name,
        phone,
        password_hash,
        role: 'CLIENT',
        two_factor_secret: authenticator.generateSecret(),
        two_factor_enabled: false,
      },
    });

    // BUG-01: el usuario YA quedó creado en este punto. El mensaje de bienvenida
    // es un efecto secundario informativo (WhatsApp/Twilio); si falla (credenciales
    // mal configuradas, timeout, etc.) no debe hacer fallar el registro ni devolver
    // un falso "Error interno del servidor" a un registro que sí fue exitoso.
    try {
      await notificationsService.sendWelcomeMessage(newUser.first_name, newUser.phone);
    } catch (error) {
      console.error('No se pudo enviar el mensaje de bienvenida (registro completado igualmente):', error);
    }

    return toSafeUser(newUser);
  }

  // Paso 1: valida credenciales. RULE-01/HU-19: el rol CLIENT omite el 2FA
  // por completo y recibe el token de una vez, para entrar rapido con solo
  // DNI + contrasena. OPERATOR y ADMIN mantienen el reto 2FA (DUDA-05).
  async login(data: LoginInput): Promise<LoginChallenge> {
    const user = await this.validateCredentials(data);

    if (user.role === 'CLIENT') {
      return { user: toSafeUser(user), token: this.issueToken(user) };
    }

    // Usuarios previos a 2FA (seed/migracion) pueden no tener secreto: se provisiona.
    let secret = user.two_factor_secret;
    if (!secret) {
      secret = authenticator.generateSecret();
      await prisma.user.update({
        where: { id: user.id },
        data: { two_factor_secret: secret },
      });
    }

    if (!user.two_factor_enabled) {
      return {
        requires_2fa_setup: true,
        otpauth_url: authenticator.keyuri(user.dni, TOTP_ISSUER, secret),
        secret,
      };
    }

    return { requires_2fa: true };
  }

  // Paso 2: valida credenciales + codigo TOTP y emite el JWT.
  async verifyTwoFactor(data: VerifyInput): Promise<{ user: SafeUser; token: string }> {
    const user = await this.validateCredentials(data);

    if (!user.two_factor_secret) {
      throw new UnauthorizedError('2FA no inicializado; vuelva a iniciar sesion');
    }

    const isValid = authenticator.verify({ token: data.code, secret: user.two_factor_secret });
    if (!isValid) {
      throw new UnauthorizedError('Codigo 2FA invalido');
    }

    // Primer login valido: queda enrolado.
    let current = user;
    if (!user.two_factor_enabled) {
      current = await prisma.user.update({
        where: { id: user.id },
        data: { two_factor_enabled: true },
      });
    }

    return { user: toSafeUser(current), token: this.issueToken(current) };
  }

  private issueToken(user: User): string {
    const payload: AuthTokenPayload = {
      id: user.id,
      role: user.role,
      is_frequent: user.is_frequent,
    };

    return jwt.sign(payload, ENV.JWT_SECRET, {
      expiresIn: ENV.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });
  }

  private async validateCredentials({ identifier, password }: LoginInput): Promise<User> {
    const user = await prisma.user.findFirst({
      where: { OR: [{ dni: identifier }, { phone: identifier }] },
    });

    if (!user) {
      throw new UnauthorizedError('Credenciales invalidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Credenciales invalidas');
    }

    return user;
  }
}
