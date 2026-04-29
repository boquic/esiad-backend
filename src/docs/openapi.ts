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
    },
    {
      name: 'Services',
      description: 'Catálogo de servicios'
    },
    {
      name: 'Materials',
      description: 'Catálogo de materiales'
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
      },
      ServiceType: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' },
          name: { type: 'string', example: 'Corte Láser' },
          pricing_model: { type: 'string', enum: ['FIXED', 'PER_M2', 'PER_UNIT', 'PER_VOLUME'], example: 'PER_UNIT' },
          is_active: { type: 'boolean', example: true },
          created_at: { type: 'string', format: 'date-time' }
        }
      },
      ServicesResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/ServiceType'
            }
          }
        }
      },
      CreateServiceRequest: {
        type: 'object',
        required: ['name', 'pricing_model'],
        properties: {
          name: { type: 'string', example: 'Corte Láser' },
          pricing_model: { type: 'string', enum: ['FIXED', 'PER_M2', 'PER_UNIT', 'PER_VOLUME'], example: 'PER_UNIT' }
        }
      },
      CreateServiceResponse: {
        type: 'object',
        properties: {
          data: {
            $ref: '#/components/schemas/ServiceType'
          }
        }
      },
      UpdateServiceRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Corte Láser Modificado' },
          pricing_model: { type: 'string', enum: ['FIXED', 'PER_M2', 'PER_UNIT', 'PER_VOLUME'], example: 'PER_UNIT' },
          is_active: { type: 'boolean', example: true }
        }
      },
      Material: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'd290f1ee-6c54-4b01-90e6-d701748f0851' },
          service_type_id: { type: 'string', example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' },
          name: { type: 'string', example: 'MDF 3mm' },
          unit_price: { type: 'number', example: 5.50 },
          unit: { type: 'string', example: 'unidad' },
          is_active: { type: 'boolean', example: true },
          created_at: { type: 'string', format: 'date-time' }
        }
      },
      MaterialsResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Material'
            }
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
    },
    '/api/services': {
      get: {
        tags: ['Services'],
        summary: 'Lista todos los servicios activos',
        responses: {
          200: {
            description: 'Lista de servicios',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ServicesResponse'
                }
              }
            }
          },
          500: {
            description: 'Error del servidor',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['Services'],
        summary: 'Crea un nuevo servicio (solo Admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateServiceRequest'
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Servicio creado',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreateServiceResponse'
                }
              }
            }
          },
          400: {
            description: 'Campos faltantes o modelo inválido',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          401: {
            description: 'No autorizado',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          403: {
            description: 'Prohibido - No es Admin',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          409: {
            description: 'Nombre duplicado',
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
    '/api/services/{id}': {
      patch: {
        tags: ['Services'],
        summary: 'Edita un servicio existente (solo Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'ID del servicio'
          }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UpdateServiceRequest'
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Servicio actualizado',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreateServiceResponse'
                }
              }
            }
          },
          401: {
            description: 'No autorizado',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          403: {
            description: 'Prohibido - No es Admin',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          404: {
            description: 'Servicio no encontrado',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          409: {
            description: 'Nombre duplicado',
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
    '/api/materials': {
      get: {
        tags: ['Materials'],
        summary: 'Lista materiales activos',
        parameters: [
          {
            name: 'serviceTypeId',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'uuid' },
            description: 'Filtrar por ID de tipo de servicio'
          }
        ],
        responses: {
          200: {
            description: 'Lista de materiales',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/MaterialsResponse'
                }
              }
            }
          },
          500: {
            description: 'Error del servidor',
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
