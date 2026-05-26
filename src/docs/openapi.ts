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
    },
    {
      name: 'Operator',
      description: 'Gestión de cola de trabajo (operarios)'
    },
    {
      name: 'Payments',
      description: 'Gestión de pagos y validación'
    },
    {
      name: 'Admin',
      description: 'Gestión y reportes de administrador'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
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
          operator_id: { type: 'string', nullable: true, example: '3a1b2c3d-4e5f-6789-abcd-ef0123456789' },
          service_type_id: { type: 'string', example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' },
          material_id: { type: 'string', example: 'd290f1ee-6c54-4b01-90e6-d701748f0851' },
          status: { type: 'string', enum: ['BUDGETED', 'CLIENT_REVIEW_PENDING', 'OPERATOR_REVIEW_PENDING', 'PENDING_PAYMENT', 'IN_PROGRESS', 'READY', 'DELIVERED', 'CANCELLED', 'EXPIRED'], example: 'BUDGETED' },
          payment_condition: { type: 'string', enum: ['ADVANCE_50', 'CASH_ON_DELIVERY'], example: 'ADVANCE_50' },
          estimated_price: { type: 'number', example: 150.00 },
          final_price: { type: 'number', nullable: true, example: 165.00 },
          advance_amount: { type: 'number', nullable: true, example: 75.00 },
          budget_expires_at: { type: 'string', format: 'date-time' },
          estimated_delivery_at: { type: 'string', format: 'date-time', nullable: true },
          notes: { type: 'string', nullable: true, example: 'Corte con borde pulido' },
          client_review_notes: { type: 'string', nullable: true, example: 'Confirmo medidas y material' },
          client_reviewed_at: { type: 'string', format: 'date-time', nullable: true },
          operator_notes: { type: 'string', nullable: true, example: 'Revisar bordes antes de cortar' },
          operator_reviewed_at: { type: 'string', format: 'date-time', nullable: true },
          operator_price_adjustment_reason: { type: 'string', nullable: true, example: 'Archivo requiere mas tiempo de corte' },
          production_time_estimate: { type: 'string', nullable: true, example: '48 horas' },
          production_started_at: { type: 'string', format: 'date-time', nullable: true },
          production_ready_at: { type: 'string', format: 'date-time', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
          service_type: { $ref: '#/components/schemas/ServiceType' },
          material: { $ref: '#/components/schemas/Material' },
          operator: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'string', example: '3a1b2c3d-4e5f-6789-abcd-ef0123456789' },
              user: { $ref: '#/components/schemas/User' }
            }
          },
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
    '/api/operator/orders': {
      get: {
        tags: ['Operator'],
        summary: 'Lista pedidos asignados al operario (solo Operario)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Lista de pedidos asignados',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/OrdersListResponse'
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
            description: 'Prohibido - No es Operario',
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
    '/api/operator/orders/{id}': {
      get: {
        tags: ['Operator'],
        summary: 'Detalle de un pedido asignado al operario con planos',
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
                schema: {
                  $ref: '#/components/schemas/OrderResponse'
                }
              }
            }
          },
          401: {
            description: 'No autorizado'
          },
          403: {
            description: 'Prohibido - No es Operario'
          },
          404: {
            description: 'Pedido no encontrado o no asignado',
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
    '/api/operator/orders/{id}/status': {
      patch: {
        tags: ['Operator'],
        summary: 'Actualizar estado del pedido (solo Operario)',
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
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: {
                    type: 'string',
                    enum: ['READY'],
                    example: 'READY'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Estado del pedido actualizado',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/OrderResponse'
                }
              }
            }
          },
          400: {
            description: 'Estado hacia atrás o inválido'
          },
          401: {
            description: 'No autorizado'
          },
          403: {
            description: 'Prohibido - Pedido no asignado al operario'
          },
          404: {
            description: 'Pedido no encontrado'
          }
        }
      }
    },
    '/api/operator/orders/{id}/review': {
      post: {
        tags: ['Operator'],
        summary: 'Revisar pedido asignado: aprobar, devolver al cliente o rechazar',
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
            'application/json': {
              schema: {
                type: 'object',
                required: ['action'],
                properties: {
                  action: {
                    type: 'string',
                    enum: ['APPROVE', 'RETURN_TO_CLIENT', 'REJECT'],
                    example: 'APPROVE'
                  },
                  notes: {
                    type: 'string',
                    example: 'Archivos revisados y presupuesto validado'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Revision registrada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/OrderResponse' }
              }
            }
          },
          400: { description: 'Accion invalida o estado incorrecto' },
          401: { description: 'No autorizado' },
          403: { description: 'Pedido no asignado al operario' },
          404: { description: 'Pedido no encontrado' }
        }
      }
    },
    '/api/operator/orders/{id}/price': {
      patch: {
        tags: ['Operator'],
        summary: 'Ajustar precio final del pedido y devolverlo a revision del cliente',
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
            'application/json': {
              schema: {
                type: 'object',
                required: ['final_price', 'reason'],
                properties: {
                  final_price: { type: 'number', example: 165.00 },
                  reason: { type: 'string', example: 'El archivo requiere mas tiempo de corte' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Precio ajustado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/OrderResponse' }
              }
            }
          },
          400: { description: 'Precio, motivo o estado invalido' },
          401: { description: 'No autorizado' },
          403: { description: 'Pedido no asignado al operario' },
          404: { description: 'Pedido no encontrado' }
        }
      }
    },
    '/api/operator/orders/{id}/production-time': {
      patch: {
        tags: ['Operator'],
        summary: 'Registrar tiempo estimado de produccion o entrega',
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
            'application/json': {
              schema: {
                type: 'object',
                required: ['production_time_estimate'],
                properties: {
                  production_time_estimate: { type: 'string', example: '48 horas' },
                  estimated_delivery_at: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Tiempo de produccion registrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/OrderResponse' }
              }
            }
          },
          400: { description: 'Datos o estado invalido' },
          401: { description: 'No autorizado' },
          403: { description: 'Pedido no asignado al operario' },
          404: { description: 'Pedido no encontrado' }
        }
      }
    },
    '/api/operator/orders/{id}/notes': {
      patch: {
        tags: ['Operator'],
        summary: 'Agregar o editar notas internas (solo Operario)',
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
            'application/json': {
              schema: {
                type: 'object',
                required: ['notes'],
                properties: {
                  notes: {
                    type: 'string',
                    example: 'El archivo SVG tenía capas ocultas, se ajustó.'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Notas actualizadas exitosamente',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/OrderResponse'
                }
              }
            }
          },
          400: {
            description: 'Falta el campo notes'
          },
          401: {
            description: 'No autorizado'
          },
          403: {
            description: 'Prohibido - Pedido no asignado'
          },
          404: {
            description: 'Pedido no encontrado'
          }
        }
      }
    },
    '/api/operator/orders/{id}/files/{fileId}/download': {
      get: {
        tags: ['Operator'],
        summary: 'Descarga un archivo (plano) de un pedido asignado (solo Operario)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'ID del pedido'
          },
          {
            name: 'fileId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'ID del archivo a descargar'
          }
        ],
        responses: {
          200: {
            description: 'Archivo descargado correctamente',
            content: {
              'application/octet-stream': {}
            }
          },
          401: {
            description: 'No autorizado'
          },
          403: {
            description: 'Prohibido - Pedido no asignado al operario'
          },
          404: {
            description: 'Pedido o archivo no encontrado'
          }
        }
      }
    },
    '/api/payments': {
      post: {
        tags: ['Payments'],
        summary: 'Sube una captura de pago Yape (solo Cliente)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  order_id: { type: 'string', format: 'uuid', description: 'ID del pedido al que corresponde el pago' },
                  capture: { type: 'string', format: 'binary', description: 'Imagen de la captura de pago (.jpg, .jpeg, .png)' }
                },
                required: ['order_id', 'capture']
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Pago registrado exitosamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/Payment' }
                  }
                }
              }
            }
          },
          400: {
            description: 'Archivo inválido o campos faltantes'
          },
          401: {
            description: 'No autorizado'
          },
          403: {
            description: 'Prohibido - No es Cliente'
          },
          404: {
            description: 'Pedido no encontrado o no pertenece al cliente'
          },
          409: {
            description: 'Ya existe una captura pendiente para el pedido'
          }
        }
      }
    },
    '/api/admin/payments/pending': {
      get: {
        tags: ['Admin'],
        summary: 'Lista los pagos pendientes de revisión (solo Admin)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Lista de pagos pendientes',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Payment' }
                    }
                  }
                }
              }
            }
          },
          401: {
            description: 'No autorizado'
          },
          403: {
            description: 'Prohibido - No es Admin'
          }
        }
      }
    },
    '/api/admin/payments/{id}/approve': {
      patch: {
        tags: ['Admin'],
        summary: 'Aprueba una captura de pago y cambia el estado del pedido a IN_PROGRESS (solo Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'ID del pago a aprobar'
          }
        ],
        responses: {
          200: {
            description: 'Pago aprobado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/Payment' }
                  }
                }
              }
            }
          },
          400: {
            description: 'El pago no está pendiente de revisión'
          },
          401: {
            description: 'No autorizado'
          },
          403: {
            description: 'Prohibido - No es Admin'
          },
          404: {
            description: 'Pago no encontrado'
          }
        }
      }
    },
    '/api/admin/payments/{id}/reject': {
      patch: {
        tags: ['Admin'],
        summary: 'Rechaza una captura de pago con un comentario obligatorio (solo Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'ID del pago a rechazar'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['admin_comment'],
                properties: {
                  admin_comment: {
                    type: 'string',
                    example: 'La imagen está borrosa, por favor sube una más clara.'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Pago rechazado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/Payment' }
                  }
                }
              }
            }
          },
          400: {
            description: 'El comentario es obligatorio o el pago no está pendiente'
          },
          401: {
            description: 'No autorizado'
          },
          403: {
            description: 'Prohibido - No es Admin'
          },
          404: {
            description: 'Pago no encontrado'
          }
        }
      }
    },
    '/api/admin/orders/{id}/assign': {
      patch: {
        tags: ['Admin'],
        summary: 'Asigna un operario a un pedido validando especialidades (solo Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'ID del pedido a asignar'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['operator_id'],
                properties: {
                  operator_id: {
                    type: 'string',
                    format: 'uuid',
                    description: 'ID del operario a asignar'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Operario asignado exitosamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/Order' }
                  }
                }
              }
            }
          },
          400: {
            description: 'Especialidad no coincide o faltan datos'
          },
          401: {
            description: 'No autorizado'
          },
          403: {
            description: 'Prohibido - No es Admin'
          },
          404: {
            description: 'Pedido u operario no encontrado'
          }
        }
      }
    },
    '/api/admin/stats/sales': {
      get: {
        tags: ['Admin'],
        summary: 'Obtiene las ventas totales por período, filtradas opcionalmente por fecha (solo Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'startDate',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'date' },
            description: 'Fecha de inicio (YYYY-MM-DD)'
          },
          {
            name: 'endDate',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'date' },
            description: 'Fecha de fin (YYYY-MM-DD)'
          }
        ],
        responses: {
          200: {
            description: 'Estadísticas obtenidas exitosamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        totalSales: { type: 'number', example: 1250.50 },
                        dailySales: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              date: { type: 'string', example: '2026-05-13' },
                              total: { type: 'number', example: 350.00 }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          401: {
            description: 'No autorizado'
          },
          403: {
            description: 'Prohibido - No es Admin'
          }
        }
      }
    },
    '/api/admin/stats/services': {
      get: {
        tags: ['Admin'],
        summary: 'Obtiene el ranking de los servicios más solicitados (solo Admin)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Ranking obtenido exitosamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          service_id: { type: 'string', format: 'uuid' },
                          service_name: { type: 'string', example: 'Corte Láser' },
                          count: { type: 'number', example: 15 }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          401: {
            description: 'No autorizado'
          },
          403: {
            description: 'Prohibido - No es Admin'
          }
        }
      }
    },
    '/api/admin/stats/clients': {
      get: {
        tags: ['Admin'],
        summary: 'Obtiene el top 10 de clientes ordenados por pedidos completados (solo Admin)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Lista obtenida exitosamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          first_name: { type: 'string', example: 'Juan' },
                          last_name: { type: 'string', example: 'Pérez' },
                          dni: { type: 'string', example: '71234567' },
                          phone: { type: 'string', example: '987654321' },
                          completed_orders_count: { type: 'number', example: 12 },
                          is_frequent: { type: 'boolean', example: true }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          401: {
            description: 'No autorizado'
          },
          403: {
            description: 'Prohibido - No es Admin'
          }
        }
      }
    },
    '/api/admin/stats/operators': {
      get: {
        tags: ['Admin'],
        summary: 'Obtiene estadísticas de los operarios: pedidos atendidos y tiempo promedio en horas (solo Admin)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Estadísticas obtenidas exitosamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          operator_id: { type: 'string', format: 'uuid' },
                          first_name: { type: 'string', example: 'Pedro' },
                          last_name: { type: 'string', example: 'Gómez' },
                          orders_attended: { type: 'number', example: 45 },
                          average_time_hours: { type: 'number', example: 2.5 }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          401: {
            description: 'No autorizado'
          },
          403: {
            description: 'Prohibido - No es Admin'
          }
        }
      }
    },
    '/api/admin/stats/orders-by-status': {
      get: {
        tags: ['Admin'],
        summary: 'Obtiene la distribución de pedidos por estado (solo Admin)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Estadísticas obtenidas exitosamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          status: { type: 'string', example: 'IN_PROGRESS' },
                          count: { type: 'number', example: 10 }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          401: {
            description: 'No autorizado'
          },
          403: {
            description: 'Prohibido - No es Admin'
          }
        }
      }
    },
    '/api/admin/orders': {
      get: {
        tags: ['Admin'],
        summary: 'Lista todos los pedidos (solo Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Filtrar por estado del pedido'
          },
          {
            name: 'page',
            in: 'query',
            required: false,
            schema: { type: 'number' },
            description: 'Número de página'
          }
        ],
        responses: {
          200: {
            description: 'Lista de pedidos obtenida exitosamente',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/OrdersListResponse'
                }
              }
            }
          },
          401: {
            description: 'No autorizado'
          },
          403: {
            description: 'Prohibido - No es Admin'
          }
        }
      }
    },
    '/api/admin/reports/orders/export': {
      get: {
        tags: ['Admin'],
        summary: 'Exporta un reporte de pedidos en formato CSV (solo Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'startDate',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'date' },
            description: 'Fecha de inicio (YYYY-MM-DD)'
          },
          {
            name: 'endDate',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'date' },
            description: 'Fecha de fin (YYYY-MM-DD)'
          }
        ],
        responses: {
          200: {
            description: 'Reporte exportado exitosamente',
            content: {
              'text/csv': {}
            }
          },
          401: {
            description: 'No autorizado'
          },
          403: {
            description: 'Prohibido - No es Admin'
          }
        }
      }
    },
    '/api/admin/clients': {
      get: {
        tags: ['Admin'],
        summary: 'Lista todos los clientes (solo Admin)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Lista de clientes obtenida exitosamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/User' }
                    }
                  }
                }
              }
            }
          },
          401: {
            description: 'No autorizado'
          },
          403: {
            description: 'Prohibido - No es Admin'
          }
        }
      }
    },
    '/api/admin/clients/{id}/frequent': {
      patch: {
        tags: ['Admin'],
        summary: 'Actualiza el estado de cliente frecuente (solo Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'ID del cliente'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['is_frequent'],
                properties: {
                  is_frequent: {
                    type: 'boolean',
                    example: true,
                    description: 'Estado de cliente frecuente'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Estado actualizado exitosamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/User' }
                  }
                }
              }
            }
          },
          400: {
            description: 'Campos faltantes'
          },
          401: {
            description: 'No autorizado'
          },
          403: {
            description: 'Prohibido - No es Admin'
          },
          404: {
            description: 'Cliente no encontrado'
          }
        }
      }
    },
    '/api/admin/operators': {
      get: {
        tags: ['Admin'],
        summary: 'Lista operarios (solo Admin)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Lista de operarios',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          created_at: { type: 'string', format: 'date-time' },
                          user: { $ref: '#/components/schemas/User' },
                          specialties: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                id: { type: 'string', format: 'uuid' },
                                specialty: {
                                  type: 'string',
                                  enum: ['LASER', 'PLOTTING', 'PRINTING_3D', 'MODEL']
                                }
                              }
                            }
                          },
                          _count: {
                            type: 'object',
                            properties: {
                              orders: { type: 'number', example: 8 }
                            }
                          }
                        }
                      }
                    },
                    total: { type: 'number', example: 10 }
                  }
                }
              }
            }
          },
          401: {
            description: 'No autorizado'
          },
          403: {
            description: 'Prohibido - No es Admin'
          }
        }
      },
      patch: {
        tags: ['Admin'],
        summary: 'Activa o desactiva un operario (solo Admin)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Operario actualizado exitosamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        user_id: { type: 'string', format: 'uuid' },
                        is_active: { type: 'boolean', example: false },
                        created_at: { type: 'string', format: 'date-time' },
                        user: { $ref: '#/components/schemas/User' },
                        specialties: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string', format: 'uuid' },
                              specialty: {
                                type: 'string',
                                enum: ['LASER', 'PLOTTING', 'PRINTING_3D', 'MODEL']
                              }
                            }
                          }
                        },
                        _count: {
                          type: 'object',
                          properties: {
                            orders: { type: 'number', example: 8 }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          401: {
            description: 'No autorizado'
          },
          403: {
            description: 'Prohibido - No es Admin'
          },
          404: {
            description: 'Operario no encontrado'
          }
        }
      },
      post: {
        tags: ['Admin'],
        summary: 'Crea un nuevo operario (solo Admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['dni', 'first_name', 'last_name', 'phone', 'password'],
                properties: {
                  dni: { type: 'string', example: '87654321' },
                  first_name: { type: 'string', example: 'Pedro' },
                  last_name: { type: 'string', example: 'Gómez' },
                  phone: { type: 'string', example: '987654321' },
                  password: { type: 'string', example: 'MiClave123!' },
                  specialties: {
                    type: 'array',
                    items: { type: 'string', format: 'uuid' },
                    description: 'IDs de servicios en los que se especializa el operario'
                  }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Operario creado exitosamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/User' }
                  }
                }
              }
            }
          },
          400: {
            description: 'Campos faltantes'
          },
          401: {
            description: 'No autorizado'
          },
          403: {
            description: 'Prohibido - No es Admin'
          },
          409: {
            description: 'DNI o celular duplicado'
          }
        }
      }
    },
    '/api/admin/operators/{id}': {
      patch: {
        tags: ['Admin'],
        summary: 'Actualiza un operario (solo Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'ID del operario'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  first_name: { type: 'string', example: 'Pedro' },
                  last_name: { type: 'string', example: 'Gómez' },
                  phone: { type: 'string', example: '987654321' },
                  specialties: {
                    type: 'array',
                    items: { type: 'string', format: 'uuid' },
                    description: 'IDs de servicios en los que se especializa'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Operario actualizado exitosamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/User' }
                  }
                }
              }
            }
          },
          400: {
            description: 'Datos inválidos'
          },
          401: {
            description: 'No autorizado'
          },
          403: {
            description: 'Prohibido - No es Admin'
          },
          404: {
            description: 'Operario no encontrado'
          }
        }
      },
      delete: {
        tags: ['Admin'],
        summary: 'Elimina un operario (solo Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'ID del operario a eliminar'
          }
        ],
        responses: {
          200: {
            description: 'Operario eliminado exitosamente'
          },
          401: {
            description: 'No autorizado'
          },
          403: {
            description: 'Prohibido - No es Admin'
          },
          404: {
            description: 'Operario no encontrado'
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
        parameters: [
          {
            name: 'all',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['true'] },
            description: "Si 'true' devuelve todos los servicios (incluye inactivos). Requiere autenticación Admin."
          }
        ],
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
      },
      delete: {
        tags: ['Services'],
        summary: 'Elimina un servicio existente (solo Admin)',
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
        responses: {
          200: {
            description: 'Servicio eliminado',
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
            description: 'El servicio tiene relaciones y no se puede eliminar',
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
    '/api/services/{id}/toggle': {
      patch: {
        tags: ['Services'],
        summary: 'Activa/Desactiva un servicio (solo Admin)',
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
        responses: {
          200: {
            description: 'Estado cambiado',
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
      },
      delete: {
        tags: ['Materials'],
        summary: 'Elimina un material existente (solo Admin)',
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
            description: 'Material eliminado',
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
            description: 'El material tiene relaciones y no se puede eliminar',
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
            description: 'Revision confirmada, estado cambiado a OPERATOR_REVIEW_PENDING',
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
    },
    '/api/orders/{id}/confirm-review': {
      post: {
        tags: ['Orders'],
        summary: 'Confirmar revision del pedido por parte del cliente',
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
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  notes: { type: 'string', example: 'Confirmo medidas, material y presupuesto' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Revision confirmada',
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
          401: { description: 'No autorizado' },
          404: { description: 'Pedido no encontrado o sin permiso' }
        }
      }
    },
    '/api/orders/{id}/observations': {
      post: {
        tags: ['Orders'],
        summary: 'Enviar observaciones del cliente sobre el pedido',
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
            'application/json': {
              schema: {
                type: 'object',
                required: ['observation'],
                properties: {
                  observation: { type: 'string', example: 'La medida correcta es 60 x 40 cm' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Observacion registrada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/OrderResponse' }
              }
            }
          },
          400: {
            description: 'Observacion faltante o estado incorrecto',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          401: { description: 'No autorizado' },
          404: { description: 'Pedido no encontrado o sin permiso' }
        }
      }
    },
    '/api/orders/{id}/confirm-pickup': {
      post: {
        tags: ['Orders'],
        summary: 'Confirmar recogida del pedido por parte del cliente (doble validación)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'ID del pedido a confirmar'
          }
        ],
        requestBody: {
          required: false
        },
        responses: {
          200: {
            description: 'Pedido marcado como DELIVERED',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/OrderResponse'
                }
              }
            }
          },
          400: {
            description: 'No se puede confirmar la recogida (estado inválido)'
          },
          401: {
            description: 'No autorizado'
          },
          404: {
            description: 'Pedido no encontrado'
          }
        }
      }
    }
  }
} as const;
