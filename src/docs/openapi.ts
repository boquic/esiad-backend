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
    },
    {
      name: 'Orders',
      description: 'Gestión de pedidos (clientes)'
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
      },
      CreateMaterialRequest: {
        type: 'object',
        required: ['service_type_id', 'name', 'unit_price', 'unit'],
        properties: {
          service_type_id: { type: 'string', format: 'uuid', example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' },
          name: { type: 'string', example: 'MDF 3mm' },
          unit_price: { type: 'number', example: 5.50 },
          unit: { type: 'string', example: 'unidad' }
        }
      },
      CreateMaterialResponse: {
        type: 'object',
        properties: {
          data: {
            $ref: '#/components/schemas/Material'
          }
        }
      },
      UpdateMaterialRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'MDF 3mm Modificado' },
          unit_price: { type: 'number', example: 6.00 },
          unit: { type: 'string', example: 'unidad' },
          is_active: { type: 'boolean', example: true }
        }
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d' },
          client_id: { type: 'string', example: '8b0c2c8f-5f26-4f88-9c78-8d7f3c4f2c1a' },
          service_type_id: { type: 'string', example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' },
          material_id: { type: 'string', example: 'd290f1ee-6c54-4b01-90e6-d701748f0851' },
          status: { type: 'string', enum: ['BUDGETED', 'PENDING_PAYMENT', 'IN_PROGRESS', 'READY', 'DELIVERED', 'CANCELLED', 'EXPIRED'], example: 'BUDGETED' },
          payment_condition: { type: 'string', enum: ['ADVANCE_50', 'CASH_ON_DELIVERY'], example: 'ADVANCE_50' },
          estimated_price: { type: 'number', example: 150.00 },
          advance_amount: { type: 'number', nullable: true, example: 75.00 },
          budget_expires_at: { type: 'string', format: 'date-time' },
          notes: { type: 'string', nullable: true, example: 'Corte con borde pulido' },
          created_at: { type: 'string', format: 'date-time' },
          service_type: { $ref: '#/components/schemas/ServiceType' },
          material: { $ref: '#/components/schemas/Material' },
          files: { type: 'array', items: { $ref: '#/components/schemas/OrderFile' } },
          payments: { type: 'array', items: { $ref: '#/components/schemas/Payment' } }
        }
      },
      CreateOrderRequest: {
        type: 'object',
        required: ['service_type_id', 'material_id'],
        properties: {
          service_type_id: { type: 'string', format: 'uuid', example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' },
          material_id: { type: 'string', format: 'uuid', example: 'd290f1ee-6c54-4b01-90e6-d701748f0851' },
          quantity: { type: 'number', example: 10 },
          area: { type: 'number', example: 2.5 },
          volume: { type: 'number', example: 100 },
          notes: { type: 'string', example: 'Notas adicionales' }
        }
      },
      OrderResponse: {
        type: 'object',
        properties: {
          data: { $ref: '#/components/schemas/Order' }
        }
      },
      OrdersListResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/Order' }
          }
        }
      },
      OrderFile: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'e1f2a3b4-c5d6-4e5f-8g9h-0i1j2k3l4m5n' },
          order_id: { type: 'string', example: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d' },
          file_url: { type: 'string', example: '/uploads/plano-123.pdf' },
          file_type: { type: 'string', enum: ['PLAN_DWG', 'PLAN_DXF', 'PLAN_PDF'], example: 'PLAN_PDF' },
          uploaded_at: { type: 'string', format: 'date-time' }
        }
      },
      Payment: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'p1q2r3s4-t5u6-4v5w-8x9y-0z1a2b3c4d5e' },
          order_id: { type: 'string', example: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d' },
          amount: { type: 'number', example: 75.00 },
          payment_type: { type: 'string', enum: ['ADVANCE', 'FINAL'], example: 'ADVANCE' },
          status: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'], example: 'PENDING' },
          capture_url: { type: 'string', nullable: true, example: '/uploads/pago-123.jpg' },
          admin_comment: { type: 'string', nullable: true, example: 'Comprobante válido' },
          created_at: { type: 'string', format: 'date-time' }
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
      },
      post: {
        tags: ['Materials'],
        summary: 'Crea un nuevo material (solo Admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateMaterialRequest'
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Material creado',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreateMaterialResponse'
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
            description: 'Tipo de servicio no encontrado',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          409: {
            description: 'El material ya existe para este tipo de servicio',
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
    '/api/materials/{id}': {
      patch: {
        tags: ['Materials'],
        summary: 'Edita un material existente (solo Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'ID del material'
          }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UpdateMaterialRequest'
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Material actualizado',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreateMaterialResponse'
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
            description: 'Material no encontrado',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          409: {
            description: 'El material ya existe para este tipo de servicio',
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
    '/api/materials/{id}/toggle': {
      patch: {
        tags: ['Materials'],
        summary: 'Activa/Desactiva un material (solo Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'ID del material'
          }
        ],
        responses: {
          200: {
            description: 'Estado cambiado',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreateMaterialResponse'
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
            description: 'Material no encontrado',
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
    '/api/orders': {
      post: {
        tags: ['Orders'],
        summary: 'Crea un nuevo pedido (solo Cliente)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateOrderRequest' }
            }
          }
        },
        responses: {
          201: {
            description: 'Pedido creado y presupuesto generado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/OrderResponse' }
              }
            }
          },
          400: {
            description: 'Campos faltantes o datos inválidos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          409: {
            description: 'Ya existe un pedido de este tipo en progreso (RN#6)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/orders/my': {
      get: {
        tags: ['Orders'],
        summary: 'Lista los pedidos del cliente autenticado',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Lista de pedidos del cliente',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/OrdersListResponse' }
              }
            }
          },
          401: {
            description: 'No autorizado'
          }
        }
      }
    },
    '/api/orders/{id}': {
      get: {
        tags: ['Orders'],
        summary: 'Ver detalle de un pedido (solo Cliente propietario)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'ID del pedido'
          }
        ],
        responses: {
          200: {
            description: 'Detalle del pedido',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/OrderResponse' }
              }
            }
          },
          401: {
            description: 'No autorizado'
          },
          404: {
            description: 'Pedido no encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/orders/{id}/files': {
      post: {
        tags: ['Orders'],
        summary: 'Sube un plano para un pedido (solo Cliente propietario)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'ID del pedido'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Archivo de plano (.dwg, .dxf, .pdf)'
                  }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Archivo subido correctamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/OrderFile' }
                  }
                }
              }
            }
          },
          400: {
            description: 'Error en el archivo (formato o tamaño)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          404: {
            description: 'Pedido no encontrado o sin permiso'
          }
        }
      }
    },
    '/api/orders/{id}/confirm': {
      post: {
        tags: ['Orders'],
        summary: 'Confirma el presupuesto de un pedido (solo Cliente propietario)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'ID del pedido'
          }
        ],
        responses: {
          200: {
            description: 'Presupuesto confirmado, estado cambiado a PENDING_PAYMENT',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/OrderResponse' }
              }
            }
          },
          400: {
            description: 'Presupuesto expirado o pedido en estado incorrecto',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          401: {
            description: 'No autorizado'
          },
          404: {
            description: 'Pedido no encontrado o sin permiso'
          }
        }
      }
    }
  }
} as const;
