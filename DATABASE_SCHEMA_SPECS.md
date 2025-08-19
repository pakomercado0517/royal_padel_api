# 🏆 Royal Padel - Database Schema Specifications

## 📋 Prompt para Backend Developer

> **Instrucciones**: Implementa el siguiente esquema de base de datos para Royal Padel usando **Sequelize-TypeScript** y **PostgreSQL**. Crea todos los modelos, migraciones y relaciones especificadas. El esquema está diseñado para soportar el sistema completo de reservas de canchas de pádel con autenticación, pagos y estadísticas de usuario.

---

## 🎯 Contexto del Proyecto

**Royal Padel** es una aplicación web para gestión de reservas de canchas de pádel que incluye:

- ✅ Sistema de autenticación completo (registro, login, recuperación de contraseña)
- ✅ Dashboard con estadísticas de usuario y reservas
- ✅ Reserva rápida de canchas con validación en tiempo real
- ✅ Gestión de jugadores por reservación
- ✅ Sistema de pagos integrado
- ✅ Notificaciones y logros de usuarios
- ✅ Precios dinámicos por horario y temporada

---

## 🗄️ Especificaciones Técnicas

### **Stack Backend Requerido:**
- **ORM**: Sequelize-TypeScript v6+
- **Base de Datos**: PostgreSQL 14+
- **UUID**: Usar UUID v4 como Primary Keys
- **Timestamps**: Automáticos con `createdAt`, `updatedAt`
- **Soft Delete**: Implementar con `deletedAt` donde aplique
- **Validaciones**: A nivel de modelo y base de datos

---

## 📊 Modelos y Tablas

### **1. 👤 User Model**

```typescript
// Tabla: users
interface UserAttributes {
  id: string; // UUID, Primary Key
  email: string; // UNIQUE, NOT NULL
  passwordHash: string; // NOT NULL
  fullName: string; // NOT NULL
  phone?: string; // NULLABLE
  avatarUrl?: string; // NULLABLE
  dateOfBirth?: Date; // NULLABLE
  status: 'active' | 'inactive' | 'suspended'; // DEFAULT 'active'
  emailVerified: boolean; // DEFAULT false
  phoneVerified: boolean; // DEFAULT false
  preferences: object; // JSON - configuraciones personales
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date; // Para soft delete
}
```

**Validaciones:**
- Email: formato válido, único
- FullName: mínimo 2 caracteres, máximo 100
- Phone: formato internacional opcional
- Password: mínimo 6 caracteres (hasheada)

**Índices:**
```sql
CREATE UNIQUE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status ON users(status);
```

---

### **2. 🔐 AuthToken Model**

```typescript
// Tabla: auth_tokens
interface AuthTokenAttributes {
  id: string; // UUID, Primary Key
  userId: string; // FK → users.id
  token: string; // UNIQUE, NOT NULL
  type: 'email_verification' | 'password_reset' | 'phone_verification';
  expiresAt: Date; // NOT NULL
  usedAt?: Date; // NULLABLE
  metadata?: object; // JSON - info adicional
  createdAt: Date;
  updatedAt: Date;
}
```

**Relaciones:**
- `belongsTo(User, { foreignKey: 'userId', as: 'user' })`

**Índices:**
```sql
CREATE UNIQUE INDEX idx_auth_tokens_token ON auth_tokens(token);
CREATE INDEX idx_auth_tokens_user_type ON auth_tokens(user_id, type);
CREATE INDEX idx_auth_tokens_expires ON auth_tokens(expires_at);
```

---

### **3. 🏟️ Court Model**

```typescript
// Tabla: courts
interface CourtAttributes {
  id: string; // UUID, Primary Key
  name: string; // NOT NULL, ej: "Cancha 1", "Cancha Premium"
  description?: string; // NULLABLE
  capacity: number; // DEFAULT 4 (máximo jugadores)
  features: string[]; // JSON Array - ["Iluminación LED", "Césped Premium"]
  basePricePerHour: number; // DECIMAL(8,2) - precio base
  status: 'active' | 'maintenance' | 'inactive'; // DEFAULT 'active'
  locationDetails?: object; // JSON - ubicación dentro del club
  images: string[]; // JSON Array - URLs de fotos
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
```

**Validaciones:**
- Name: único, no vacío
- Capacity: mínimo 2, máximo 8
- BasePricePerHour: mayor a 0

**Índices:**
```sql
CREATE INDEX idx_courts_status ON courts(status);
CREATE INDEX idx_courts_name ON courts(name);
```

---

### **4. 💰 CourtPricing Model**

```typescript
// Tabla: court_pricing
interface CourtPricingAttributes {
  id: string; // UUID, Primary Key
  courtId: string; // FK → courts.id
  dayOfWeek: number; // 0=domingo, 1=lunes, etc.
  startTime: string; // TIME formato HH:mm
  endTime: string; // TIME formato HH:mm
  pricePerHour: number; // DECIMAL(8,2)
  season: 'high' | 'medium' | 'low'; // DEFAULT 'medium'
  isActive: boolean; // DEFAULT true
  createdAt: Date;
  updatedAt: Date;
}
```

**Relaciones:**
- `belongsTo(Court, { foreignKey: 'courtId', as: 'court' })`

**Validaciones:**
- DayOfWeek: 0-6
- Times: formato HH:mm válido
- StartTime < EndTime
- PricePerHour: mayor a 0

**Índices:**
```sql
CREATE INDEX idx_court_pricing_court_day ON court_pricing(court_id, day_of_week);
CREATE INDEX idx_court_pricing_active ON court_pricing(is_active);
```

---

### **5. 📅 Reservation Model**

```typescript
// Tabla: reservations
interface ReservationAttributes {
  id: string; // UUID, Primary Key
  userId: string; // FK → users.id (quien reserva)
  courtId: string; // FK → courts.id
  reservationDate: Date; // DATE - día de la reserva
  startTime: string; // TIME formato HH:mm
  endTime: string; // TIME formato HH:mm
  durationMinutes: number; // Calculado: 60, 90, 120, etc.
  totalPrice: number; // DECIMAL(8,2)
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
  bookingType: 'individual' | 'group' | 'tournament'; // DEFAULT 'individual'
  specialRequests?: string; // TEXT - solicitudes especiales
  cancellationReason?: string; // TEXT
  cancelledAt?: Date;
  confirmedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

**Relaciones:**
- `belongsTo(User, { foreignKey: 'userId', as: 'user' })`
- `belongsTo(Court, { foreignKey: 'courtId', as: 'court' })`
- `hasMany(ReservationPlayer, { foreignKey: 'reservationId', as: 'players' })`
- `hasOne(Payment, { foreignKey: 'reservationId', as: 'payment' })`

**Validaciones:**
- ReservationDate: no puede ser en el pasado
- StartTime < EndTime
- DurationMinutes: múltiplo de 30, mínimo 60
- TotalPrice: mayor a 0

**Índices:**
```sql
CREATE INDEX idx_reservations_user_date ON reservations(user_id, reservation_date DESC);
CREATE INDEX idx_reservations_court_datetime ON reservations(court_id, reservation_date, start_time);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_date_range ON reservations(reservation_date) WHERE status IN ('confirmed', 'pending');
```

---

### **6. 👥 ReservationPlayer Model**

```typescript
// Tabla: reservation_players
interface ReservationPlayerAttributes {
  id: string; // UUID, Primary Key
  reservationId: string; // FK → reservations.id
  userId?: string; // FK → users.id, NULLABLE (null si invitado)
  guestName?: string; // VARCHAR - nombre si no está registrado
  guestEmail?: string; // VARCHAR - email del invitado
  role: 'organizer' | 'player' | 'guest'; // DEFAULT 'player'
  status: 'confirmed' | 'pending' | 'declined'; // DEFAULT 'pending'
  joinedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

**Relaciones:**
- `belongsTo(Reservation, { foreignKey: 'reservationId', as: 'reservation' })`
- `belongsTo(User, { foreignKey: 'userId', as: 'user', allowNull: true })`

**Validaciones:**
- Máximo 4 jugadores por reservación (constraint a nivel aplicación)
- Si userId es null, guestName es requerido
- Email format válido si se proporciona

**Constraints:**
```sql
ALTER TABLE reservation_players 
ADD CONSTRAINT unique_user_per_reservation 
UNIQUE(reservation_id, user_id);

-- Trigger para validar máximo 4 jugadores por reservación
```

---

### **7. 💳 Payment Model**

```typescript
// Tabla: payments
interface PaymentAttributes {
  id: string; // UUID, Primary Key
  reservationId: string; // FK → reservations.id
  userId: string; // FK → users.id
  amount: number; // DECIMAL(8,2)
  currency: string; // VARCHAR(3), DEFAULT 'USD'
  paymentMethod: 'card' | 'cash' | 'transfer' | 'wallet';
  paymentProvider?: string; // stripe, paypal, etc.
  externalPaymentId?: string; // ID del proveedor externo
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  processedAt?: Date;
  refundedAt?: Date;
  refundAmount?: number; // DECIMAL(8,2)
  createdAt: Date;
  updatedAt: Date;
}
```

**Relaciones:**
- `belongsTo(Reservation, { foreignKey: 'reservationId', as: 'reservation' })`
- `belongsTo(User, { foreignKey: 'userId', as: 'user' })`

**Validaciones:**
- Amount: mayor a 0
- Currency: códigos ISO válidos
- RefundAmount: no mayor al amount original

**Índices:**
```sql
CREATE INDEX idx_payments_reservation ON payments(reservation_id);
CREATE INDEX idx_payments_user_status ON payments(user_id, status);
CREATE INDEX idx_payments_external_id ON payments(external_payment_id);
```

---

### **8. 📊 UserStats Model**

```typescript
// Tabla: user_stats
interface UserStatsAttributes {
  id: string; // UUID, Primary Key
  userId: string; // FK → users.id, UNIQUE
  totalGamesPlayed: number; // DEFAULT 0
  totalHoursPlayed: number; // DECIMAL(5,2), DEFAULT 0
  currentMonthGames: number; // DEFAULT 0 - se resetea cada mes
  favoriteCourtId?: string; // FK → courts.id, NULLABLE
  totalSpent: number; // DECIMAL(10,2), DEFAULT 0
  averageRating?: number; // DECIMAL(3,2) - rating como jugador
  lastGameDate?: Date;
  streakDays: number; // DEFAULT 0 - días consecutivos jugando
  achievements: string[]; // JSON Array - badges desbloqueados
  preferencesData?: object; // JSON - horarios preferidos, etc.
  createdAt: Date;
  updatedAt: Date;
}
```

**Relaciones:**
- `belongsTo(User, { foreignKey: 'userId', as: 'user' })`
- `belongsTo(Court, { foreignKey: 'favoriteCourtId', as: 'favoriteCourt', allowNull: true })`

**Índices:**
```sql
CREATE UNIQUE INDEX idx_user_stats_user ON user_stats(user_id);
CREATE INDEX idx_user_stats_games_played ON user_stats(total_games_played DESC);
```

---

### **9. 📝 CourtAvailability Model**

```typescript
// Tabla: court_availability
interface CourtAvailabilityAttributes {
  id: string; // UUID, Primary Key
  courtId: string; // FK → courts.id
  date: Date; // DATE - día específico
  startTime: string; // TIME formato HH:mm
  endTime: string; // TIME formato HH:mm
  isAvailable: boolean; // DEFAULT true
  reason?: 'maintenance' | 'private_event' | 'reserved' | 'blocked';
  notes?: string; // TEXT
  createdBy?: string; // FK → users.id (admin que creó)
  createdAt: Date;
  updatedAt: Date;
}
```

**Relaciones:**
- `belongsTo(Court, { foreignKey: 'courtId', as: 'court' })`
- `belongsTo(User, { foreignKey: 'createdBy', as: 'creator', allowNull: true })`

**Constraints:**
```sql
ALTER TABLE court_availability 
ADD CONSTRAINT unique_court_datetime 
UNIQUE(court_id, date, start_time);
```

---

### **10. 🏆 UserAchievement Model**

```typescript
// Tabla: user_achievements
interface UserAchievementAttributes {
  id: string; // UUID, Primary Key
  userId: string; // FK → users.id
  achievementType: 'games_played' | 'consecutive_days' | 'hours_played' | 'first_win' | 'loyalty';
  achievementName: string; // "Jugador Matutino", "Rey de la Cancha"
  description: string; // Descripción del logro
  points: number; // Sistema de puntos, DEFAULT 0
  unlockedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

**Relaciones:**
- `belongsTo(User, { foreignKey: 'userId', as: 'user' })`

**Índices:**
```sql
CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_type ON user_achievements(achievement_type);
```

---

### **11. 💬 Notification Model**

```typescript
// Tabla: notifications
interface NotificationAttributes {
  id: string; // UUID, Primary Key
  userId: string; // FK → users.id
  title: string; // NOT NULL
  message: string; // TEXT, NOT NULL
  type: 'reservation_confirmed' | 'payment_received' | 'reminder' | 'system' | 'achievement';
  priority: 'low' | 'medium' | 'high' | 'urgent'; // DEFAULT 'medium'
  isRead: boolean; // DEFAULT false
  readAt?: Date;
  actionUrl?: string; // URL para acción específica
  metadata?: object; // JSON - datos adicionales
  createdAt: Date;
  expiresAt?: Date;
}
```

**Relaciones:**
- `belongsTo(User, { foreignKey: 'userId', as: 'user' })`

**Índices:**
```sql
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_expires ON notifications(expires_at);
```

---

## 🔗 Configuración de Relaciones Sequelize

### **Associations Setup:**

```typescript
// En tu archivo de asociaciones o models/index.ts
export const setupAssociations = () => {
  // User relationships
  User.hasMany(Reservation, { foreignKey: 'userId', as: 'reservations' });
  User.hasMany(AuthToken, { foreignKey: 'userId', as: 'tokens' });
  User.hasOne(UserStats, { foreignKey: 'userId', as: 'stats' });
  User.hasMany(UserAchievement, { foreignKey: 'userId', as: 'achievements' });
  User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });

  // Court relationships
  Court.hasMany(Reservation, { foreignKey: 'courtId', as: 'reservations' });
  Court.hasMany(CourtPricing, { foreignKey: 'courtId', as: 'pricing' });
  Court.hasMany(CourtAvailability, { foreignKey: 'courtId', as: 'availability' });

  // Reservation relationships
  Reservation.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  Reservation.belongsTo(Court, { foreignKey: 'courtId', as: 'court' });
  Reservation.hasMany(ReservationPlayer, { foreignKey: 'reservationId', as: 'players' });
  Reservation.hasOne(Payment, { foreignKey: 'reservationId', as: 'payment' });

  // ReservationPlayer relationships
  ReservationPlayer.belongsTo(Reservation, { foreignKey: 'reservationId', as: 'reservation' });
  ReservationPlayer.belongsTo(User, { foreignKey: 'userId', as: 'user', allowNull: true });

  // Payment relationships
  Payment.belongsTo(Reservation, { foreignKey: 'reservationId', as: 'reservation' });
  Payment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  // Stats relationships
  UserStats.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  UserStats.belongsTo(Court, { foreignKey: 'favoriteCourtId', as: 'favoriteCourt', allowNull: true });
};
```

---

## 📋 Migraciones Requeridas

### **Orden de Creación:**
1. `users`
2. `courts`
3. `auth_tokens`
4. `court_pricing`
5. `reservations`
6. `reservation_players`
7. `payments`
8. `user_stats`
9. `court_availability`
10. `user_achievements`
11. `notifications`

### **Datos Iniciales (Seeders):**

```typescript
// Canchas por defecto
const defaultCourts = [
  {
    name: 'Cancha 1',
    features: ['Iluminación LED', 'Césped Sintético'],
    basePricePerHour: 25.00,
    capacity: 4,
    status: 'active'
  },
  {
    name: 'Cancha 2', 
    features: ['Iluminación LED', 'Césped Sintético'],
    basePricePerHour: 25.00,
    capacity: 4,
    status: 'active'
  },
  {
    name: 'Cancha 3',
    features: ['Iluminación LED', 'Césped Premium', 'Climatizada'],
    basePricePerHour: 30.00,
    capacity: 4,
    status: 'active'
  },
  {
    name: 'Cancha 4',
    features: ['Iluminación LED', 'Césped Premium', 'Climatizada'],
    basePricePerHour: 30.00,
    capacity: 4,
    status: 'active'
  }
];

// Precios por horario (ejemplo)
const defaultPricing = [
  // Horarios matutinos (más baratos)
  { startTime: '08:00', endTime: '12:00', multiplier: 0.8 },
  // Horarios tarde (precio normal)  
  { startTime: '12:00', endTime: '18:00', multiplier: 1.0 },
  // Horarios noche (más caros)
  { startTime: '18:00', endTime: '22:00', multiplier: 1.3 }
];
```

---

## 🔍 Queries Críticos para el Dashboard

### **Welcome Section Data:**
```typescript
// Obtener estadísticas del usuario
const getUserDashboardData = async (userId: string) => {
  const userStats = await UserStats.findOne({
    where: { userId },
    include: [
      {
        model: Court,
        as: 'favoriteCourt',
        attributes: ['id', 'name']
      }
    ]
  });

  return userStats;
};
```

### **Upcoming Reservations:**
```typescript
const getUpcomingReservations = async (userId: string, limit = 3) => {
  return await Reservation.findAll({
    where: {
      userId,
      reservationDate: { [Op.gte]: new Date() },
      status: { [Op.in]: ['confirmed', 'pending'] }
    },
    include: [
      {
        model: Court,
        as: 'court',
        attributes: ['id', 'name']
      },
      {
        model: ReservationPlayer,
        as: 'players',
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'fullName']
          }
        ]
      }
    ],
    order: [['reservationDate', 'ASC'], ['startTime', 'ASC']],
    limit
  });
};
```

### **Available Courts Real-time:**
```typescript
const getAvailableCourts = async (date: Date, startTime: string) => {
  const courts = await Court.findAll({
    where: { status: 'active' },
    include: [
      {
        model: Reservation,
        as: 'reservations',
        where: {
          reservationDate: date,
          [Op.or]: [
            {
              startTime: { [Op.lte]: startTime },
              endTime: { [Op.gt]: startTime }
            }
          ]
        },
        required: false
      }
    ]
  });

  // Filtrar canchas ocupadas
  return courts.filter(court => court.reservations.length === 0);
};
```

---

## ⚡ Optimizaciones de Performance

### **Índices Compuestos Críticos:**
```sql
-- Para búsquedas de disponibilidad
CREATE INDEX idx_reservations_court_date_time 
ON reservations(court_id, reservation_date, start_time, end_time) 
WHERE status IN ('confirmed', 'pending');

-- Para dashboard de usuario
CREATE INDEX idx_reservations_user_recent 
ON reservations(user_id, reservation_date DESC, status) 
WHERE reservation_date >= CURRENT_DATE - INTERVAL '30 days';

-- Para estadísticas
CREATE INDEX idx_reservations_completed_stats 
ON reservations(user_id, status, reservation_date) 
WHERE status = 'completed';
```

### **Cacheo Recomendado:**
- Estado de canchas en tiempo real (Redis TTL 30s)
- Estadísticas de usuario (Redis TTL 5min)
- Precios por cancha/horario (Redis TTL 1h)

---

## 🚀 Consideraciones Adicionales

### **Soft Delete Configuration:**
```typescript
// En sequelize config
const sequelize = new Sequelize({
  // ... otras opciones
  define: {
    paranoid: true, // Habilita soft delete globalmente
    deletedAt: 'deletedAt',
    underscored: true, // snake_case en DB
    timestamps: true
  }
});
```

### **Triggers Recomendados:**
1. **Auto-actualizar UserStats** cuando se completa una reservación
2. **Validar conflictos** de horarios en reservaciones
3. **Limpiar tokens expirados** automáticamente
4. **Calcular streaks** de días consecutivos

### **Constraints de Negocio:**
1. No permitir reservas en el pasado
2. Máximo 4 jugadores por reservación
3. No overlap de horarios por cancha
4. Validar horarios de operación del club

---

## ✅ Checklist de Implementación

### **Modelos y Migraciones:**
- [ ] Configurar Sequelize-TypeScript
- [ ] Crear todos los modelos con validaciones
- [ ] Crear migraciones en orden correcto
- [ ] Configurar todas las relaciones
- [ ] Agregar índices de performance

### **Seeders:**
- [ ] Canchas por defecto
- [ ] Precios base por horario
- [ ] Usuario administrador
- [ ] Tipos de logros disponibles

### **Testing:**
- [ ] Unit tests para modelos
- [ ] Integration tests para relaciones
- [ ] Performance tests para queries críticos
- [ ] Validación de constraints

### **Documentación:**
- [ ] API endpoints planeados
- [ ] Esquemas de respuesta JSON
- [ ] Casos de uso principales
- [ ] Troubleshooting guide

---

## 🔚 Notas Finales

Este esquema está diseñado para escalar y soportar todas las funcionalidades actuales y futuras de Royal Padel. Las relaciones están optimizadas para las consultas más frecuentes del dashboard y el sistema de reservas.

**Prioridad de implementación:**
1. **Core**: Users, Courts, Reservations, Payments
2. **Stats**: UserStats, CourtAvailability 
3. **Features**: Achievements, Notifications
4. **Advanced**: Tournament system (futuro)

¡Listo para implementar! 🚀
