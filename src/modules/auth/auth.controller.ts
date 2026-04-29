import { Request, Response } from 'express';
import { AuthService } from './auth.service';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response): Promise<any> {
    try {
      const dni = req.body.dni?.trim();
      const first_name = req.body.first_name?.trim() ?? req.body.firstName?.trim();
      const last_name = req.body.last_name?.trim() ?? req.body.lastName?.trim();
      const phone = req.body.phone?.trim();
      const password = req.body.password;

      // Validar campos vacíos (Bad Request 400)
      if (!dni || !first_name || !last_name || !phone || !password) {
        return res.status(400).json({ error: true, message: 'Todos los campos son requeridos' });
      }

      // Interacción con el servicio
      const user = await authService.register({ dni, first_name, last_name, phone, password });
      
      // Operación exitosa (Created 201)
      return res.status(201).json({ data: user });
    } catch (error: any) {
      // Conflictos (DNI o celular duplicado 409)
      if (error.message === 'DNI ya registrado' || error.message === 'Celular ya registrado') {
        return res.status(409).json({ error: true, message: error.message });
      }
      return res.status(500).json({ error: true, message: 'Error interno del servidor' });
    }
  }

  async login(req: Request, res: Response): Promise<any> {
    try {
      const identifier = req.body.identifier?.trim() ?? req.body.dni?.trim() ?? req.body.phone?.trim();
      const password = req.body.password;

      console.log('Login attempt:', { identifier, password });
      if (!identifier || !password) {
      }

      const result = await authService.login({ identifier, password });
      
      return res.status(200).json({ data: result });
    } catch (error: any) {
      if (error.message === 'Credenciales inválidas') {
        return res.status(401).json({ error: true, message: error.message });
      }
      return res.status(500).json({ error: true, message: 'Error interno del servidor' });
    }
  }
}
