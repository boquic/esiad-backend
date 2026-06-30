import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { BadRequestError } from '../../utils/errors';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response): Promise<Response> {
    const dni = req.body.dni?.trim();
    const first_name = req.body.first_name?.trim() ?? req.body.firstName?.trim();
    const last_name = req.body.last_name?.trim() ?? req.body.lastName?.trim();
    const phone = req.body.phone?.trim();
    const password = req.body.password;

    if (!dni || !first_name || !last_name || !phone || !password) {
      throw new BadRequestError('Todos los campos son requeridos');
    }

    const user = await authService.register({ dni, first_name, last_name, phone, password });
    return res.status(201).json({ data: user });
  }

  async login(req: Request, res: Response): Promise<Response> {
    const identifier = req.body.identifier?.trim() ?? req.body.dni?.trim() ?? req.body.phone?.trim();
    const password = req.body.password;

    if (!identifier || !password) {
      throw new BadRequestError('El identificador y la contrasena son requeridos');
    }

    const result = await authService.login({ identifier, password });
    return res.status(200).json({ data: result });
  }

  async verify(req: Request, res: Response): Promise<Response> {
    const identifier = req.body.identifier?.trim() ?? req.body.dni?.trim() ?? req.body.phone?.trim();
    const password = req.body.password;
    const code = req.body.code?.toString().trim();

    if (!identifier || !password || !code) {
      throw new BadRequestError('El identificador, la contrasena y el codigo son requeridos');
    }

    const result = await authService.verifyTwoFactor({ identifier, password, code });
    return res.status(200).json({ data: result });
  }
}
