# Documentación de Endpoints - Royal Padel Backend

## Sistemas Implementados

### 1. CourtAvailability (Disponibilidad de Canchas)
### 2. Payments (Sistema de Pagos) - Ya completado anteriormente
### 3. Notifications (Notificaciones) - En desarrollo

---

## 🏟️ COURT AVAILABILITY ENDPOINTS

### Base URL: `/api/court-availability`

| Método | Endpoint | Acceso | Descripción |
|--------|----------|--------|-------------|
| POST | `/` | Staff/Admin | Crear disponibilidad |
| GET | `/` | Todos | Listar disponibilidades |
| GET | `/stats` | Staff/Admin | Estadísticas |
| POST | `/bulk` | Admin | Creación masiva |
| GET | `/court/:courtId` | Todos | Disponibilidad por cancha |
| GET | `/:id` | Staff/Admin | Obtener por ID |
| PUT | `/:id` | Staff/Admin | Actualizar |
| DELETE | `/:id` | Admin | Eliminar |

---

### 📍 **POST** `/api/court-availability`
**Crear nueva disponibilidad**

**Headers:**
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "courtId": "550e8400-e29b-41d4-a716-446655440000",
  "date": "2024-12-25",
  "startTime": "14:00",
  "endTime": "16:00",
  "isAvailable": false,
  "reason": "maintenance",
  "notes": "Mantenimiento de superficie"
}
```

**Respuesta 201:**
```json
{
  "message": "Disponibilidad creada exitosamente",
  "availability": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "courtId": "550e8400-e29b-41d4-a716-446655440000",
    "date": "2024-12-25T00:00:00.000Z",
    "startTime": "14:00",
    "endTime": "16:00",
    "isAvailable": false,
    "reason": "maintenance",
    "notes": "Mantenimiento de superficie",
    "court": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Cancha Central"
    }
  }
}
```

---

### 📍 **GET** `/api/court-availability`
**Listar disponibilidades con filtros**

**Headers:**
```http
Authorization: Bearer <token>
```

**Query Parameters:**
- `courtId`: UUID de la cancha (opcional)
- `dateFrom`: Fecha inicio YYYY-MM-DD (opcional)
- `dateTo`: Fecha fin YYYY-MM-DD (opcional)
- `isAvailable`: true/false (opcional)
- `reason`: maintenance|private_event|reserved|blocked (opcional)
- `page`: Número de página (opcional, default: 1)
- `pageSize`: Elementos por página (opcional, default: 20, max: 100)

**Ejemplo:**
```
GET /api/court-availability?courtId=550e8400-e29b-41d4-a716-446655440000&dateFrom=2024-12-01&dateTo=2024-12-31&page=1&pageSize=10
```

**Respuesta 200:**
```json
{
  "message": "Disponibilidades obtenidas exitosamente",
  "items": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "courtId": "550e8400-e29b-41d4-a716-446655440000",
      "date": "2024-12-25T00:00:00.000Z",
      "startTime": "14:00",
      "endTime": "16:00",
      "isAvailable": false,
      "reason": "maintenance",
      "court": {
        "name": "Cancha Central"
      }
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "pageSize": 10,
    "totalPages": 5
  },
  "stats": {
    "total": 10,
    "available": 6,
    "blocked": 4,
    "availabilityRate": 60
  }
}
```

---

### 📍 **GET** `/api/court-availability/court/:courtId`
**Obtener disponibilidad de una cancha específica**

**Headers:**
```http
Authorization: Bearer <token>
```

**Query Parameters:**
- `dateFrom`: Fecha inicio YYYY-MM-DD (opcional, default: hoy)
- `dateTo`: Fecha fin YYYY-MM-DD (opcional, default: +7 días)

**Ejemplo:**
```
GET /api/court-availability/court/550e8400-e29b-41d4-a716-446655440000?dateFrom=2024-12-01&dateTo=2024-12-07
```

**Respuesta 200:**
```json
{
  "message": "Disponibilidad de cancha obtenida exitosamente",
  "court": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Cancha Central",
    "features": ["Iluminación", "Techo"]
  },
  "period": {
    "from": "2024-12-01",
    "to": "2024-12-07"
  },
  "availabilities": {
    "2024-12-01": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "startTime": "14:00",
        "endTime": "16:00",
        "isAvailable": false,
        "reason": "maintenance"
      }
    ],
    "2024-12-02": []
  },
  "stats": {
    "total": 1,
    "available": 0,
    "blocked": 1,
    "availabilityRate": 0
  }
}
```

---

### 📍 **POST** `/api/court-availability/bulk`
**Creación masiva de disponibilidades**

**Headers:**
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "courtId": "550e8400-e29b-41d4-a716-446655440000",
  "dateFrom": "2024-12-01",
  "dateTo": "2024-12-31",
  "startTime": "12:00",
  "endTime": "13:00",
  "isAvailable": false,
  "reason": "maintenance",
  "notes": "Mantenimiento diario",
  "daysOfWeek": [1, 2, 3, 4, 5]
}
```

**Respuesta 201:**
```json
{
  "message": "Creación masiva completada: 22 disponibilidades creadas",
  "created": 22,
  "errors": 3,
  "details": {
    "createdItems": [...],
    "errorItems": [
      {
        "date": "2024-12-15",
        "error": "Se traslapa con disponibilidad existente"
      }
    ]
  }
}
```

---

### 📍 **PUT** `/api/court-availability/:id`
**Actualizar disponibilidad**

**Headers:**
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "startTime": "15:00",
  "endTime": "17:00",
  "notes": "Notas actualizadas"
}
```

**Respuesta 200:**
```json
{
  "message": "Disponibilidad actualizada exitosamente",
  "availability": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "startTime": "15:00",
    "endTime": "17:00",
    "notes": "Notas actualizadas"
  }
}
```

---

### 📍 **DELETE** `/api/court-availability/:id`
**Eliminar disponibilidad**

**Headers:**
```http
Authorization: Bearer <token>
```

**Respuesta 200:**
```json
{
  "message": "Disponibilidad eliminada exitosamente",
  "deletedId": "123e4567-e89b-12d3-a456-426614174000"
}
```

---

### 📍 **GET** `/api/court-availability/stats`
**Estadísticas de disponibilidad**

**Headers:**
```http
Authorization: Bearer <token>
```

**Query Parameters:**
- `courtId`: UUID de la cancha (opcional)
- `dateFrom`: Fecha inicio YYYY-MM-DD (opcional)
- `dateTo`: Fecha fin YYYY-MM-DD (opcional)

**Respuesta 200:**
```json
{
  "message": "Estadísticas de disponibilidad obtenidas exitosamente",
  "period": {
    "from": "2024-12-01",
    "to": "2024-12-31"
  },
  "overall": {
    "total": 100,
    "available": 70,
    "blocked": 30,
    "availabilityRate": 70,
    "byReason": {
      "maintenance": 20,
      "private_event": 10
    }
  },
  "byCourt": {
    "Cancha Central": {
      "total": 50,
      "availabilityRate": 80
    }
  }
}
```

---

## 💳 PAYMENTS ENDPOINTS (Ya completado)

### Base URL: `/api/payments`

| Método | Endpoint | Acceso | Descripción |
|--------|----------|--------|-------------|
| POST | `/` | Usuario+ | Crear pago |
| GET | `/` | Usuario+ | Listar pagos |
| GET | `/stats` | Staff+ | Estadísticas |
| GET | `/user/:userId` | Usuario+ | Pagos por usuario |
| GET | `/:id` | Usuario+ | Obtener por ID |
| PUT | `/:id` | Usuario+ | Actualizar |
| POST | `/:id/complete` | Staff+ | Marcar completado |
| POST | `/:id/refund` | Admin | Reembolsar |
| POST | `/:id/fail` | Staff+ | Marcar fallido |
| DELETE | `/:id` | Admin | Eliminar |

### Ejemplo de uso - Crear Pago:

**POST** `/api/payments`
```json
{
  "reservationId": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 150.00,
  "paymentMethod": "card",
  "currency": "MXN",
  "paymentProvider": "stripe",
  "externalPaymentId": "pi_1234567890",
  "markAsCompleted": false
}
```

---

## 🔔 NOTIFICATION ENDPOINTS (En desarrollo)

### Base URL: `/api/notifications`

*Los endpoints de notificaciones se implementarán siguiendo el mismo patrón de validaciones y autorización.*

---

## 🔧 CÓDIGOS DE ERROR COMUNES

| Código | Descripción |
|--------|-------------|
| 400 | Bad Request - Datos inválidos |
| 401 | Unauthorized - Token requerido |
| 403 | Forbidden - Permisos insuficientes |
| 404 | Not Found - Recurso no encontrado |
| 409 | Conflict - Conflicto de estado/datos |
| 500 | Internal Server Error - Error del servidor |

## 🛡️ SISTEMA DE AUTORIZACIÓN

### Roles:
- **Customer**: Usuarios normales
- **Staff**: Personal del club
- **Admin**: Administradores

### Permisos por sistema:

#### CourtAvailability:
- **Customer**: Consultar disponibilidad
- **Staff**: Crear, leer, actualizar disponibilidades
- **Admin**: Todas las operaciones + eliminación + creación masiva

#### Payments:
- **Customer**: Sus propios pagos
- **Staff**: Ver todos + completar/fallar pagos
- **Admin**: Todas las operaciones + reembolsos

---

## 📋 NOTAS DE IMPLEMENTACIÓN

### Validaciones:
- Todos los UUIDs se validan con formato v4
- Fechas en formato ISO8601 (YYYY-MM-DD)
- Horarios en formato HH:MM (24 horas)
- Montos con 2 decimales máximo
- Paginación limitada a 100 elementos por página

### Características:
- Transacciones de base de datos para operaciones críticas
- Rollback automático en caso de errores
- Logging detallado de errores
- Validación exhaustiva con express-validator
- Autorización granular por roles
- Filtros avanzados en listados
- Estadísticas automáticas incluidas
- Soporte para operaciones masivas

### Testing:
Puedes usar Postman, Insomnia o curl para probar todos estos endpoints. Asegúrate de incluir el token de autenticación en el header `Authorization: Bearer <token>`.

### Próximos pasos:
1. Completar implementación de NotificationController
2. Crear CourtPricingController
3. Agregar los routers al archivo principal de rutas
4. Testing completo del sistema
