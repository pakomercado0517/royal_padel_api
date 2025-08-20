import { Season } from "../Models/CourtPricing";

// ========= Constantes =========
export const VALID_SEASONS: Season[] = ["high", "medium", "low"];

export const VALID_TIME_FORMAT = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

export const VALID_DAYS_OF_WEEK = [0, 1, 2, 3, 4, 5, 6]; // 0=domingo, 6=sábado

export const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// Límites de precios
export const MIN_PRICE_PER_HOUR = 0.01;
export const MAX_PRICE_PER_HOUR = 9999.99;

// Horarios típicos
export const CLUB_OPEN_TIME = "06:00";
export const CLUB_CLOSE_TIME = "23:00";

// ========= Validaciones =========

/**
 * Valida que una temporada sea válida
 */
export const isValidSeason = (season: string): season is Season => {
  return VALID_SEASONS.includes(season as Season);
};

/**
 * Valida formato de tiempo HH:MM
 */
export const isValidTimeFormat = (time: string): boolean => {
  return VALID_TIME_FORMAT.test(time);
};

/**
 * Valida que un día de la semana sea válido (0-6)
 */
export const isValidDayOfWeek = (day: number): boolean => {
  return VALID_DAYS_OF_WEEK.includes(day);
};

/**
 * Valida que un precio por hora sea válido
 */
export const isValidPricePerHour = (price: number): boolean => {
  return typeof price === 'number' && 
         !isNaN(price) && 
         isFinite(price) && 
         price >= MIN_PRICE_PER_HOUR && 
         price <= MAX_PRICE_PER_HOUR;
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

// ========= Helpers de precios =========

/**
 * Normaliza un precio (redondea a 2 decimales)
 */
export const normalizePrice = (price: number): number => {
  const normalized = Math.round(price * 100) / 100;
  if (!isValidPricePerHour(normalized)) {
    throw new Error(`Precio inválido: ${price}. Debe estar entre ${MIN_PRICE_PER_HOUR} y ${MAX_PRICE_PER_HOUR}`);
  }
  return normalized;
};

/**
 * Normaliza temporada
 */
export const normalizeSeason = (season: string): Season => {
  const normalized = season.toLowerCase().trim() as Season;
  if (!isValidSeason(normalized)) {
    throw new Error(`Temporada inválida: ${season}`);
  }
  return normalized;
};

// ========= Helpers de cálculo =========

/**
 * Calcula el precio total para una duración específica
 */
export const calculateTotalPrice = (pricePerHour: number, durationHours: number): number => {
  return normalizePrice(pricePerHour * durationHours);
};

/**
 * Calcula la duración en horas entre dos tiempos
 */
export const calculateDurationHours = (startTime: string, endTime: string): number => {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  return (endMinutes - startMinutes) / 60;
};

/**
 * Encuentra el precio aplicable para una fecha y hora específicas
 */
export const findApplicablePrice = (
  pricingRules: any[], 
  date: Date, 
  startTime: string, 
  endTime: string
): any | null => {
  const dayOfWeek = date.getDay();
  
  for (const rule of pricingRules) {
    if (rule.dayOfWeek === dayOfWeek && rule.isActive) {
      // Verificar si el horario se traslapa con la regla de precio
      if (timeRangesOverlap(startTime, endTime, rule.startTime, rule.endTime)) {
        return rule;
      }
    }
  }
  
  return null;
};

// ========= Helpers de filtros =========

/**
 * Construye filtros WHERE para consultas de pricing
 */
export const buildPricingFilters = (filters: {
  courtId?: string;
  dayOfWeek?: number;
  season?: Season;
  isActive?: boolean;
  priceFrom?: number;
  priceTo?: number;
}) => {
  const where: any = {};
  
  if (filters.courtId) {
    where.courtId = filters.courtId;
  }
  
  if (filters.dayOfWeek !== undefined) {
    where.dayOfWeek = filters.dayOfWeek;
  }
  
  if (filters.season) {
    where.season = filters.season;
  }
  
  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }
  
  if (filters.priceFrom !== undefined || filters.priceTo !== undefined) {
    where.pricePerHour = {};
    if (filters.priceFrom !== undefined) {
      where.pricePerHour.gte = filters.priceFrom;
    }
    if (filters.priceTo !== undefined) {
      where.pricePerHour.lte = filters.priceTo;
    }
  }
  
  return where;
};

// ========= Helpers de formato =========

/**
 * Convierte número de día a nombre
 */
export const getDayName = (dayNumber: number): string => {
  return DAY_NAMES[dayNumber] || "Desconocido";
};

/**
 * Formatea temporada para mostrar al usuario
 */
export const formatSeason = (season: Season): string => {
  const seasons: Record<Season, string> = {
    high: "Temporada Alta",
    medium: "Temporada Media",
    low: "Temporada Baja"
  };
  
  return seasons[season];
};

/**
 * Formatea precio como moneda
 */
export const formatPrice = (price: number, currency: string = "MXN"): string => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency,
  }).format(price);
};

/**
 * Formatea rango de tiempo
 */
export const formatTimeRange = (startTime: string, endTime: string): string => {
  return `${startTime} - ${endTime}`;
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

// ========= Helpers de validación de negocio =========

/**
 * Verifica si un precio puede ser editado
 */
export const canEditPricing = (isActive: boolean): boolean => {
  return isActive; // Solo se pueden editar precios activos
};

/**
 * Verifica si un precio puede ser eliminado
 */
export const canDeletePricing = (isActive: boolean): boolean => {
  return !isActive; // Solo se pueden eliminar precios inactivos
};

/**
 * Verifica si hay conflictos de horario para la misma cancha y día
 */
export const hasScheduleConflict = (
  existingRules: any[],
  newStartTime: string,
  newEndTime: string,
  excludeId?: string
): boolean => {
  return existingRules
    .filter(rule => excludeId ? rule.id !== excludeId : true)
    .some(rule => timeRangesOverlap(newStartTime, newEndTime, rule.startTime, rule.endTime));
};

// ========= Helpers de estadísticas =========

/**
 * Calcula estadísticas de precios
 */
export const calculatePricingStats = (pricingRules: any[]) => {
  const total = pricingRules.length;
  const active = pricingRules.filter(r => r.isActive).length;
  const inactive = total - active;
  
  const activePrices = pricingRules.filter(r => r.isActive).map(r => parseFloat(r.pricePerHour));
  const minPrice = activePrices.length > 0 ? Math.min(...activePrices) : 0;
  const maxPrice = activePrices.length > 0 ? Math.max(...activePrices) : 0;
  const avgPrice = activePrices.length > 0 ? 
    activePrices.reduce((sum, price) => sum + price, 0) / activePrices.length : 0;
  
  const bySeason = pricingRules.reduce((acc, rule) => {
    if (!acc[rule.season]) {
      acc[rule.season] = { count: 0, avgPrice: 0, totalPrice: 0 };
    }
    acc[rule.season].count++;
    acc[rule.season].totalPrice += parseFloat(rule.pricePerHour);
    acc[rule.season].avgPrice = acc[rule.season].totalPrice / acc[rule.season].count;
    return acc;
  }, {} as Record<string, any>);
  
  const byDay = pricingRules.reduce((acc, rule) => {
    const dayName = getDayName(rule.dayOfWeek);
    if (!acc[dayName]) {
      acc[dayName] = { count: 0, avgPrice: 0, totalPrice: 0 };
    }
    acc[dayName].count++;
    acc[dayName].totalPrice += parseFloat(rule.pricePerHour);
    acc[dayName].avgPrice = acc[dayName].totalPrice / acc[dayName].count;
    return acc;
  }, {} as Record<string, any>);
  
  return {
    total,
    active,
    inactive,
    priceRange: {
      min: Math.round(minPrice * 100) / 100,
      max: Math.round(maxPrice * 100) / 100,
      avg: Math.round(avgPrice * 100) / 100,
    },
    bySeason,
    byDay,
  };
};

// ========= Helpers de plantillas =========

/**
 * Genera reglas de precio estándar para una cancha
 */
export const generateStandardPricingTemplate = (courtId: string) => {
  const template = [
    // Lunes a Viernes - Horario normal
    { dayOfWeek: 1, startTime: "06:00", endTime: "14:00", pricePerHour: 150, season: "medium" as Season },
    { dayOfWeek: 2, startTime: "06:00", endTime: "14:00", pricePerHour: 150, season: "medium" as Season },
    { dayOfWeek: 3, startTime: "06:00", endTime: "14:00", pricePerHour: 150, season: "medium" as Season },
    { dayOfWeek: 4, startTime: "06:00", endTime: "14:00", pricePerHour: 150, season: "medium" as Season },
    { dayOfWeek: 5, startTime: "06:00", endTime: "14:00", pricePerHour: 150, season: "medium" as Season },
    
    // Lunes a Viernes - Horario pico
    { dayOfWeek: 1, startTime: "18:00", endTime: "23:00", pricePerHour: 200, season: "high" as Season },
    { dayOfWeek: 2, startTime: "18:00", endTime: "23:00", pricePerHour: 200, season: "high" as Season },
    { dayOfWeek: 3, startTime: "18:00", endTime: "23:00", pricePerHour: 200, season: "high" as Season },
    { dayOfWeek: 4, startTime: "18:00", endTime: "23:00", pricePerHour: 200, season: "high" as Season },
    { dayOfWeek: 5, startTime: "18:00", endTime: "23:00", pricePerHour: 200, season: "high" as Season },
    
    // Fin de semana - Todo el día precio alto
    { dayOfWeek: 6, startTime: "06:00", endTime: "23:00", pricePerHour: 250, season: "high" as Season },
    { dayOfWeek: 0, startTime: "06:00", endTime: "23:00", pricePerHour: 250, season: "high" as Season },
  ];
  
  return template.map(rule => ({ ...rule, courtId, isActive: true }));
};
