# 🏓 Royal Padel API - Documentación Completa

## 📋 Índice

1. [Introducción](#introducción)
2. [Autenticación y Autorización](#autenticación-y-autorización)
3. [Disponibilidad de Canchas (CourtAvailability)](#disponibilidad-de-canchas-courtavailability)
4. [Precios Dinámicos (CourtPricing)](#precios-dinámicos-courtpricing)
5. [Notificaciones (Notifications)](#notificaciones-notifications)
6. [Pagos (Payments)](#pagos-payments)
7. [Códigos de Estado](#códigos-de-estado)
8. [Ejemplos de Uso](#ejemplos-de-uso)

---

## 🚀 Introducción

Esta API RESTful permite gestionar un sistema completo de pádel con funcionalidades avanzadas para:
- Gestión de disponibilidad de canchas
- Sistema de precios dinámicos
- Notificaciones en tiempo real
- Procesamiento de pagos

**Base URL:** `http://localhost:3000/api`

### Headers Requeridos
```
Content-Type: application/json
Authorization: Bearer <token>
```

---

## 🔐 Autenticación y Autorización

### Roles de Usuario
- **customer**: Usuario cliente (puede ver disponibilidad, calcular precios)
- **staff**: Personal del club (puede gestionar disponibilidad y ver reportes)
- **admin**: Administrador (acceso completo al sistema)

### Token JWT
Incluir en el header: `Authorization: Bearer <your-jwt-token>`

---

## 🏟️ Disponibilidad de Canchas (CourtAvailability)

Base URL: `/api/court-availability`

### 📅 Crear Disponibilidad

**POST** `/`
**Permisos:** staff, admin

```json
{
  "courtId": "uuid-cancha",
  "date": "2024-12-25",
  "startTime": "08:00",
  "endTime": "22:00",
  "isAvailable": true,
  "notes": "Horario navideño especial"
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "id": "availability-uuid",
    "courtId": "uuid-cancha",
    "date": "2024-12-25",
    "startTime": "08:00",
    "endTime": "22:00",
    "isAvailable": true,
    "notes": "Horario navideño especial",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "message": "Disponibilidad creada exitosamente"
}
```

### 📋 Listar Disponibilidades

**GET** `/`
**Permisos:** customer, staff, admin

**Query Parameters:**
- `courtId` (opcional): UUID de la cancha
- `date` (opcional): Fecha específica (YYYY-MM-DD)
- `dateFrom` (opcional): Fecha desde
- `dateTo` (opcional): Fecha hasta
- `isAvailable` (opcional): true/false
- `page` (opcional): Número de página (default: 1)
- `pageSize` (opcional): Elementos por página (default: 20, max: 100)

**Ejemplo:** `/api/court-availability?courtId=uuid-cancha&dateFrom=2024-01-15&dateTo=2024-01-20&page=1`

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "availabilities": [
      {
        "id": "availability-uuid",
        "courtId": "uuid-cancha",
        "date": "2024-01-15",
        "startTime": "08:00",
        "endTime": "22:00",
        "isAvailable": true,
        "notes": null,
        "court": {
          "name": "Cancha Central",
          "type": "indoor"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "totalItems": 1,
      "totalPages": 1
    }
  }
}
```

### 🔍 Obtener Disponibilidad por ID

**GET** `/:id`
**Permisos:** customer, staff, admin

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "id": "availability-uuid",
    "courtId": "uuid-cancha",
    "date": "2024-01-15",
    "startTime": "08:00",
    "endTime": "22:00",
    "isAvailable": true,
    "notes": null,
    "court": {
      "name": "Cancha Central",
      "type": "indoor"
    }
  }
}
```

### 📅 Obtener Disponibilidad de Cancha Específica

**GET** `/court/:courtId`
**Permisos:** customer, staff, admin

**Query Parameters:**
- `dateFrom` (opcional): Fecha desde
- `dateTo` (opcional): Fecha hasta

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "availability-uuid",
      "date": "2024-01-15",
      "startTime": "08:00",
      "endTime": "22:00",
      "isAvailable": true,
      "notes": null
    }
  ]
}
```

### ✏️ Actualizar Disponibilidad

**PUT** `/:id`
**Permisos:** staff, admin

```json
{
  "startTime": "09:00",
  "endTime": "21:00",
  "isAvailable": false,
  "notes": "Mantenimiento programado"
}
```

### 🗑️ Eliminar Disponibilidad

**DELETE** `/:id`
**Permisos:** admin

### 📊 Crear Disponibilidades Masivas

**POST** `/bulk`
**Permisos:** admin

```json
{
  "courtIds": ["uuid-cancha1", "uuid-cancha2"],
  "dateFrom": "2024-01-15",
  "dateTo": "2024-01-30",
  "startTime": "08:00",
  "endTime": "22:00",
  "isAvailable": true,
  "excludeDays": [0, 6],
  "notes": "Horario estándar"
}
```

### 📈 Estadísticas de Disponibilidad

**GET** `/stats`
**Permisos:** staff, admin

**Query Parameters:**
- `courtId` (opcional): UUID de la cancha
- `dateFrom` (opcional): Fecha desde
- `dateTo` (opcional): Fecha hasta

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "totalSlots": 150,
    "availableSlots": 120,
    "unavailableSlots": 30,
    "availabilityRate": 80.0,
    "courtBreakdown": [
      {
        "courtId": "uuid-cancha1",
        "courtName": "Cancha Central",
        "totalSlots": 75,
        "availableSlots": 60,
        "availabilityRate": 80.0
      }
    ]
  }
}
```

---

## 💰 Precios Dinámicos (CourtPricing)

Base URL: `/api/court-pricing`

### 💵 Crear Regla de Precio

**POST** `/`
**Permisos:** admin

```json
{
  "courtId": "uuid-cancha",
  "dayOfWeek": 1,
  "startTime": "18:00",
  "endTime": "22:00",
  "pricePerHour": 85.50,
  "season": "high",
  "isActive": true
}
```

**Valores válidos:**
- `dayOfWeek`: 0-6 (0=domingo, 6=sábado)
- `season`: "low", "mid", "high"
- `pricePerHour`: 10.00 - 500.00

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "id": "pricing-rule-uuid",
    "courtId": "uuid-cancha",
    "dayOfWeek": 1,
    "startTime": "18:00",
    "endTime": "22:00",
    "pricePerHour": 85.50,
    "season": "high",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "message": "Regla de precio creada exitosamente"
}
```

### 📋 Listar Reglas de Precio

**GET** `/`
**Permisos:** staff, admin

**Query Parameters:**
- `courtId` (opcional): UUID de la cancha
- `dayOfWeek` (opcional): 0-6
- `season` (opcional): low/mid/high
- `isActive` (opcional): true/false
- `priceFrom` (opcional): Precio mínimo
- `priceTo` (opcional): Precio máximo
- `page` (opcional): Número de página
- `pageSize` (opcional): Elementos por página

### 🧮 Calcular Precio para Reserva

**POST** `/calculate`
**Permisos:** customer, staff, admin

```json
{
  "courtId": "uuid-cancha",
  "date": "2024-01-15",
  "startTime": "18:00",
  "endTime": "20:00"
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "courtId": "uuid-cancha",
    "date": "2024-01-15",
    "startTime": "18:00",
    "endTime": "20:00",
    "duration": 2.0,
    "pricePerHour": 85.50,
    "totalPrice": 171.00,
    "season": "high",
    "dayOfWeek": 1,
    "breakdown": [
      {
        "timeSlot": "18:00-19:00",
        "pricePerHour": 85.50,
        "subtotal": 85.50
      },
      {
        "timeSlot": "19:00-20:00",
        "pricePerHour": 85.50,
        "subtotal": 85.50
      }
    ]
  }
}
```

### 🏟️ Obtener Precios de Cancha

**GET** `/court/:courtId`
**Permisos:** customer, staff, admin

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "courtId": "uuid-cancha",
    "courtName": "Cancha Central",
    "pricingRules": [
      {
        "id": "rule-uuid",
        "dayOfWeek": 1,
        "startTime": "18:00",
        "endTime": "22:00",
        "pricePerHour": 85.50,
        "season": "high",
        "isActive": true
      }
    ]
  }
}
```

### 📐 Crear Plantilla Estándar

**POST** `/template/:courtId`
**Permisos:** admin

Crea reglas de precio estándar para toda la semana en una cancha.

### 📊 Estadísticas de Precios

**GET** `/stats`
**Permisos:** admin

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "totalRules": 42,
    "activeRules": 35,
    "averagePrice": 65.25,
    "priceRange": {
      "min": 25.00,
      "max": 120.00
    },
    "seasonBreakdown": {
      "low": { "rules": 14, "avgPrice": 45.00 },
      "mid": { "rules": 14, "avgPrice": 65.00 },
      "high": { "rules": 14, "avgPrice": 85.00 }
    }
  }
}
```

### ✏️ Actualizar Regla de Precio

**PUT** `/:id`
**Permisos:** admin

### 🗑️ Eliminar Regla de Precio

**DELETE** `/:id`
**Permisos:** admin

---

## 🔔 Notificaciones (Notifications)

Base URL: `/api/notifications`

### 📧 Crear Notificación

**POST** `/`
**Permisos:** staff, admin

```json
{
  "userId": "user-uuid",
  "title": "Reserva Confirmada",
  "message": "Tu reserva para mañana a las 18:00 ha sido confirmada",
  "type": "booking_confirmation",
  "priority": "normal",
  "metadata": {
    "reservationId": "reservation-uuid",
    "courtName": "Cancha Central"
  }
}
```

**Tipos válidos:**
- `booking_confirmation`
- `booking_reminder`
- `payment_confirmation`
- `system_maintenance`
- `promotion`
- `general`

**Prioridades:**
- `low`, `normal`, `high`, `urgent`

### 📬 Obtener Notificaciones de Usuario

**GET** `/user/:userId`
**Permisos:** customer (solo sus notificaciones), staff, admin

**Query Parameters:**
- `isRead` (opcional): true/false
- `type` (opcional): Tipo de notificación
- `priority` (opcional): Prioridad
- `page` (opcional): Número de página
- `pageSize` (opcional): Elementos por página

### ✅ Marcar como Leída

**PUT** `/:id/read`
**Permisos:** customer (solo sus notificaciones), staff, admin

### 🗑️ Eliminar Notificación

**DELETE** `/:id`
**Permisos:** customer (solo sus notificaciones), admin

### 📊 Estadísticas de Notificaciones

**GET** `/stats`
**Permisos:** staff, admin

---

## 💳 Pagos (Payments)

Base URL: `/api/payments`

### 💵 Crear Pago

**POST** `/`
**Permisos:** customer, staff, admin

```json
{
  "reservationId": "reservation-uuid",
  "amount": 171.00,
  "currency": "USD",
  "paymentMethod": "credit_card",
  "metadata": {
    "courtName": "Cancha Central",
    "date": "2024-01-15",
    "time": "18:00-20:00"
  }
}
```

### 📋 Listar Pagos

**GET** `/`
**Permisos:** customer (solo sus pagos), staff, admin

**Query Parameters:**
- `userId` (opcional): UUID del usuario
- `status` (opcional): pending/completed/failed/refunded
- `paymentMethod` (opcional): credit_card/debit_card/cash/transfer
- `dateFrom` (opcional): Fecha desde
- `dateTo` (opcional): Fecha hasta
- `amountFrom` (opcional): Monto mínimo
- `amountTo` (opcional): Monto máximo

### ✅ Confirmar Pago

**PUT** `/:id/confirm`
**Permisos:** staff, admin

### ❌ Cancelar Pago

**PUT** `/:id/cancel`
**Permisos:** staff, admin

### 💸 Procesar Reembolso

**POST** `/:id/refund`
**Permisos:** admin

```json
{
  "amount": 171.00,
  "reason": "Cancelación por mantenimiento de cancha"
}
```

### 📊 Estadísticas de Pagos

**GET** `/stats`
**Permisos:** staff, admin

---

## 📈 Códigos de Estado

| Código | Significado |
|--------|-------------|
| 200 | OK - Operación exitosa |
| 201 | Created - Recurso creado exitosamente |
| 400 | Bad Request - Datos inválidos |
| 401 | Unauthorized - Token no válido o faltante |
| 403 | Forbidden - Sin permisos suficientes |
| 404 | Not Found - Recurso no encontrado |
| 409 | Conflict - Conflicto con recurso existente |
| 422 | Unprocessable Entity - Errores de validación |
| 500 | Internal Server Error - Error del servidor |

---

## 🧪 Ejemplos de Uso

### Flujo Completo: Cliente Hace una Reserva

#### 1. Ver disponibilidad de canchas
```bash
curl -X GET "http://localhost:3000/api/court-availability?dateFrom=2024-01-15&dateTo=2024-01-15" \
  -H "Authorization: Bearer <token>"
```

#### 2. Calcular precio para el horario deseado
```bash
curl -X POST "http://localhost:3000/api/court-pricing/calculate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "courtId": "uuid-cancha",
    "date": "2024-01-15",
    "startTime": "18:00",
    "endTime": "20:00"
  }'
```

#### 3. Crear reserva (usando el controlador de reservas)
```bash
# Este endpoint estaría en reservationControllers
curl -X POST "http://localhost:3000/api/reservations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "courtId": "uuid-cancha",
    "date": "2024-01-15",
    "startTime": "18:00",
    "endTime": "20:00"
  }'
```

#### 4. Procesar pago
```bash
curl -X POST "http://localhost:3000/api/payments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "reservationId": "reservation-uuid",
    "amount": 171.00,
    "currency": "USD",
    "paymentMethod": "credit_card"
  }'
```

### Flujo de Administrador: Gestión de Precios

#### 1. Ver estadísticas actuales
```bash
curl -X GET "http://localhost:3000/api/court-pricing/stats" \
  -H "Authorization: Bearer <admin-token>"
```

#### 2. Crear nueva regla de precio para horario pico
```bash
curl -X POST "http://localhost:3000/api/court-pricing" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "courtId": "uuid-cancha",
    "dayOfWeek": 5,
    "startTime": "19:00",
    "endTime": "22:00",
    "pricePerHour": 95.00,
    "season": "high"
  }'
```

#### 3. Crear plantilla estándar para nueva cancha
```bash
curl -X POST "http://localhost:3000/api/court-pricing/template/uuid-nueva-cancha" \
  -H "Authorization: Bearer <admin-token>"
```

---

## 🔧 Configuración para Pruebas en Postman

### Variables de Entorno
```json
{
  "base_url": "http://localhost:3000/api",
  "auth_token": "your-jwt-token-here",
  "court_id": "uuid-cancha-test",
  "user_id": "uuid-user-test"
}
```

### Headers Globales
```
Content-Type: application/json
Authorization: Bearer {{auth_token}}
```

---

## 📝 Notas Importantes

1. **Formato de Tiempo**: Siempre usar formato 24 horas (HH:MM)
2. **Fechas**: Formato ISO 8601 (YYYY-MM-DD)
3. **UUIDs**: Todos los IDs son UUID v4
4. **Paginación**: Por defecto 20 elementos por página, máximo 100
5. **Validación**: Todos los endpoints incluyen validación exhaustiva
6. **Errores**: Respuestas consistentes con detalles de error específicos

---

*Documentación generada para Royal Padel API v1.0*
*Última actualización: Enero 2024*
