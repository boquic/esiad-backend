# DATABASE.md — SIGEPED
## Schema de Base de Datos · PostgreSQL v17 · Prisma v6

---

## 1. ENUMS

```prisma
enum Role {
  CLIENT
  OPERATOR
  ADMIN
}

enum Specialty {
  LASER
  PLOTTING
  PRINTING_3D
  MODEL
}

enum PricingModel {
  FIXED          // Precio fijo por servicio (ej. maqueta)
  PER_M2         // Precio por metro cuadrado (ej. ploteo)
  PER_UNIT       // Precio por unidad (ej. corte láser)
  PER_VOLUME     // Precio por volumen cm³ (ej. impresión 3D)
}

enum OrderStatus {
  BUDGETED       // Presupuesto generado, esperando confirmación del cliente
  PENDING_PAYMENT // Cliente confirmó, esperando validación de pago
  IN_PROGRESS    // Pago validado, operario trabajando
  READY          // Pedido listo para recoger en local
  DELIVERED      // Cliente recogió el pedido
  CANCELLED      // Pedido cancelado (registra motivo en notes)
  EXPIRED        // Presupuesto expiró sin confirmación (24h)
}

enum PaymentCondition {
  ADVANCE_50         // Cliente nuevo (0–4 pedidos): paga 50% antes de producción
  CASH_ON_DELIVERY   // Cliente frecuente (5+ pedidos): paga al recoger
}

enum PaymentType {
  ADVANCE    // Adelanto del 50%
  FINAL      // Pago final al recoger
}

enum PaymentStatus {
  PENDING    // Captura subida, esperando revisión del admin
  APPROVED   // Admin aprobó el pago
  REJECTED   // Admin rechazó el pago (ver admin_comment)
}

enum FileType {
  PLAN_DWG   // Plano AutoCAD formato .dwg
  PLAN_DXF   // Plano AutoCAD formato .dxf
  PLAN_PDF   // Plano en formato .pdf
}

enum TriggerEvent {
  BUDGET_READY         // Presupuesto generado y listo para revisar
  PAYMENT_CONFIRMED    // Pago aprobado, producción iniciada
  ORDER_READY          // Pedido listo para recoger en local
  PICKUP_REMINDER_48H  // Recordatorio: pedido sin recoger tras 48h
}

enum DeliveryStatus {
  SENT       // Mensaje enviado a Twilio
  DELIVERED  // Twilio confirmó entrega
  FAILED     // Error de envío
}
```

---

## 2. MODELOS

### users
Tabla central. Maneja clientes, operarios y administrador en un solo registro.

```prisma
model User {
  id                     String    @id @default(uuid())
  dni                    String    @unique
  first_name             String
  last_name              String
  phone                  String    @unique
  password_hash          String
  role                   Role      @default(CLIENT)
  completed_orders_count Int       @default(0)
  is_frequent            Boolean   @default(false)
  created_at             DateTime  @default(now())

  operator               Operator?
  orders                 Order[]   @relation("ClientOrders")
  notifications          Notification[]

  @@map("users")
}
```

**Notas:**
- `dni` y `phone` son únicos: son las dos credenciales de acceso del cliente (Regla #1).
- `is_frequent` se actualiza automáticamente cuando `completed_orders_count >= 5`.
- `role` determina qué rutas y vistas puede acceder el usuario.

---

### operators
Extiende a un `User` con `role = OPERATOR`. Separado para no contaminar la tabla `users`.

```prisma
model Operator {
  id           String               @id @default(uuid())
  user_id      String               @unique
  created_at   DateTime             @default(now())

  user         User                 @relation(fields: [user_id], references: [id])
  specialties  OperatorSpecialty[]
  orders       Order[]

  @@map("operators")
}
```

---

### operator_specialties
Tabla pivot. Un operario puede tener múltiples especialidades.

```prisma
model OperatorSpecialty {
  id          String    @id @default(uuid())
  operator_id String
  specialty   Specialty

  operator    Operator  @relation(fields: [operator_id], references: [id])

  @@unique([operator_id, specialty])
  @@map("operator_specialties")
}
```

**Notas:**
- El constraint `@@unique([operator_id, specialty])` evita duplicados.
- Al asignar un pedido, el sistema filtra operarios cuya especialidad coincide con el `service_type` del pedido.

---

### service_types
Catálogo de servicios ofrecidos (corte láser, ploteo, impresión 3D, maqueta).

```prisma
model ServiceType {
  id            String       @id @default(uuid())
  name          String       @unique
  pricing_model PricingModel
  is_active     Boolean      @default(true)
  created_at    DateTime     @default(now())

  materials     Material[]
  orders        Order[]

  @@map("service_types")
}
```

**Notas:**
- `pricing_model` define cómo se calcula el presupuesto automático para este servicio.
- `is_active = false` desactiva el servicio sin eliminarlo (el admin puede reactivarlo).

---

### materials
Materiales disponibles por tipo de servicio. El precio unitario varía por material.

```prisma
model Material {
  id              String      @id @default(uuid())
  service_type_id String
  name            String
  unit_price      Decimal     @db.Decimal(10, 2)
  unit            String      // Ej: "m2", "unidad", "cm3"
  is_active       Boolean     @default(true)

  service_type    ServiceType @relation(fields: [service_type_id], references: [id])
  orders          Order[]

  @@unique([service_type_id, name])
  @@map("materials")
}
```

---

### orders
Tabla principal del negocio. Centraliza todo el ciclo de vida de un pedido.

```prisma
model Order {
  id                String           @id @default(uuid())
  client_id         String
  operator_id       String?
  service_type_id   String
  material_id       String
  status            OrderStatus      @default(BUDGETED)
  payment_condition PaymentCondition
  estimated_price   Decimal          @db.Decimal(10, 2)
  advance_amount    Decimal?         @db.Decimal(10, 2)
  budget_expires_at DateTime
  notes             String?
  created_at        DateTime         @default(now())
  updated_at        DateTime         @updatedAt

  client            User             @relation("ClientOrders", fields: [client_id], references: [id])
  operator          Operator?        @relation(fields: [operator_id], references: [id])
  service_type      ServiceType      @relation(fields: [service_type_id], references: [id])
  material          Material         @relation(fields: [material_id], references: [id])
  files             OrderFile[]
  payments          Payment[]
  notifications     Notification[]

  @@map("orders")
}
```

**Notas:**
- `operator_id` es nullable: el pedido existe sin operario asignado hasta que el admin lo asigne.
- `payment_condition` se asigna automáticamente al crear el pedido según `user.is_frequent`.
- `budget_expires_at` se fija a `created_at + 24h`. El admin puede extenderlo manualmente (Regla #7).
- `advance_amount` es nullable: solo aplica cuando `payment_condition = ADVANCE_50`.
- Al cancelar, el motivo se registra en `notes` junto con el estado `CANCELLED`.
- **Regla #6:** Al crear un pedido, el backend valida que el cliente no tenga otro pedido del mismo `service_type_id` en estado `IN_PROGRESS`.

---

### order_files
Archivos de planos subidos por el cliente para cada pedido.

```prisma
model OrderFile {
  id          String   @id @default(uuid())
  order_id    String
  file_url    String
  file_type   FileType
  uploaded_at DateTime @default(now())

  order       Order    @relation(fields: [order_id], references: [id])

  @@map("order_files")
}
```

**Notas:**
- Solo se aceptan archivos `.dwg`, `.dxf`, `.pdf` (validado por Multer en el middleware).
- `file_url` apunta al archivo almacenado en el servidor local (carpeta `uploads/`).

---

### payments
Registro de pagos y validación de capturas de Yape por el admin.

```prisma
model Payment {
  id            String        @id @default(uuid())
  order_id      String
  amount        Decimal       @db.Decimal(10, 2)
  payment_type  PaymentType
  capture_url   String?
  status        PaymentStatus @default(PENDING)
  admin_comment String?
  created_at    DateTime      @default(now())
  reviewed_at   DateTime?

  order         Order         @relation(fields: [order_id], references: [id])

  @@map("payments")
}
```

**Notas:**
- `capture_url` es nullable: los pagos `CASH_ON_DELIVERY` no tienen captura.
- `admin_comment` es obligatorio cuando `status = REJECTED` (validado en backend).
- `reviewed_at` se registra cuando el admin aprueba o rechaza.

---

### notifications
Log de todas las notificaciones WhatsApp enviadas vía Twilio.

```prisma
model Notification {
  id                   String          @id @default(uuid())
  order_id             String
  user_id              String
  trigger_event        TriggerEvent
  whatsapp_message_id  String?
  delivery_status      DeliveryStatus  @default(SENT)
  sent_at              DateTime        @default(now())

  order                Order           @relation(fields: [order_id], references: [id])
  user                 User            @relation(fields: [user_id], references: [id])

  @@map("notifications")
}
```

**Notas:**
- `whatsapp_message_id` es el ID que retorna Twilio al enviar. Útil para rastrear el estado de entrega.
- El recordatorio `PICKUP_REMINDER_48H` se dispara mediante un job programado que revisa pedidos en estado `READY` con más de 48h sin cambiar a `DELIVERED`.

---

## 3. RESUMEN DE RELACIONES

| Relación | Tipo | Notas |
|----------|------|-------|
| User → Operator | 1:1 opcional | Solo usuarios con role OPERATOR |
| Operator → OperatorSpecialty | 1:N | Mínimo 1 especialidad por operario |
| User → Order | 1:N | Un cliente tiene muchos pedidos |
| Operator → Order | 1:N | Un operario atiende muchos pedidos |
| ServiceType → Material | 1:N | Cada servicio tiene sus materiales |
| ServiceType → Order | 1:N | Un pedido es de un tipo de servicio |
| Material → Order | 1:N | Un pedido usa un material |
| Order → OrderFile | 1:N | Un pedido puede tener varios planos |
| Order → Payment | 1:N | Un pedido puede tener 1 o 2 pagos |
| Order → Notification | 1:N | Un pedido dispara hasta 4 notificaciones |
| User → Notification | 1:N | Un usuario recibe muchas notificaciones |

---

## 4. REGLAS DE NEGOCIO IMPLEMENTADAS EN BD

| Regla | Implementación |
|-------|----------------|
| #1 DNI como credencial única | `dni UNIQUE` + `phone UNIQUE` en `users` |
| #4 Condición de pago por antigüedad | `payment_condition` se asigna al crear `Order` según `is_frequent` |
| #6 Un pedido activo por servicio | Validación en backend al crear `Order`: no puede existir otro con mismo `service_type_id` + `client_id` en estado `IN_PROGRESS` |
| #7 Presupuesto con vigencia 24h | `budget_expires_at = created_at + 24h`. Job programado cambia status a `EXPIRED` |

