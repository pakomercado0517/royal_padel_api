# 🎾 Royal Padel API

API REST para la gestión de reservas de canchas de pádel desarrollada con Node.js, Express y TypeScript.

## 🚀 Tecnologías

- Node.js
- Express
- TypeScript
- PostgreSQL
- Sequelize-TypeScript
- JWT para autenticación
- Nodemailer para envío de emails

## 📦 Instalación

```bash
# Clonar el repositorio
git clone https://github.com/pakomercado0517/royal_padel_api.git

# Instalar dependencias
npm install

# Variables de entorno
Crear archivo .env con las siguientes variables:
DATABASE_URL=
FRONTEND_URL=
JWT_SECRET=
NODE_ENV=
NODEMAILER_HOST=
NODEMAILER_PASS=
NODEMAILER_PORT=
NODEMAILER_USER=
PORT=

# Iniciar en desarrollo
npm run dev

# Construir para producción
npm run build

# Iniciar en producción
npm start
```

## 📚 Modelos

El sistema cuenta con los siguientes modelos principales:

- **User**: Gestión de usuarios y autenticación
- **Customer**: Información de clientes
- **Court**: Canchas disponibles
- **Reservation**: Reservas de canchas
- **Payment**: Pagos de reservas

## 🛣️ Rutas

### 🔐 Autenticación (/user)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /create_account | Crear nueva cuenta de usuario |
| POST | /confirm_account | Confirmar cuenta con token |
| POST | /login | Iniciar sesión |
| POST | /forgot_password | Solicitar reset de contraseña |
| POST | /validate_token | Validar token de reset |
| POST | /reset_password/:token | Cambiar contraseña con token |

### 📝 Validaciones

Las rutas incluyen validaciones para:

- Nombre completo requerido
- Email válido
- Contraseña mínimo 6 caracteres
- Teléfono en formato MX (opcional)
- Roles válidos: admin o user
- Token de 6 dígitos para confirmaciones

## 🔒 Autenticación

El sistema utiliza JWT (JSON Web Tokens) para la autenticación de usuarios. El token debe incluirse en el header de las peticiones:

```
Authorization: Bearer <token>
```

## ✉️ Emails Transaccionales

Se envían emails automáticos para:

- Confirmación de cuenta
- Reset de contraseña

Los templates incluyen:
- Diseño responsive
- Soporte para modo oscuro
- Códigos de verificación de 6 dígitos
- Enlaces de acción
- Marca personalizada

## 🛠️ En Desarrollo

Esta documentación se actualizará conforme se agreguen nuevas funcionalidades como:

- Gestión de canchas
- Sistema de reservas
- Procesamiento de pagos
- Panel de administración

---
Desarrollado por [Francisco Mercado](https://github.com/pakomercado0517) 🚀
