# 🔐 Auth API - Requests de Prueba

## 📋 **Configuración Base**
- **Base URL:** `http://localhost:3003/api/auth`
- **Content-Type:** `application/json`

---

## 🚀 **1. Health Check**
```bash
GET http://localhost:3003/health
```

---

## 👤 **2. Crear Cuenta**
```bash
POST http://localhost:3003/api/auth/create_account
Content-Type: application/json

{
  "fullName": "Juan Pérez",
  "email": "juan@example.com",
  "password": "Test123456",
  "phone": "+525551234567",
  "role": "customer"
}
```

**Respuesta esperada:**
```json
{
  "message": "Usuario creado correctamente. Revisa tu correo para confirmar tu cuenta.",
  "userId": "uuid-generado"
}
```

---

## ✅ **3. Confirmar Cuenta**
```bash
POST http://localhost:3003/api/auth/confirm_account
Content-Type: application/json

{
  "token": "123456"
}
```

> **📝 Nota:** En desarrollo, el token se guarda en `(globalThis as any).royalPadelConfirmationToken`

---

## 🔑 **4. Iniciar Sesión**
```bash
POST http://localhost:3003/api/auth/login
Content-Type: application/json

{
  "email": "juan@example.com",
  "password": "Test123456"
}
```

**Respuesta esperada:**
```json
{
  "message": "Has iniciado sesión correctamente ✌🏻",
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "fullName": "Juan Pérez",
    "email": "juan@example.com",
    "role": "customer",
    "emailVerified": true,
    "phoneVerified": false,
    "stats": { ... }
  }
}
```

---

## 👤 **5. Obtener Perfil (Autenticado)**
```bash
GET http://localhost:3003/api/auth/profile
Authorization: Bearer {tu-jwt-token}
```

---

## 🔒 **6. Olvidé mi Contraseña**
```bash
POST http://localhost:3003/api/auth/forgot_password
Content-Type: application/json

{
  "email": "juan@example.com"
}
```

---

## 🔓 **7. Validar Token de Reseteo**
```bash
POST http://localhost:3003/api/auth/validate_token
Content-Type: application/json

{
  "token": "123456"
}
```

---

## 🔐 **8. Restablecer Contraseña**
```bash
POST http://localhost:3003/api/auth/reset_password/123456
Content-Type: application/json

{
  "password": "NewPassword123"
}
```

---

## 🔄 **9. Cambiar Contraseña (Autenticado)**
```bash
POST http://localhost:3003/api/auth/update_password
Authorization: Bearer {tu-jwt-token}
Content-Type: application/json

{
  "currentPassword": "Test123456",
  "newPassword": "NewPassword123"
}
```

---

## ✏️ **10. Actualizar Datos de Usuario**
```bash
PUT http://localhost:3003/api/auth/
Authorization: Bearer {tu-jwt-token}
Content-Type: application/json

{
  "fullName": "Juan Pérez Actualizado",
  "email": "nuevo@example.com",
  "phone": "+525559876543"
}
```

---

## 🧪 **Testing con cURL**

### Crear cuenta:
```bash
curl -X POST http://localhost:3003/api/auth/create_account \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "email": "test@example.com",
    "password": "Test123456",
    "phone": "+525551234567"
  }'
```

### Login:
```bash
curl -X POST http://localhost:3003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456"
  }'
```

---

## 🐛 **Casos de Prueba de Errores**

### Email ya registrado:
```bash
POST /api/auth/create_account
{
  "fullName": "Usuario Duplicado",
  "email": "juan@example.com",  # Email ya usado
  "password": "Test123456"
}
```

### Login sin confirmar email:
```bash
POST /api/auth/login
{
  "email": "sin-confirmar@example.com",
  "password": "Test123456"
}
```

### Token inválido:
```bash
POST /api/auth/confirm_account
{
  "token": "000000"  # Token inexistente
}
```

---

## 📊 **Estructura de Respuestas**

### ✅ Éxito:
```json
{
  "message": "Operación exitosa",
  "data": { ... }
}
```

### ❌ Error de Validación:
```json
{
  "errors": [
    {
      "msg": "Email debe ser válido",
      "param": "email",
      "location": "body"
    }
  ]
}
```

### ❌ Error de Negocio:
```json
{
  "error": "El email ya está registrado"
}
```

---

## 🔧 **Utilidades de Testing**

En Node.js console (durante desarrollo):
```javascript
// Obtener tokens de testing
const { getTestTokens } = require('./dist/Utils/testHelpers');
console.log(getTestTokens());

// Limpiar tokens
const { clearTestTokens } = require('./dist/Utils/testHelpers');
clearTestTokens();
```

---

**¡Listo para probar! 🚀**
