import { Request, Response } from 'express';
import { AuthService } from './auth.service';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response): Promise<Response> {
    try {
      const dni = req.body.dni?.trim();
      const first_name = req.body.first_name?.trim() ?? req.body.firstName?.trim();
      const last_name = req.body.last_name?.trim() ?? req.body.lastName?.trim();
      const phone = req.body.phone?.trim();
      const password = req.body.password;

      if (!dni || !first_name || !last_name || !phone || !password) {
        return res.status(400).json({ error: true, message: 'Todos los campos son requeridos' });
      }

      const user = await authService.register({ dni, first_name, last_name, phone, password });
      return res.status(201).json({ data: user });
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        (error.message === 'DNI ya registrado' || error.message === 'Celular ya registrado')
      ) {
        return res.status(409).json({ error: true, message: error.message });
      }

      return res.status(500).json({ error: true, message: 'Error interno del servidor' });
    }
  }

  async login(req: Request, res: Response): Promise<Response> {
    try {
      const identifier = req.body.identifier?.trim() ?? req.body.dni?.trim() ?? req.body.phone?.trim();
      const password = req.body.password;

      if (!identifier || !password) {
        return res.status(400).json({ error: true, message: 'El identificador y la contrasena son requeridos' });
      }

      const result = await authService.login({ identifier, password });
      return res.status(200).json({ data: result });
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'Credenciales invalidas') {
        return res.status(401).json({ error: true, message: error.message });
      }

      return res.status(500).json({ error: true, message: 'Error interno del servidor' });
    }
  }
}
