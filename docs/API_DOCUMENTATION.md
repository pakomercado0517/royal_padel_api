# 🏓 Royal Padel API - Documentación Completa

## 📋 Índice

1. [Introducción](#introducción)
2. [Autenticación (Auth)](#autenticación-auth)
3. [Gestión de Usuarios](#gestión-de-usuarios)
4. [Gestión de Canchas (Courts)](#gestión-de-canchas-courts)
5. [Disponibilidad de Canchas (CourtAvailability)](#disponibilidad-de-canchas-courtavailability)
6. [Precios Dinámicos (CourtPricing)](#precios-dinámicos-courtpricing)
7. [Reservas (Reservations)](#reservas-reservations)
8. [Clientes (Customers)](#clientes-customers)
9. [Notificaciones (Notifications)](#notificaciones-notifications)
10. [Pagos (Payments)](#pagos-payments)
11. [Códigos de Estado](#códigos-de-estado)
12. [Ejemplos de Uso](#ejemplos-de-uso)

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

---

## 🔐 Autenticación (Auth)

Base URL: `/api/user`

### Roles de Usuario
- **customer**: Usuario cliente (puede ver disponibilidad, calcular precios)
- **staff**: Personal del club (puede gestionar disponibilidad y ver reportes)
- **admin**: Administrador (acceso completo al sistema)

### 📝 Crear Cuenta

**POST** `/create_account`
**Permisos:** público

```json
{
  "fullName": "Juan Pérez",
  "email": "juan@example.com",
  "password": "MiPassword123",
  "phone": "5551234567",
  "role": "customer"
}
```

**Validaciones:**
- `fullName`: 2-100 caracteres
- `email`: formato de email válido
- `password`: mínimo 8 caracteres, debe contener mayúscula, minúscula y número
- `phone`: número móvil válido (México)
- `role`: customer, staff o admin (opcional, default: customer)

**Respuesta:**
```json
{
  "message": "Usuario creado correctamente. Revisa tu correo para confirmar tu cuenta.",
  "userId": "uuid-usuario"
}
```

### ✅ Confirmar Cuenta

**POST** `/confirm_account`
**Permisos:** público

```json
{
  "token": "123456"
}
```

**Respuesta:**
```json
{
  "message": "Email confirmado con éxito, ya puedes iniciar sesión 👌🏻"
}
```

### 🔑 Iniciar Sesión

**POST** `/login`
**Permisos:** público

```json
{
  "email": "juan@example.com",
  "password": "MiPassword123"
}
```

**Respuesta:**
```json
{
  "message": "Has iniciado sesión correctamente ✌🏻",
  "token": "jwt-token-aqui",
  "user": {
    "id": "uuid-usuario",
    "fullName": "Juan Pérez",
    "email": "juan@example.com",
    "role": "customer",
    "emailVerified": true,
    "phoneVerified": false,
    "stats": {
      "totalGamesPlayed": 0,
      "totalHoursPlayed": 0,
      "currentMonthGames": 0
    }
  }
}
```

### 🔄 Olvidé mi Contraseña

**POST** `/forgot_password`
**Permisos:** público

```json
{
  "email": "juan@example.com"
}
```

**Respuesta:**
```json
{
  "message": "Revisa tu email para restablecer la contraseña"
}
```

### 🔓 Validar Token de Recuperación

**POST** `/validate_token`
**Permisos:** público

```json
{
  "token": "123456"
}
```

### 🔄 Restablecer Contraseña

**POST** `/reset_password/:token`
**Permisos:** público

```json
{
  "password": "NuevaPassword123"
}
```

---

## 👤 Gestión de Usuarios

Base URL: `/api/user`

### 👤 Obtener Perfil

**GET** `/profile`
**Permisos:** customer, staff, admin (usuario autenticado)

**Respuesta:**
```json
{
  "message": "Perfil obtenido exitosamente",
  "user": {
    "id": "uuid-usuario",
    "fullName": "Juan Pérez",
    "email": "juan@example.com",
    "role": "customer",
    "status": "active",
    "emailVerified": true,
    "phoneVerified": false
  }
}
```

### ✏️ Actualizar Datos de Usuario

**PUT** `/`
**Permisos:** customer, staff, admin (usuario autenticado)

```json
{
  "fullName": "Juan Carlos Pérez",
  "email": "juancarlos@example.com",
  "phone": "5551234568"
}
```

**Respuesta:**
```json
{
  "message": "Información actualizada 👍🏻"
}
```

### 🔑 Cambiar Contraseña

**POST** `/update_password`
**Permisos:** customer, staff, admin (usuario autenticado)

```json
{
  "currentPassword": "PasswordActual123",
  "newPassword": "PasswordNueva456"
}
```

**Respuesta:**
```json
{
  "message": "Contraseña actualizada"
}
```

### ✅ Verificar Contraseña

**POST** `/check_password`
**Permisos:** customer, staff, admin (usuario autenticado)

```json
{
  "password": "MiPasswordActual123"
}
```

**Respuesta:**
```json
{
  "message": "Contraseña correcta"
}
```

### 📧 Cambiar Email

**PUT** `/:id/change_email`
**Permisos:** admin (o el mismo usuario)

```json
{
  "email": "nuevoemail@example.com"
}
```

### 📤 Reenviar Verificación

**POST** `/resend_verification`
**Permisos:** público

```json
{
  "email": "juan@example.com"
}
```

---

## 🏟️ Gestión de Canchas (Courts)

Base URL: `/api/court`

### 🏟️ Crear Cancha

**POST** `/`
**Permisos:** admin

```json
{
  "name": "Cancha Central",
  "description": "Cancha principal con iluminación LED",
  "capacity": 4,
  "features": ["iluminación LED", "aire acondicionado", "vestuarios"],
  "basePricePerHour": 50.00,
  "status": "active",
  "locationDetails": "Planta baja, lado oeste",
  "images": ["image1.jpg", "image2.jpg"]
}
```

**Respuesta:**
```json
{
  "message": "Cancha creada exitosamente",
  "court": {
    "id": "uuid-cancha",
    "name": "Cancha Central",
    "description": "Cancha principal con iluminación LED",
    "capacity": 4,
    "features": ["iluminación LED", "aire acondicionado", "vestuarios"],
    "basePricePerHour": 50.00,
    "status": "active",
    "locationDetails": "Planta baja, lado oeste",
    "images": ["image1.jpg", "image2.jpg"],
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### 📋 Listar Canchas

**GET** `/`
**Permisos:** customer, staff, admin

**Query Parameters:**
- `q` (opcional): Búsqueda por nombre o descripción
- `status` (opcional): active/maintenance/inactive
- `minPrice` (opcional): Precio mínimo por hora
- `maxPrice` (opcional): Precio máximo por hora
- `features` (opcional): Características separadas por comas
- `page` (opcional): Número de página
- `pageSize` (opcional): Elementos por página

**Ejemplo:** `/api/court?status=active&minPrice=40&features=aire acondicionado`

**Respuesta:**
```json
{
  "courts": [
    {
      "id": "uuid-cancha",
      "name": "Cancha Central",
      "description": "Cancha principal con iluminación LED",
      "capacity": 4,
      "features": ["iluminación LED", "aire acondicionado"],
      "basePricePerHour": 50.00,
      "status": "active",
      "pricing": [
        {
          "id": "pricing-uuid",
          "dayOfWeek": 1,
          "startTime": "18:00",
          "endTime": "22:00",
          "pricePerHour": 75.00
        }
      ]
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

### 🔍 Obtener Cancha por ID

**GET** `/:id`
**Permisos:** customer, staff, admin

**Respuesta:**
```json
{
  "id": "uuid-cancha",
  "name": "Cancha Central",
  "description": "Cancha principal con iluminación LED",
  "capacity": 4,
  "features": ["iluminación LED", "aire acondicionado"],
  "basePricePerHour": 50.00,
  "status": "active",
  "locationDetails": "Planta baja, lado oeste",
  "images": ["image1.jpg", "image2.jpg"],
  "reservations": [
    {
      "id": "reservation-uuid",
      "reservationDate": "2024-01-16",
      "startTime": "18:00",
      "endTime": "20:00",
      "status": "confirmed"
    }
  ],
  "pricing": [
    {
      "id": "pricing-uuid",
      "dayOfWeek": 1,
      "startTime": "18:00",
      "endTime": "22:00",
      "pricePerHour": 75.00,
      "isActive": true
    }
  ],
  "statistics": {
    "upcomingReservations": 3,
    "favoriteUsers": 12
  }
}
```

### ✏️ Actualizar Cancha

**PUT** `/:id`
**Permisos:** admin

```json
{
  "name": "Cancha Central Premium",
  "description": "Cancha renovada con nuevas comodidades",
  "basePricePerHour": 60.00,
  "features": ["iluminación LED", "aire acondicionado", "vestuarios", "wifi"]
}
```

### 🔄 Cambiar Estado de Cancha

**PATCH** `/:id/status`
**Permisos:** admin

```json
{
  "status": "maintenance",
  "reason": "Renovación del piso"
}
```

**Respuesta:**
```json
{
  "message": "Status de cancha cambiado de active a maintenance",
  "court": {
    "id": "uuid-cancha",
    "status": "maintenance"
  }
}
```

### 🗑️ Eliminar Cancha

**DELETE** `/:id`
**Permisos:** admin

**Respuesta:**
```json
{
  "message": "Cancha eliminada exitosamente",
  "courtId": "uuid-cancha"
}
```

---

## 📅 Reservas (Reservations)

Base URL: `/api/reservation`

### 📅 Crear Reserva

**POST** `/`
**Permisos:** customer, staff, admin

```json
{
  "courtId": "uuid-cancha",
  "reservationDate": "2024-01-20",
  "startTime": "18:00",
  "endTime": "20:00",
  "totalPrice": 150.00,
  "bookingType": "individual",
  "specialRequests": "Solicito pelotas nuevas"
}
```

**Valores válidos:**
- `bookingType`: individual, group, tournament
- `startTime`/`endTime`: formato HH:MM (24 horas)
- `reservationDate`: formato YYYY-MM-DD

**Respuesta:**
```json
{
  "message": "Reservación creada exitosamente",
  "reservation": {
    "id": "uuid-reserva",
    "userId": "uuid-usuario",
    "courtId": "uuid-cancha",
    "reservationDate": "2024-01-20",
    "startTime": "18:00",
    "endTime": "20:00",
    "durationMinutes": 120,
    "totalPrice": 150.00,
    "bookingType": "individual",
    "status": "confirmed",
    "specialRequests": "Solicito pelotas nuevas",
    "court": {
      "id": "uuid-cancha",
      "name": "Cancha Central",
      "basePricePerHour": 50.00
    },
    "user": {
      "id": "uuid-usuario",
      "fullName": "Juan Pérez",
      "email": "juan@example.com"
    }
  }
}
```

### 📋 Listar Reservas

**GET** `/`
**Permisos:** customer (sus propias), staff, admin

**Query Parameters:**
- `courtId` (opcional): UUID de la cancha
- `userId` (opcional): UUID del usuario
- `dateFrom` (opcional): Fecha desde (YYYY-MM-DD)
- `dateTo` (opcional): Fecha hasta (YYYY-MM-DD)
- `status` (opcional): pending/confirmed/completed/cancelled/no_show
- `bookingType` (opcional): individual/group/tournament
- `page` (opcional): Número de página
- `pageSize` (opcional): Elementos por página

**Respuesta:**
```json
{
  "reservations": [
    {
      "id": "uuid-reserva",
      "reservationDate": "2024-01-20",
      "startTime": "18:00",
      "endTime": "20:00",
      "totalPrice": 150.00,
      "status": "confirmed",
      "court": {
        "id": "uuid-cancha",
        "name": "Cancha Central"
      },
      "user": {
        "id": "uuid-usuario",
        "fullName": "Juan Pérez"
      },
      "payment": {
        "id": "uuid-pago",
        "amount": 150.00,
        "status": "completed"
      }
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

### 🔍 Obtener Reserva por ID

**GET** `/:id`
**Permisos:** customer (propietario), staff, admin

### ✏️ Actualizar Reserva

**PUT** `/:id`
**Permisos:** customer (propietario), staff, admin

```json
{
  "reservationDate": "2024-01-21",
  "startTime": "19:00",
  "endTime": "21:00",
  "specialRequests": "Cambio de horario por lluvia"
}
```

### ❌ Cancelar Reserva

**POST** `/:id/cancel`
**Permisos:** customer (propietario), staff, admin

```json
{
  "cancellationReason": "Enfermedad"
}
```

### ✅ Completar Reserva

**POST** `/:id/complete`
**Permisos:** staff, admin

### ⚠️ Marcar No-Show

**POST** `/:id/no-show`
**Permisos:** staff, admin

### 🗑️ Eliminar Reserva

**DELETE** `/:id`
**Permisos:** customer (propietario), staff, admin

### 🔍 Verificar Disponibilidad

**GET** `/availability/:courtId`
**Permisos:** público

**Query Parameters:**
- `date` (requerido): Fecha (YYYY-MM-DD)
- `startTime` (opcional): Hora inicio (HH:MM)
- `endTime` (opcional): Hora fin (HH:MM)

**Respuesta:**
```json
{
  "available": true,
  "courtId": "uuid-cancha",
  "date": "2024-01-20",
  "startTime": "18:00",
  "endTime": "20:00",
  "duration": 120
}
```

### 👤 Obtener Reservas de Usuario

**GET** `/user/:userId`
**Permisos:** customer (sus propias), staff, admin

### 📊 Estadísticas de Reservas

**GET** `/stats`
**Permisos:** staff, admin

**Query Parameters:**
- `dateFrom` (opcional): Fecha desde
- `dateTo` (opcional): Fecha hasta
- `courtId` (opcional): UUID de cancha específica
- `userId` (opcional): UUID de usuario específico

**Respuesta:**
```json
{
  "totalReservations": 150,
  "totalRevenue": 7500.00,
  "cancellationRate": 8.5,
  "statusBreakdown": [
    { "status": "confirmed", "count": 100 },
    { "status": "completed", "count": 35 },
    { "status": "cancelled", "count": 10 },
    { "status": "no_show", "count": 5 }
  ],
  "bookingTypeBreakdown": [
    { "bookingType": "individual", "count": 120 },
    { "bookingType": "group", "count": 25 },
    { "bookingType": "tournament", "count": 5 }
  ],
  "period": {
    "from": "2024-01-01",
    "to": "2024-01-31"
  }
}
```

---

## 👥 Clientes (Customers)

Base URL: `/api/customer`

### 👤 Crear Cliente

**POST** `/`
**Permisos:** staff, admin

```json
{
  "notes": "Cliente VIP, prefiere canchas techadas"
}
```

**Respuesta:**
```json
{
  "message": "Datos de cliente creados con éxito"
}
```

### 📋 Listar Clientes

**GET** `/`
**Permisos:** staff, admin

**Query Parameters:**
- `q` (opcional): Búsqueda por nombre, email o teléfono
- `page` (opcional): Número de página
- `pageSize` (opcional): Elementos por página

**Respuesta:**
```json
{
  "items": [
    {
      "id": "uuid-cliente",
      "userId": "uuid-usuario",
      "notes": "Cliente VIP",
      "user": {
        "id": "uuid-usuario",
        "fullName": "Juan Pérez",
        "email": "juan@example.com",
        "phone": "5551234567",
        "role": "customer",
        "isActive": true
      }
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1
}
```

### 🔍 Obtener Cliente por ID

**GET** `/:id`
**Permisos:** staff, admin

**Respuesta:**
```json
{
  "id": "uuid-cliente",
  "userId": "uuid-usuario",
  "notes": "Cliente VIP",
  "user": {
    "id": "uuid-usuario",
    "fullName": "Juan Pérez",
    "email": "juan@example.com",
    "phone": "5551234567"
  },
  "reservations": [
    {
      "id": "uuid-reserva",
      "reservationDate": "2024-01-20",
      "startTime": "18:00",
      "status": "confirmed"
    }
  ]
}
```

### ✏️ Actualizar Cliente

**PUT** `/:id`
**Permisos:** staff, admin

```json
{
  "notes": "Cliente VIP, actualizado con descuento especial",
  "userId": "uuid-nuevo-usuario"
}
```

### 🗑️ Eliminar Cliente

**DELETE** `/:id`
**Permisos:** admin

### 📅 Reservas del Cliente

**GET** `/:id/reservations`
**Permisos:** staff, admin

### 🔗 Vincular Usuario

**POST** `/:id/link-user`
**Permisos:** admin

```json
{
  "userId": "uuid-usuario-nuevo"
}
```

### 🔗 Desvincular Usuario

**POST** `/:id/unlink-user`
**Permisos:** admin

**Nota:** No permitido - cada cliente debe tener un usuario asociado.

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
