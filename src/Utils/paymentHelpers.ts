import { PaymentMethod, PaymentStatus } from "../Models/Payment";

// ========= Constantes =========
export const VALID_PAYMENT_METHODS: PaymentMethod[] = ["card", "cash", "transfer", "wallet"];
export const VALID_PAYMENT_STATUSES: PaymentStatus[] = ["pending", "completed", "failed", "refunded"];

export const ALLOWED_CURRENCIES = ["USD", "MXN", "EUR"];
export const DEFAULT_CURRENCY = "USD";

export const MIN_PAYMENT_AMOUNT = 0.01;
export const MAX_PAYMENT_AMOUNT = 999999.99;

export const PAYMENT_PROVIDERS = {
  card: ["stripe", "paypal", "square", "mercadopago"],
  transfer: ["bank_transfer", "wire", "ach"],
  wallet: ["paypal", "apple_pay", "google_pay", "mercadopago"]
};

// ========= Validaciones =========

/**
 * Valida que un método de pago sea válido
 */
export const isValidPaymentMethod = (method: string): method is PaymentMethod => {
  return VALID_PAYMENT_METHODS.includes(method as PaymentMethod);
};

/**
 * Valida que un estado de pago sea válido
 */
export const isValidPaymentStatus = (status: string): status is PaymentStatus => {
  return VALID_PAYMENT_STATUSES.includes(status as PaymentStatus);
};

/**
 * Valida que una moneda sea válida
 */
export const isValidCurrency = (currency: string): boolean => {
  return ALLOWED_CURRENCIES.includes(currency.toUpperCase());
};

/**
 * Valida que un monto sea válido
 */
export const isValidAmount = (amount: number): boolean => {
  return typeof amount === 'number' && 
         !isNaN(amount) && 
         isFinite(amount) && 
         amount >= MIN_PAYMENT_AMOUNT && 
         amount <= MAX_PAYMENT_AMOUNT;
};

/**
 * Valida que un proveedor de pago sea válido para el método dado
 */
export const isValidProvider = (method: PaymentMethod, provider: string): boolean => {
  return PAYMENT_PROVIDERS[method]?.includes(provider) || false;
};

// ========= Helpers de conversión =========

/**
 * Normaliza el método de pago
 */
export const normalizePaymentMethod = (method: string): PaymentMethod => {
  const normalized = method.toLowerCase().trim() as PaymentMethod;
  if (!isValidPaymentMethod(normalized)) {
    throw new Error(`Método de pago inválido: ${method}`);
  }
  return normalized;
};

/**
 * Normaliza la moneda
 */
export const normalizeCurrency = (currency: string): string => {
  const normalized = currency.toUpperCase().trim();
  if (!isValidCurrency(normalized)) {
    throw new Error(`Moneda inválida: ${currency}`);
  }
  return normalized;
};

/**
 * Normaliza el monto (redondea a 2 decimales)
 */
export const normalizeAmount = (amount: number): number => {
  const normalized = Math.round(amount * 100) / 100;
  if (!isValidAmount(normalized)) {
    throw new Error(`Monto inválido: ${amount}. Debe estar entre ${MIN_PAYMENT_AMOUNT} y ${MAX_PAYMENT_AMOUNT}`);
  }
  return normalized;
};

// ========= Helpers de estado =========

/**
 * Determina si un pago puede ser marcado como completado
 */
export const canMarkAsCompleted = (currentStatus: PaymentStatus): boolean => {
  return currentStatus === "pending";
};

/**
 * Determina si un pago puede ser reembolsado
 */
export const canRefund = (currentStatus: PaymentStatus): boolean => {
  return currentStatus === "completed";
};

/**
 * Determina si un pago puede ser eliminado
 */
export const canDelete = (currentStatus: PaymentStatus): boolean => {
  return ["pending", "failed"].includes(currentStatus);
};

/**
 * Determina si un pago puede ser actualizado
 */
export const canUpdate = (currentStatus: PaymentStatus): boolean => {
  return currentStatus === "pending";
};

// ========= Helpers de fecha =========

/**
 * Formatea una fecha para mostrar al usuario
 */
export const formatPaymentDate = (date: Date | null): string | null => {
  if (!date) return null;
  return date.toISOString();
};

/**
 * Obtiene la fecha de expiración para pagos pendientes (24 horas)
 */
export const getPaymentExpiration = (createdAt: Date): Date => {
  const expiration = new Date(createdAt);
  expiration.setHours(expiration.getHours() + 24);
  return expiration;
};

/**
 * Verifica si un pago ha expirado
 */
export const isPaymentExpired = (createdAt: Date, status: PaymentStatus): boolean => {
  if (status !== "pending") return false;
  return new Date() > getPaymentExpiration(createdAt);
};

// ========= Helpers de filtros =========

/**
 * Construye las condiciones WHERE para filtros de payments
 */
export const buildPaymentFilters = (filters: {
  reservationId?: string;
  userId?: string;
  status?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  processedFrom?: string;
  processedTo?: string;
  amountFrom?: number;
  amountTo?: number;
  currency?: string;
  paymentProvider?: string;
}) => {
  const where: any = {};
  
  if (filters.reservationId) {
    where.reservationId = filters.reservationId;
  }
  
  if (filters.userId) {
    where.userId = filters.userId;
  }
  
  if (filters.status) {
    where.status = filters.status;
  }
  
  if (filters.paymentMethod) {
    where.paymentMethod = filters.paymentMethod;
  }
  
  if (filters.processedFrom || filters.processedTo) {
    where.processedAt = {};
    if (filters.processedFrom) {
      where.processedAt.gte = new Date(filters.processedFrom);
    }
    if (filters.processedTo) {
      where.processedAt.lte = new Date(filters.processedTo);
    }
  }
  
  if (filters.amountFrom !== undefined || filters.amountTo !== undefined) {
    where.amount = {};
    if (filters.amountFrom !== undefined) {
      where.amount.gte = filters.amountFrom;
    }
    if (filters.amountTo !== undefined) {
      where.amount.lte = filters.amountTo;
    }
  }
  
  if (filters.currency) {
    where.currency = filters.currency.toUpperCase();
  }
  
  if (filters.paymentProvider) {
    where.paymentProvider = filters.paymentProvider;
  }
  
  return where;
};

// ========= Helpers de paginación =========

/**
 * Normaliza parámetros de paginación
 */
export const normalizePagination = (page?: string, pageSize?: string) => {
  const normalizedPage = Math.max(1, parseInt(page || "1", 10) || 1);
  const normalizedPageSize = Math.max(1, Math.min(100, parseInt(pageSize || "20", 10) || 20));
  const offset = (normalizedPage - 1) * normalizedPageSize;
  
  return {
    page: normalizedPage,
    pageSize: normalizedPageSize,
    offset,
    limit: normalizedPageSize
  };
};

// ========= Helpers para reporte =========

/**
 * Calcula estadísticas básicas de un conjunto de pagos
 */
export const calculatePaymentStats = (payments: any[]) => {
  const totalCount = payments.length;
  const completedPayments = payments.filter(p => p.status === "completed");
  const pendingPayments = payments.filter(p => p.status === "pending");
  const failedPayments = payments.filter(p => p.status === "failed");
  const refundedPayments = payments.filter(p => p.status === "refunded");
  
  const totalAmount = completedPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const refundedAmount = refundedPayments.reduce((sum, p) => sum + (parseFloat(p.refundAmount) || parseFloat(p.amount) || 0), 0);
  
  return {
    totalCount,
    completedCount: completedPayments.length,
    pendingCount: pendingPayments.length,
    failedCount: failedPayments.length,
    refundedCount: refundedPayments.length,
    totalAmount: Math.round(totalAmount * 100) / 100,
    refundedAmount: Math.round(refundedAmount * 100) / 100,
    netAmount: Math.round((totalAmount - refundedAmount) * 100) / 100
  };
};

// ========= Helpers de validación de UUID =========

/**
 * Valida que una cadena sea un UUID válido
 */
export const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};
