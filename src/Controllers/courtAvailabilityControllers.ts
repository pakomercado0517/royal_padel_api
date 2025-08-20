import type { Request, Response } from "express";
import { Op, Transaction } from "sequelize";
import db from "../Config/db";
import type { AvailabilityReason, CourtAvailabilityCreationAttributes } from "../Models/CourtAvailability";
import {
  isValidUUID,
  isValidTimeFormat,
  isValidTimeRange,
  isValidDuration,
  isWithinClubHours,
  isValidFutureDate,
  isWithinBookingWindow,
  isValidAvailabilityReason,
  canEditAvailability,
  canDeleteAvailability,
  timeRangesOverlap,
  buildAvailabilityFilters,
  normalizePagination,
  calculateAvailabilityStats,
  normalizeDate,
  generateDateRange,
  formatDateTime,
} from "../Utils/courtAvailabilityHelpers";

const { CourtAvailability, Court, User, Reservation, conn } = db;

// ========= Includes para relaciones =========
const includeBasics = [
  {
    model: Court,
    as: "court",
    attributes: ["id", "name", "surface", "isActive"],
  },
  {
    model: User,
    as: "creator",
    attributes: ["id", "fullName", "email"],
  },
];

const includeDetailed = [
  {
    model: Court,
    as: "court",
    attributes: ["id", "name", "surface", "location", "isActive"],
  },
  {
    model: User,
    as: "creator",
    attributes: ["id", "fullName", "email", "role"],
  },
];

// ========= Create Availability =========
/**
 * POST /court-availability
 * Crea una nueva regla de disponibilidad para una cancha
 */
export const createAvailability = async (req: Request, res: Response) => {
  const t = await conn.transaction();
  try {
    const {
      courtId,
      date,
      startTime,
      endTime,
      isAvailable = false,
      reason,
      notes,
    } = req.body;

    // Validar que la cancha existe
    const court = await Court.findByPk(courtId, { transaction: t });
    if (!court) {
      await t.rollback();
      return res.status(404).json({ error: "Cancha no encontrada" });
    }

    // Validaciones de negocio
    const availabilityDate = new Date(date);
    
    if (!isValidFutureDate(availabilityDate)) {
      await t.rollback();
      return res.status(400).json({ error: "No se pueden crear disponibilidades en fechas pasadas" });
    }

    if (!isWithinBookingWindow(availabilityDate)) {
      await t.rollback();
      return res.status(400).json({ error: "La fecha excede la ventana de reserva permitida (6 meses)" });
    }

    if (!isValidTimeRange(startTime, endTime)) {
      await t.rollback();
      return res.status(400).json({ error: "La hora de inicio debe ser anterior a la de fin" });
    }

    if (!isValidDuration(startTime, endTime)) {
      await t.rollback();
      return res.status(400).json({ error: "La duración debe estar entre 1 y 8 horas" });
    }

    if (!isWithinClubHours(startTime, endTime)) {
      await t.rollback();
      return res.status(400).json({ error: "Los horarios deben estar dentro del horario del club (06:00 - 23:00)" });
    }

    // Verificar traslapes con disponibilidades existentes
    const existingAvailabilities = await CourtAvailability.findAll({
      where: {
        courtId,
        date: availabilityDate,
      },
      transaction: t,
    });

    for (const existing of existingAvailabilities) {
      if (timeRangesOverlap(startTime, endTime, existing.startTime, existing.endTime)) {
        await t.rollback();
        return res.status(409).json({ 
          error: `Ya existe una disponibilidad que se traslapa en el horario ${existing.startTime}-${existing.endTime}` 
        });
      }
    }

    const availabilityData: CourtAvailabilityCreationAttributes = {
      courtId,
      date: availabilityDate,
      startTime,
      endTime,
      isAvailable,
      reason: reason || null,
      notes: notes || null,
      createdBy: req.user.id,
    };

    const availability = await CourtAvailability.create(availabilityData, { transaction: t });
    await t.commit();

    const availabilityWithDetails = await CourtAvailability.findByPk(availability.id, {
      include: includeDetailed,
    });

    return res.status(201).json({
      message: "Disponibilidad creada exitosamente",
      availability: availabilityWithDetails,
    });
  } catch (err: any) {
    await t.rollback();
    console.error("Error creando disponibilidad:", err);
    return res.status(500).json({ error: err?.message || "Error interno del servidor" });
  }
};

// ========= Get Availability by ID =========
/**
 * GET /court-availability/:id
 * Obtiene una disponibilidad por su ID
 */
export const getAvailabilityById = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: "ID de disponibilidad inválido" });
    }

    const availability = await CourtAvailability.findByPk(id, { include: includeDetailed });
    if (!availability) {
      return res.status(404).json({ error: "Disponibilidad no encontrada" });
    }

    return res.json({
      message: "Disponibilidad encontrada",
      availability,
      canEdit: canEditAvailability(
        availability.date, 
        availability.startTime, 
        req.user.id, 
        availability.createdBy
      ),
      canDelete: canDeleteAvailability(
        availability.date, 
        availability.startTime, 
        availability.isAvailable
      ),
    });
  } catch (err: any) {
    console.error("Error obteniendo disponibilidad:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ========= List Availabilities =========
/**
 * GET /court-availability
 * Lista disponibilidades con filtros avanzados
 */
export const listAvailabilities = async (req: Request, res: Response) => {
  try {
    const {
      courtId,
      dateFrom,
      dateTo,
      isAvailable,
      reason,
      createdBy,
      page,
      pageSize,
    } = req.query as {
      courtId?: string;
      dateFrom?: string;
      dateTo?: string;
      isAvailable?: string;
      reason?: AvailabilityReason;
      createdBy?: string;
      page?: string;
      pageSize?: string;
    };

    // Construir filtros
    const where = buildAvailabilityFilters({
      courtId,
      dateFrom,
      dateTo,
      isAvailable: isAvailable !== undefined ? isAvailable === "true" : undefined,
      reason,
      createdBy,
    });

    // Paginación
    const pagination = normalizePagination(page, pageSize);

    const { rows, count } = await CourtAvailability.findAndCountAll({
      where,
      include: includeBasics,
      order: [
        ["date", "ASC"],
        ["startTime", "ASC"],
      ],
      limit: pagination.limit,
      offset: pagination.offset,
    });

    const stats = calculateAvailabilityStats(rows);

    return res.json({
      message: "Disponibilidades obtenidas exitosamente",
      items: rows,
      pagination: {
        total: count,
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages: Math.ceil(count / pagination.pageSize),
      },
      stats,
    });
  } catch (err: any) {
    console.error("Error listando disponibilidades:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ========= Get Court Availability =========
/**
 * GET /court-availability/court/:courtId
 * Obtiene disponibilidad de una cancha específica en un rango de fechas
 */
export const getCourtAvailability = async (
  req: Request<{ courtId: string }>,
  res: Response
) => {
  try {
    const { courtId } = req.params;
    const { dateFrom, dateTo } = req.query as {
      dateFrom?: string;
      dateTo?: string;
    };

    if (!isValidUUID(courtId)) {
      return res.status(400).json({ error: "ID de cancha inválido" });
    }

    // Verificar que la cancha existe
    const court = await Court.findByPk(courtId);
    if (!court) {
      return res.status(404).json({ error: "Cancha no encontrada" });
    }

    // Fechas por defecto (próximos 7 días)
    const startDate = dateFrom ? new Date(dateFrom) : new Date();
    const endDate = dateTo ? new Date(dateTo) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const availabilities = await CourtAvailability.findAll({
      where: {
        courtId,
        date: {
          [Op.gte]: normalizeDate(startDate),
          [Op.lte]: normalizeDate(endDate),
        },
      },
      order: [
        ["date", "ASC"],
        ["startTime", "ASC"],
      ],
    });

    // Agrupar por fecha
    const availabilityByDate: Record<string, any[]> = {};
    for (const availability of availabilities) {
      const dateKey = availability.date.toISOString().split("T")[0];
      if (!availabilityByDate[dateKey]) {
        availabilityByDate[dateKey] = [];
      }
      availabilityByDate[dateKey].push(availability);
    }

    return res.json({
      message: "Disponibilidad de cancha obtenida exitosamente",
      court: {
        id: court.id,
        name: court.name,
        features: court.features,
      },
      period: {
        from: startDate.toISOString().split("T")[0],
        to: endDate.toISOString().split("T")[0],
      },
      availabilities: availabilityByDate,
      stats: calculateAvailabilityStats(availabilities),
    });
  } catch (err: any) {
    console.error("Error obteniendo disponibilidad de cancha:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ========= Update Availability =========
/**
 * PUT /court-availability/:id
 * Actualiza una disponibilidad existente
 */
export const updateAvailability = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  const t = await conn.transaction();
  try {
    const { id } = req.params;
    const { startTime, endTime, isAvailable, reason, notes } = req.body;

    if (!isValidUUID(id)) {
      await t.rollback();
      return res.status(400).json({ error: "ID de disponibilidad inválido" });
    }

    const availability = await CourtAvailability.findByPk(id, { transaction: t });
    if (!availability) {
      await t.rollback();
      return res.status(404).json({ error: "Disponibilidad no encontrada" });
    }

    // Verificar permisos de edición
    if (!canEditAvailability(availability.date, availability.startTime, req.user.id, availability.createdBy)) {
      await t.rollback();
      return res.status(403).json({ 
        error: "No tienes permisos para editar esta disponibilidad o la fecha/hora ya pasó" 
      });
    }

    const updateData: any = {};
    
    // Validar y actualizar horarios si se proporcionan
    if (startTime && endTime) {
      if (!isValidTimeRange(startTime, endTime)) {
        await t.rollback();
        return res.status(400).json({ error: "La hora de inicio debe ser anterior a la de fin" });
      }

      if (!isValidDuration(startTime, endTime)) {
        await t.rollback();
        return res.status(400).json({ error: "La duración debe estar entre 1 y 8 horas" });
      }

      if (!isWithinClubHours(startTime, endTime)) {
        await t.rollback();
        return res.status(400).json({ error: "Los horarios deben estar dentro del horario del club" });
      }

      // Verificar traslapes (excluyendo el registro actual)
      const existingAvailabilities = await CourtAvailability.findAll({
        where: {
          courtId: availability.courtId,
          date: availability.date,
          id: { [Op.ne]: id },
        },
        transaction: t,
      });

      for (const existing of existingAvailabilities) {
        if (timeRangesOverlap(startTime, endTime, existing.startTime, existing.endTime)) {
          await t.rollback();
          return res.status(409).json({ 
            error: `Los nuevos horarios se traslapan con una disponibilidad existente ${existing.startTime}-${existing.endTime}` 
          });
        }
      }

      updateData.startTime = startTime;
      updateData.endTime = endTime;
    }

    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;
    if (reason !== undefined) updateData.reason = reason;
    if (notes !== undefined) updateData.notes = notes;

    await availability.update(updateData, { transaction: t });
    await t.commit();

    const updatedAvailability = await CourtAvailability.findByPk(availability.id, {
      include: includeDetailed,
    });

    return res.json({
      message: "Disponibilidad actualizada exitosamente",
      availability: updatedAvailability,
    });
  } catch (err: any) {
    await t.rollback();
    console.error("Error actualizando disponibilidad:", err);
    return res.status(500).json({ error: err?.message || "Error interno del servidor" });
  }
};

// ========= Delete Availability =========
/**
 * DELETE /court-availability/:id
 * Elimina una disponibilidad
 */
export const deleteAvailability = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: "ID de disponibilidad inválido" });
    }

    const availability = await CourtAvailability.findByPk(id);
    if (!availability) {
      return res.status(404).json({ error: "Disponibilidad no encontrada" });
    }

    // Verificar permisos de eliminación
    if (!canDeleteAvailability(availability.date, availability.startTime, availability.isAvailable)) {
      return res.status(409).json({ 
        error: "No se puede eliminar esta disponibilidad: fecha pasada o es una disponibilidad normal" 
      });
    }

    await availability.destroy();

    return res.json({ 
      message: "Disponibilidad eliminada exitosamente",
      deletedId: id 
    });
  } catch (err: any) {
    console.error("Error eliminando disponibilidad:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ========= Bulk Create Availability =========
/**
 * POST /court-availability/bulk
 * Crea múltiples disponibilidades para un rango de fechas
 */
export const bulkCreateAvailability = async (req: Request, res: Response) => {
  const t = await conn.transaction();
  try {
    const {
      courtId,
      dateFrom,
      dateTo,
      startTime,
      endTime,
      isAvailable = false,
      reason,
      notes,
      daysOfWeek, // Array de números [0,1,2,3,4,5,6] para días específicos
    } = req.body;

    // Validar cancha
    const court = await Court.findByPk(courtId, { transaction: t });
    if (!court) {
      await t.rollback();
      return res.status(404).json({ error: "Cancha no encontrada" });
    }

    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);

    if (!isValidFutureDate(startDate)) {
      await t.rollback();
      return res.status(400).json({ error: "La fecha de inicio no puede ser en el pasado" });
    }

    if (startDate >= endDate) {
      await t.rollback();
      return res.status(400).json({ error: "La fecha de inicio debe ser anterior a la fecha de fin" });
    }

    // Generar fechas
    const dates = generateDateRange(startDate, endDate);
    const filteredDates = daysOfWeek 
      ? dates.filter(date => daysOfWeek.includes(date.getDay()))
      : dates;

    const createdAvailabilities = [];
    const errors = [];

    for (const date of filteredDates) {
      try {
        // Verificar traslapes
        const existingAvailabilities = await CourtAvailability.findAll({
          where: {
            courtId,
            date,
          },
          transaction: t,
        });

        let hasOverlap = false;
        for (const existing of existingAvailabilities) {
          if (timeRangesOverlap(startTime, endTime, existing.startTime, existing.endTime)) {
            hasOverlap = true;
            break;
          }
        }

        if (hasOverlap) {
          errors.push({
            date: date.toISOString().split("T")[0],
            error: "Se traslapa con disponibilidad existente"
          });
          continue;
        }

        const availability = await CourtAvailability.create({
          courtId,
          date,
          startTime,
          endTime,
          isAvailable,
          reason,
          notes,
          createdBy: req.user.id,
        }, { transaction: t });

        createdAvailabilities.push(availability);
      } catch (err: any) {
        errors.push({
          date: date.toISOString().split("T")[0],
          error: err.message
        });
      }
    }

    await t.commit();

    return res.status(201).json({
      message: `Creación masiva completada: ${createdAvailabilities.length} disponibilidades creadas`,
      created: createdAvailabilities.length,
      errors: errors.length,
      details: {
        createdItems: createdAvailabilities,
        errorItems: errors,
      },
    });
  } catch (err: any) {
    await t.rollback();
    console.error("Error en creación masiva:", err);
    return res.status(500).json({ error: err?.message || "Error interno del servidor" });
  }
};

// ========= Get Availability Stats =========
/**
 * GET /court-availability/stats
 * Obtiene estadísticas de disponibilidad
 */
export const getAvailabilityStats = async (req: Request, res: Response) => {
  try {
    const {
      courtId,
      dateFrom,
      dateTo,
    } = req.query as {
      courtId?: string;
      dateFrom?: string;
      dateTo?: string;
    };

    const where: any = {};
    
    if (courtId) {
      if (!isValidUUID(courtId)) {
        return res.status(400).json({ error: "ID de cancha inválido" });
      }
      where.courtId = courtId;
    }

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date[Op.gte] = new Date(dateFrom);
      if (dateTo) where.date[Op.lte] = new Date(dateTo);
    }

    const availabilities = await CourtAvailability.findAll({
      where,
      include: [{ model: Court, as: "court", attributes: ["name"] }],
    });

    const stats = calculateAvailabilityStats(availabilities);

    // Estadísticas por cancha si no se filtró por courtId
    let statsByCourt = {};
    if (!courtId) {
      statsByCourt = availabilities.reduce((acc, availability) => {
        const courtName = availability.court?.name || "Sin nombre";
        if (!acc[courtName]) {
          acc[courtName] = [];
        }
        acc[courtName].push(availability);
        return acc;
      }, {} as Record<string, any[]>);

      // Calcular estadísticas para cada cancha
      Object.keys(statsByCourt).forEach(courtName => {
        statsByCourt[courtName] = calculateAvailabilityStats(statsByCourt[courtName]);
      });
    }

    return res.json({
      message: "Estadísticas de disponibilidad obtenidas exitosamente",
      period: {
        from: dateFrom || null,
        to: dateTo || null,
      },
      overall: stats,
      byCourt: statsByCourt,
    });
  } catch (err: any) {
    console.error("Error obteniendo estadísticas:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};
