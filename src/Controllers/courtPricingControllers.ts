import type { Request, Response } from "express";
import { Op, Transaction } from "sequelize";
import db from "../Config/db";
import type { Season, CourtPricingCreationAttributes } from "../Models/CourtPricing";
import {
  isValidUUID,
  isValidDayOfWeek,
  normalizePrice,
  normalizeSeason,
  isValidTimeRange,
  isWithinClubHours,
  timeRangesOverlap,
  hasScheduleConflict,
  canEditPricing,
  canDeletePricing,
  buildPricingFilters,
  normalizePagination,
  calculatePricingStats,
  findApplicablePrice,
  calculateTotalPrice,
  calculateDurationHours,
  getDayName,
  generateStandardPricingTemplate,
} from "../Utils/courtPricingHelpers";

const { CourtPricing, Court, conn } = db;

// ========= Includes para relaciones =========
const includeBasics = [
  {
    model: Court,
    as: "court",
    attributes: ["id", "name", "basePricePerHour", "status"],
  },
];

const includeDetailed = [
  {
    model: Court,
    as: "court",
    attributes: ["id", "name", "basePricePerHour", "status", "features"],
  },
];

// ========= Create Pricing Rule =========
/**
 * POST /court-pricing
 * Crea una nueva regla de precios para una cancha
 */
export const createPricingRule = async (req: Request, res: Response) => {
  const t = await conn.transaction();
  try {
    const {
      courtId,
      dayOfWeek,
      startTime,
      endTime,
      pricePerHour,
      season = "medium",
      isActive = true,
    } = req.body;

    // Validar que la cancha existe
    const court = await Court.findByPk(courtId, { transaction: t });
    if (!court) {
      await t.rollback();
      return res.status(404).json({ error: "Cancha no encontrada" });
    }

    // Validaciones de negocio
    if (!isValidTimeRange(startTime, endTime)) {
      await t.rollback();
      return res.status(400).json({ error: "La hora de inicio debe ser anterior a la de fin" });
    }

    if (!isWithinClubHours(startTime, endTime)) {
      await t.rollback();
      return res.status(400).json({ error: "Los horarios deben estar dentro del horario del club (06:00 - 23:00)" });
    }

    // Verificar conflictos de horario para la misma cancha y día
    const existingRules = await CourtPricing.findAll({
      where: {
        courtId,
        dayOfWeek,
        isActive: true,
      },
      transaction: t,
    });

    if (hasScheduleConflict(existingRules, startTime, endTime)) {
      await t.rollback();
      return res.status(409).json({ 
        error: "Ya existe una regla de precio que se traslapa en este horario" 
      });
    }

    // Normalizar datos
    const normalizedPrice = normalizePrice(pricePerHour);
    const normalizedSeason = normalizeSeason(season);

    const pricingData: CourtPricingCreationAttributes = {
      courtId,
      dayOfWeek,
      startTime,
      endTime,
      pricePerHour: normalizedPrice,
      season: normalizedSeason,
      isActive,
    };

    const pricingRule = await CourtPricing.create(pricingData, { transaction: t });
    await t.commit();

    const pricingWithDetails = await CourtPricing.findByPk(pricingRule.id, {
      include: includeDetailed,
    });

    return res.status(201).json({
      message: "Regla de precio creada exitosamente",
      pricing: pricingWithDetails,
    });
  } catch (err: any) {
    await t.rollback();
    console.error("Error creando regla de precio:", err);
    return res.status(500).json({ error: err?.message || "Error interno del servidor" });
  }
};

// ========= Get Pricing Rule by ID =========
/**
 * GET /court-pricing/:id
 * Obtiene una regla de precio por su ID
 */
export const getPricingRuleById = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: "ID de regla de precio inválido" });
    }

    const pricingRule = await CourtPricing.findByPk(id, { include: includeDetailed });
    if (!pricingRule) {
      return res.status(404).json({ error: "Regla de precio no encontrada" });
    }

    return res.json({
      message: "Regla de precio encontrada",
      pricing: pricingRule,
      dayName: getDayName(pricingRule.dayOfWeek),
      canEdit: canEditPricing(pricingRule.isActive),
      canDelete: canDeletePricing(pricingRule.isActive),
    });
  } catch (err: any) {
    console.error("Error obteniendo regla de precio:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ========= List Pricing Rules =========
/**
 * GET /court-pricing
 * Lista reglas de precio con filtros
 */
export const listPricingRules = async (req: Request, res: Response) => {
  try {
    const {
      courtId,
      dayOfWeek,
      season,
      isActive,
      priceFrom,
      priceTo,
      page,
      pageSize,
    } = req.query as {
      courtId?: string;
      dayOfWeek?: string;
      season?: Season;
      isActive?: string;
      priceFrom?: string;
      priceTo?: string;
      page?: string;
      pageSize?: string;
    };

    // Construir filtros
    const where = buildPricingFilters({
      courtId,
      dayOfWeek: dayOfWeek ? parseInt(dayOfWeek, 10) : undefined,
      season,
      isActive: isActive !== undefined ? isActive === "true" : undefined,
      priceFrom: priceFrom ? parseFloat(priceFrom) : undefined,
      priceTo: priceTo ? parseFloat(priceTo) : undefined,
    });

    // Paginación
    const pagination = normalizePagination(page, pageSize);

    const { rows, count } = await CourtPricing.findAndCountAll({
      where,
      include: includeBasics,
      order: [
        ["courtId", "ASC"],
        ["dayOfWeek", "ASC"],
        ["startTime", "ASC"],
      ],
      limit: pagination.limit,
      offset: pagination.offset,
    });

    const stats = calculatePricingStats(rows);

    return res.json({
      message: "Reglas de precio obtenidas exitosamente",
      items: rows.map(rule => ({
        ...rule.toJSON(),
        dayName: getDayName(rule.dayOfWeek),
      })),
      pagination: {
        total: count,
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages: Math.ceil(count / pagination.pageSize),
      },
      stats,
    });
  } catch (err: any) {
    console.error("Error listando reglas de precio:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ========= Get Court Pricing =========
/**
 * GET /court-pricing/court/:courtId
 * Obtiene todas las reglas de precio de una cancha específica
 */
export const getCourtPricing = async (
  req: Request<{ courtId: string }>,
  res: Response
) => {
  try {
    const { courtId } = req.params;

    if (!isValidUUID(courtId)) {
      return res.status(400).json({ error: "ID de cancha inválido" });
    }

    // Verificar que la cancha existe
    const court = await Court.findByPk(courtId);
    if (!court) {
      return res.status(404).json({ error: "Cancha no encontrada" });
    }

    const pricingRules = await CourtPricing.findAll({
      where: { courtId, isActive: true },
      order: [
        ["dayOfWeek", "ASC"],
        ["startTime", "ASC"],
      ],
    });

    // Agrupar por día de la semana
    const pricingByDay: Record<string, any[]> = {};
    for (let day = 0; day <= 6; day++) {
      const dayName = getDayName(day);
      pricingByDay[dayName] = pricingRules
        .filter(rule => rule.dayOfWeek === day)
        .map(rule => ({
          ...rule.toJSON(),
          dayName,
        }));
    }

    return res.json({
      message: "Precios de cancha obtenidos exitosamente",
      court: {
        id: court.id,
        name: court.name,
        basePricePerHour: court.basePricePerHour,
      },
      pricingByDay,
      stats: calculatePricingStats(pricingRules),
    });
  } catch (err: any) {
    console.error("Error obteniendo precios de cancha:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ========= Calculate Price =========
/**
 * POST /court-pricing/calculate
 * Calcula el precio total para una reserva específica
 */
export const calculatePrice = async (req: Request, res: Response) => {
  try {
    const { courtId, date, startTime, endTime } = req.body;

    if (!isValidUUID(courtId)) {
      return res.status(400).json({ error: "ID de cancha inválido" });
    }

    if (!isValidTimeRange(startTime, endTime)) {
      return res.status(400).json({ error: "Rango de tiempo inválido" });
    }

    // Verificar que la cancha existe
    const court = await Court.findByPk(courtId);
    if (!court) {
      return res.status(404).json({ error: "Cancha no encontrada" });
    }

    const reservationDate = new Date(date);
    const dayOfWeek = reservationDate.getDay();

    // Obtener reglas de precio activas para esta cancha y día
    const pricingRules = await CourtPricing.findAll({
      where: {
        courtId,
        dayOfWeek,
        isActive: true,
      },
    });

    // Encontrar regla aplicable
    const applicableRule = findApplicablePrice(pricingRules, reservationDate, startTime, endTime);

    let pricePerHour: number;
    let appliedRule = null;

    if (applicableRule) {
      pricePerHour = applicableRule.pricePerHour;
      appliedRule = {
        id: applicableRule.id,
        timeRange: `${applicableRule.startTime} - ${applicableRule.endTime}`,
        season: applicableRule.season,
        pricePerHour: applicableRule.pricePerHour,
      };
    } else {
      // Usar precio base de la cancha
      pricePerHour = court.basePricePerHour;
    }

    const durationHours = calculateDurationHours(startTime, endTime);
    const totalPrice = calculateTotalPrice(pricePerHour, durationHours);

    return res.json({
      message: "Precio calculado exitosamente",
      calculation: {
        courtId,
        courtName: court.name,
        date: reservationDate.toISOString().split("T")[0],
        dayName: getDayName(dayOfWeek),
        timeRange: `${startTime} - ${endTime}`,
        durationHours,
        pricePerHour,
        totalPrice,
        appliedRule,
        fallbackToBasePrice: !applicableRule,
      },
    });
  } catch (err: any) {
    console.error("Error calculando precio:", err);
    return res.status(500).json({ error: err?.message || "Error interno del servidor" });
  }
};

// ========= Update Pricing Rule =========
/**
 * PUT /court-pricing/:id
 * Actualiza una regla de precio existente
 */
export const updatePricingRule = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  const t = await conn.transaction();
  try {
    const { id } = req.params;
    const { startTime, endTime, pricePerHour, season, isActive } = req.body;

    if (!isValidUUID(id)) {
      await t.rollback();
      return res.status(400).json({ error: "ID de regla de precio inválido" });
    }

    const pricingRule = await CourtPricing.findByPk(id, { transaction: t });
    if (!pricingRule) {
      await t.rollback();
      return res.status(404).json({ error: "Regla de precio no encontrada" });
    }

    const updateData: any = {};

    // Validar y actualizar horarios si se proporcionan
    if (startTime && endTime) {
      if (!isValidTimeRange(startTime, endTime)) {
        await t.rollback();
        return res.status(400).json({ error: "Rango de tiempo inválido" });
      }

      if (!isWithinClubHours(startTime, endTime)) {
        await t.rollback();
        return res.status(400).json({ error: "Los horarios deben estar dentro del horario del club" });
      }

      // Verificar conflictos (excluyendo el registro actual)
      const existingRules = await CourtPricing.findAll({
        where: {
          courtId: pricingRule.courtId,
          dayOfWeek: pricingRule.dayOfWeek,
          isActive: true,
          id: { [Op.ne]: id },
        },
        transaction: t,
      });

      if (hasScheduleConflict(existingRules, startTime, endTime, id)) {
        await t.rollback();
        return res.status(409).json({ 
          error: "Los nuevos horarios se traslapan con otra regla de precio" 
        });
      }

      updateData.startTime = startTime;
      updateData.endTime = endTime;
    }

    if (pricePerHour !== undefined) {
      updateData.pricePerHour = normalizePrice(pricePerHour);
    }
    
    if (season) {
      updateData.season = normalizeSeason(season);
    }
    
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    await pricingRule.update(updateData, { transaction: t });
    await t.commit();

    const updatedPricingRule = await CourtPricing.findByPk(pricingRule.id, {
      include: includeDetailed,
    });

    return res.json({
      message: "Regla de precio actualizada exitosamente",
      pricing: updatedPricingRule,
    });
  } catch (err: any) {
    await t.rollback();
    console.error("Error actualizando regla de precio:", err);
    return res.status(500).json({ error: err?.message || "Error interno del servidor" });
  }
};

// ========= Delete Pricing Rule =========
/**
 * DELETE /court-pricing/:id
 * Elimina una regla de precio
 */
export const deletePricingRule = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: "ID de regla de precio inválido" });
    }

    const pricingRule = await CourtPricing.findByPk(id);
    if (!pricingRule) {
      return res.status(404).json({ error: "Regla de precio no encontrada" });
    }

    if (!canDeletePricing(pricingRule.isActive)) {
      return res.status(409).json({ 
        error: "Solo se pueden eliminar reglas de precio inactivas" 
      });
    }

    await pricingRule.destroy();

    return res.json({ 
      message: "Regla de precio eliminada exitosamente",
      deletedId: id 
    });
  } catch (err: any) {
    console.error("Error eliminando regla de precio:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ========= Create Standard Template =========
/**
 * POST /court-pricing/template/:courtId
 * Crea un conjunto estándar de reglas de precio para una cancha
 */
export const createStandardTemplate = async (
  req: Request<{ courtId: string }>,
  res: Response
) => {
  const t = await conn.transaction();
  try {
    const { courtId } = req.params;

    if (!isValidUUID(courtId)) {
      await t.rollback();
      return res.status(400).json({ error: "ID de cancha inválido" });
    }

    // Verificar que la cancha existe
    const court = await Court.findByPk(courtId, { transaction: t });
    if (!court) {
      await t.rollback();
      return res.status(404).json({ error: "Cancha no encontrada" });
    }

    // Verificar si ya tiene reglas de precio
    const existingRules = await CourtPricing.findAll({
      where: { courtId },
      transaction: t,
    });

    if (existingRules.length > 0) {
      await t.rollback();
      return res.status(409).json({ 
        error: "La cancha ya tiene reglas de precio configuradas" 
      });
    }

    // Generar plantilla estándar
    const templateRules = generateStandardPricingTemplate(courtId);
    const createdRules = await CourtPricing.bulkCreate(templateRules, { transaction: t });

    await t.commit();

    return res.status(201).json({
      message: `Plantilla estándar creada: ${createdRules.length} reglas de precio`,
      created: createdRules.length,
      rules: createdRules,
    });
  } catch (err: any) {
    await t.rollback();
    console.error("Error creando plantilla estándar:", err);
    return res.status(500).json({ error: err?.message || "Error interno del servidor" });
  }
};

// ========= Get Pricing Stats =========
/**
 * GET /court-pricing/stats
 * Obtiene estadísticas de precios
 */
export const getPricingStats = async (req: Request, res: Response) => {
  try {
    const { courtId, season, isActive } = req.query as {
      courtId?: string;
      season?: Season;
      isActive?: string;
    };

    const where: any = {};
    
    if (courtId) {
      if (!isValidUUID(courtId)) {
        return res.status(400).json({ error: "ID de cancha inválido" });
      }
      where.courtId = courtId;
    }

    if (season) where.season = season;
    if (isActive !== undefined) where.isActive = isActive === "true";

    const pricingRules = await CourtPricing.findAll({
      where,
      include: [{ model: Court, as: "court", attributes: ["name"] }],
    });

    const stats = calculatePricingStats(pricingRules);

    // Estadísticas por cancha si no se filtró por courtId
    let statsByCourt = {};
    if (!courtId) {
      statsByCourt = pricingRules.reduce((acc, rule) => {
        const courtName = rule.court?.name || "Sin nombre";
        if (!acc[courtName]) {
          acc[courtName] = [];
        }
        acc[courtName].push(rule);
        return acc;
      }, {} as Record<string, any[]>);

      // Calcular estadísticas para cada cancha
      Object.keys(statsByCourt).forEach(courtName => {
        statsByCourt[courtName] = calculatePricingStats(statsByCourt[courtName]);
      });
    }

    return res.json({
      message: "Estadísticas de precios obtenidas exitosamente",
      overall: stats,
      byCourt: statsByCourt,
      filters: { courtId: courtId || null, season, isActive },
    });
  } catch (err: any) {
    console.error("Error obteniendo estadísticas de precios:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};
