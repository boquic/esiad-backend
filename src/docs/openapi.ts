export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'ESIAD Backend API',
    version: '1.0.0',
    description: 'Documentación OpenAPI para autenticación y salud del backend de ESIAD Proyectos.'
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Servidor local'
    }
  ],
  tags: [
    {
      name: 'Auth',
      description: 'Registro e inicio de sesión'
    },
    {
      name: 'Health',
      description: 'Verificación de estado del servicio'
    }
  ],
  components: {
    schemas: {
      RegisterRequest: {
        type: 'object',
        required: ['dni', 'first_name', 'last_name', 'phone', 'password'],
        properties: {
          dni: {
            type: 'string',
            example: '71234567'
          },
          first_name: {
            type: 'string',
            example: 'Juan'
          },
          last_name: {
            type: 'string',
            example: 'Pérez'
          },
          phone: {
            type: 'string',
            example: '987654321'
          },
          password: {
            type: 'string',
            example: 'MiClave123!'
          }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['identifier', 'password'],
        properties: {
          identifier: {
            type: 'string',
            example: '71234567'
          },
          password: {
            type: 'string',
            example: 'MiClave123!'
          }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '8b0c2c8f-5f26-4f88-9c78-8d7f3c4f2c1a' },
          dni: { type: 'string', example: '71234567' },
          first_name: { type: 'string', example: 'Juan' },
          last_name: { type: 'string', example: 'Pérez' },
          phone: { type: 'string', example: '987654321' },
          role: { type: 'string', example: 'CLIENT' },
          completed_orders_count: { type: 'number', example: 0 },
          is_frequent: { type: 'boolean', example: false },
          created_at: { type: 'string', format: 'date-time' }
        }
      },
      AuthTokenResponse: {
        type: 'object',
        properties: {
          user: {
            $ref: '#/components/schemas/User'
          },
          token: {
            type: 'string',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
          }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'boolean',
            example: true
          },
          message: {
            type: 'string',
            example: 'Todos los campos son requeridos'
          }
        }
      },
      RegisterResponse: {
        type: 'object',
        properties: {
          data: {
            $ref: '#/components/schemas/User'
          }
        }
      },
      LoginResponse: {
        type: 'object',
        properties: {
          data: {
            $ref: '#/components/schemas/AuthTokenResponse'
          }
        }
      }
    }
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Verifica si la API y la base de datos responden',
        responses: {
          200: {
            description: 'Servicio en línea'
          },
          500: {
            description: 'Base de datos desconectada'
          }
        }
      }
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Registra un usuario cliente',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/RegisterRequest'
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Usuario creado',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/RegisterResponse'
                }
              }
            }
          },
          400: {
            description: 'Campos faltantes',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          409: {
            description: 'DNI o celular duplicado',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Inicia sesión con DNI o celular',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/LoginRequest'
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Login correcto',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/LoginResponse'
                }
              }
            }
          },
          400: {
            description: 'Campos faltantes',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          401: {
            description: 'Credenciales inválidas',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    }
  }
} as const;
