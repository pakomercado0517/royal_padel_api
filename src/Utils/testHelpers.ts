// Utilidades para testing y debugging
export const getTestTokens = () => {
  return {
    confirmationToken: (globalThis as any).royalPadelConfirmationToken,
    passwordResetToken: (globalThis as any).royalPadelPasswordResetToken,
    jwtToken: (globalThis as any).royalPadelJWT,
  };
};

export const clearTestTokens = () => {
  delete (globalThis as any).royalPadelConfirmationToken;
  delete (globalThis as any).royalPadelPasswordResetToken;
  delete (globalThis as any).royalPadelJWT;
};

// Función para crear usuarios de prueba
export const createTestUser = (overrides: any = {}) => {
  return {
    fullName: "Test User",
    email: "test@example.com",
    password: "Test123456",
    phone: "+525551234567",
    role: "customer",
    ...overrides
  };
};

export const createAdminUser = (overrides: any = {}) => {
  return createTestUser({
    fullName: "Admin User",
    email: "admin@example.com",
    role: "admin",
    ...overrides
  });
};

export const createStaffUser = (overrides: any = {}) => {
  return createTestUser({
    fullName: "Staff User", 
    email: "staff@example.com",
    role: "staff",
    ...overrides
  });
};
