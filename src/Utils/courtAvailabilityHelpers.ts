import { AvailabilityReason } from "../Models/CourtAvailability";

// ========= Constantes =========
export const VALID_AVAILABILITY_REASONS: AvailabilityReason[] = [
  "maintenance", 
  "private_event", 
  "reserved", 
  "blocked"
];

export const VALID_TIME_FORMAT = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

// Horarios estándar del club
export const CLUB_OPEN_TIME = "06:00";
export const CLUB_CLOSE_TIME = "23:00";
export const MIN_SLOT_DURATION_MINUTES = 60; // Mínimo 1 hora
export const MAX_SLOT_DURATION_MINUTES = 480; // Máximo 8 horas

// ========= Validaciones =========

/**
 * Valida que una razón de disponibilidad sea válida
 */
export const isValidAvailabilityReason = (reason: string): reason is AvailabilityReason => {
  return VALID_AVAILABILITY_REASONS.includes(reason as AvailabilityReason);
};

/**
 * Valida formato de tiempo HH:MM
 */
export const isValidTimeFormat = (time: string): boolean => {
  return VALID_TIME_FORMAT.test(time);
};

/**
 * Valida que una fecha no sea en el pasado
 */
export const isValidFutureDate = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
};

/**
 * Valida que una fecha no sea más de 6 meses en el futuro
 */
export const isWithinBookingWindow = (date: Date): boolean => {
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 6);
  return date <= maxDate;
};

/**
 * Valida que un UUID sea válido
 */
export const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

// ========= Helpers de tiempo =========

/**
 * Convierte string de tiempo HH:MM a minutos desde medianoche
 */
export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

/**
 * Convierte minutos desde medianoche a string HH:MM
 */
export const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
};

/**
 * Valida que el tiempo de inicio sea anterior al de fin
 */
export const isValidTimeRange = (startTime: string, endTime: string): boolean => {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  return startMinutes < endMinutes;
};

/**
 * Valida que la duración esté dentro de los límites permitidos
 */
export const isValidDuration = (startTime: string, endTime: string): boolean => {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const duration = endMinutes - startMinutes;
  
  return duration >= MIN_SLOT_DURATION_MINUTES && duration <= MAX_SLOT_DURATION_MINUTES;
};

/**
 * Valida que los horarios estén dentro del horario del club
 */
export const isWithinClubHours = (startTime: string, endTime: string): boolean => {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const openMinutes = timeToMinutes(CLUB_OPEN_TIME);
  const closeMinutes = timeToMinutes(CLUB_CLOSE_TIME);
  
  return startMinutes >= openMinutes && endMinutes <= closeMinutes;
};

/**
 * Verifica si dos rangos de tiempo se traslapan
 */
export const timeRangesOverlap = (
  start1: string, 
  end1: string, 
  start2: string, 
  end2: string
): boolean => {
  const start1Minutes = timeToMinutes(start1);
  const end1Minutes = timeToMinutes(end1);
  const start2Minutes = timeToMinutes(start2);
  const end2Minutes = timeToMinutes(end2);
  
  return start1Minutes < end2Minutes && start2Minutes < end1Minutes;
};

// ========= Helpers de disponibilidad =========

/**
 * Determina si una disponibilidad puede ser editada
 */
export const canEditAvailability = (
  date: Date, 
  startTime: string, 
  currentUserId: string, 
  createdBy: string | null
): boolean => {
  // Solo el creador o admin puede editar
  if (createdBy && createdBy !== currentUserId) {
    return false;
  }
  
  // No se puede editar si ya pasó la fecha/hora
  const now = new Date();
  const availabilityDateTime = new Date(date);
  const [hours, minutes] = startTime.split(":").map(Number);
  availabilityDateTime.setHours(hours, minutes, 0, 0);
  
  return availabilityDateTime > now;
};

/**
 * Determina si una disponibilidad puede ser eliminada
 */
export const canDeleteAvailability = (
  date: Date, 
  startTime: string, 
  isAvailable: boolean
): boolean => {
  // No se puede eliminar si la fecha/hora ya pasó
  const now = new Date();
  const availabilityDateTime = new Date(date);
  const [hours, minutes] = startTime.split(":").map(Number);
  availabilityDateTime.setHours(hours, minutes, 0, 0);
  
  if (availabilityDateTime <= now) {
    return false;
  }
  
  // Solo se pueden eliminar bloqueos, no disponibilidades normales
  return !isAvailable;
};

// ========= Helpers de filtros =========

/**
 * Construye filtros WHERE para consultas de disponibilidad
 */
export const buildAvailabilityFilters = (filters: {
  courtId?: string;
  dateFrom?: string;
  dateTo?: string;
  isAvailable?: boolean;
  reason?: AvailabilityReason;
  createdBy?: string;
}) => {
  const where: any = {};
  
  if (filters.courtId) {
    where.courtId = filters.courtId;
  }
  
  if (filters.dateFrom || filters.dateTo) {
    where.date = {};
    if (filters.dateFrom) {
      where.date.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      where.date.lte = new Date(filters.dateTo);
    }
  }
  
  if (filters.isAvailable !== undefined) {
    where.isAvailable = filters.isAvailable;
  }
  
  if (filters.reason) {
    where.reason = filters.reason;
  }
  
  if (filters.createdBy) {
    where.createdBy = filters.createdBy;
  }
  
  return where;
};

// ========= Helpers de fecha =========

/**
 * Normaliza una fecha para comparaciones (sin tiempo)
 */
export const normalizeDate = (date: Date): Date => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

/**
 * Genera fechas entre un rango
 */
export const generateDateRange = (startDate: Date, endDate: Date): Date[] => {
  const dates: Date[] = [];
  const currentDate = normalizeDate(startDate);
  const finalDate = normalizeDate(endDate);
  
  while (currentDate <= finalDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
};

/**
 * Obtiene el día de la semana (0 = domingo, 6 = sábado)
 */
export const getDayOfWeek = (date: Date): number => {
  return date.getDay();
};

/**
 * Convierte número de día a nombre
 */
export const getDayName = (dayNumber: number): string => {
  const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  return days[dayNumber] || "Desconocido";
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

// ========= Helpers de formato =========

/**
 * Formatea una fecha para mostrar al usuario
 */
export const formatDate = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

/**
 * Formatea fecha y hora para mostrar al usuario
 */
export const formatDateTime = (date: Date, time: string): string => {
  return `${formatDate(date)} ${time}`;
};

/**
 * Convierte razón de disponibilidad a texto legible
 */
export const formatAvailabilityReason = (reason: AvailabilityReason | null): string => {
  const reasons: Record<AvailabilityReason, string> = {
    maintenance: "Mantenimiento",
    private_event: "Evento Privado",
    reserved: "Reservado",
    blocked: "Bloqueado"
  };
  
  return reason ? reasons[reason] : "Sin especificar";
};

// ========= Helpers de cálculo =========

/**
 * Calcula estadísticas de disponibilidad
 */
export const calculateAvailabilityStats = (availabilities: any[]) => {
  const total = availabilities.length;
  const available = availabilities.filter(a => a.isAvailable).length;
  const blocked = total - available;
  
  const byReason = availabilities
    .filter(a => !a.isAvailable && a.reason)
    .reduce((acc, a) => {
      acc[a.reason] = (acc[a.reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  
  return {
    total,
    available,
    blocked,
    availabilityRate: total > 0 ? Math.round((available / total) * 100) : 0,
    byReason
  };
};
