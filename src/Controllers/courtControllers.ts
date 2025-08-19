import type { Request, Response } from "express";
import { Op } from "sequelize";
import { Court } from "../Models/Court";
import { Reservation } from "../Models/Reservation";
import { CourtPricing } from "../Models/CourtPricing";
import { CourtAvailability } from "../Models/CourtAvailability";
import { UserStats } from "../Models/UserStats";

// ====== Helpers ======

// Incluye información básica para listados
const includeBasics = [
  {
    model: Reservation,
    as: "reservations",
    where: {
      status: { [Op.in]: ["confirmed", "pending"] },
      reservationDate: { [Op.gte]: new Date() }
    },
    required: false,
    limit: 5,
    order: [["reservationDate", "ASC"], ["startTime", "ASC"]]
  },
  {
    model: CourtPricing,
    as: "pricing",
    where: { isActive: true },
    required: false
  }
];

// ====== Create ======
/**
 * POST /courts
 * body: { name, description?, capacity?, features?, basePricePerHour, status?, locationDetails?, images? }
 */
export const createCourt = async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      capacity = 4,
      features = [],
      basePricePerHour,
      status = "active",
      locationDetails,
      images = []
    } = req.body;

    // Verificar que el nombre no exista
    const exists = await Court.findOne({ where: { name: name.trim() } });
    if (exists) {
      return res.status(409).json({ error: "Ya existe una cancha con ese nombre" });
    }

    const court = await Court.create({
      name: name.trim(),
      description: description || null,
      capacity: Number(capacity),
      features: Array.isArray(features) ? features : [],
      basePricePerHour: Number(basePricePerHour),
      status,
      locationDetails: locationDetails || null,
      images: Array.isArray(images) ? images : []
    });

    return res.status(201).json({
      message: "Cancha creada exitosamente",
      court
    });
  } catch (err: any) {
    console.error('Error creating court:', err);
    return res.status(500).json({ error: err?.message ?? "Error interno" });
  }
};

// ====== Read one ======
/**
 * GET /courts/:id
 */
export const getCourtById = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const { id } = req.params;
    
    const court = await Court.findByPk(id, {
      include: [
        {
          model: Reservation,
          as: "reservations",
          where: {
            status: { [Op.in]: ["confirmed", "pending"] },
            reservationDate: { [Op.gte]: new Date() }
          },
          required: false,
          limit: 5,
          order: [["reservationDate", "ASC"], ["startTime", "ASC"]]
        },
        {
          model: CourtPricing,
          as: "pricing",
          where: { isActive: true },
          required: false
        },
        {
          model: CourtAvailability,
          as: "availability",
          where: {
            date: { [Op.gte]: new Date() },
            isAvailable: false
          },
          required: false,
          limit: 10
        }
      ]
    });
    
    if (!court) {
      return res.status(404).json({ error: "Cancha no encontrada" });
    }

    // Estadísticas adicionales
    const now = new Date();
    const upcomingCount = await Reservation.count({
      where: {
        courtId: id,
        status: { [Op.in]: ["pending", "confirmed"] },
        reservationDate: { [Op.gte]: now }
      }
    });

    // Verificar si es cancha favorita de algunos usuarios
    const favoriteUsersCount = await UserStats.count({
      where: { favoriteCourtId: id }
    });

    return res.json({
      ...court.toJSON(),
      statistics: {
        upcomingReservations: upcomingCount,
        favoriteUsers: favoriteUsersCount
      }
    });
  } catch (err: any) {
    console.error('Error getting court:', err);
    return res.status(500).json({ error: err?.message ?? "Error interno" });
  }
};

// ====== List ======
/**
 * GET /courts
 * query: q? (búsqueda), status? (active/maintenance/inactive), minPrice?, maxPrice?, features?, page?, pageSize?
 */
export const listCourts = async (req: Request, res: Response) => {
  try {
    const {
      q,
      status,
      minPrice,
      maxPrice,
      features,
      page = "1",
      pageSize = "20",
    } = req.query as {
      q?: string;
      status?: "active" | "maintenance" | "inactive";
      minPrice?: string;
      maxPrice?: string;
      features?: string;
      page?: string;
      pageSize?: string;
    };

    const where: any = {};
    
    // Filtro por status
    if (status) {
      where.status = status;
    } else {
      // Por defecto solo mostrar canchas activas
      where.status = "active";
    }

    // Filtro por precio
    if (minPrice || maxPrice) {
      where.basePricePerHour = {};
      if (minPrice) where.basePricePerHour[Op.gte] = Number(minPrice);
      if (maxPrice) where.basePricePerHour[Op.lte] = Number(maxPrice);
    }

    // Búsqueda de texto
    if (q?.trim()) {
      const like = `%${q.trim()}%`;
      where[Op.or] = [
        { name: { [Op.iLike]: like } },
        { description: { [Op.iLike]: like } },
      ];
    }

    // Filtro por características (features)
    if (features) {
      const featuresArray = features.split(',').map(f => f.trim());
      where.features = { [Op.contains]: featuresArray };
    }

    const limit = Math.max(1, Math.min(100, Number(pageSize)));
    const offset = (Math.max(1, Number(page)) - 1) * limit;

    const { rows, count } = await Court.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
      include: [
        {
          model: CourtPricing,
          as: "pricing",
          where: { isActive: true },
          required: false,
          limit: 3
        }
      ]
    });

    return res.json({
      courts: rows,
      pagination: {
        total: count,
        page: Number(page),
        pageSize: limit,
        totalPages: Math.ceil(count / limit),
        hasNext: Math.ceil(count / limit) > Number(page),
        hasPrev: Number(page) > 1
      }
    });
  } catch (err: any) {
    console.error('Error listing courts:', err);
    return res.status(500).json({ error: err?.message ?? "Error interno" });
  }
};

// ====== Update ======
/**
 * PUT /courts/:id
 * body: { name?, description?, capacity?, features?, basePricePerHour?, status?, locationDetails?, images? }
 */
export const updateCourt = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      capacity,
      features,
      basePricePerHour,
      status,
      locationDetails,
      images
    } = req.body;

    const court = await Court.findByPk(id);
    if (!court) {
      return res.status(404).json({ error: "Cancha no encontrada" });
    }

    // Validar unicidad de nombre si cambia
    if (name && name !== court.name) {
      const exists = await Court.findOne({ where: { name: name.trim() } });
      if (exists && exists.id !== court.id) {
        return res.status(409).json({ error: "Ya existe otra cancha con ese nombre" });
      }
    }

    // Preparar datos de actualización
    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (capacity) updateData.capacity = Number(capacity);
    if (features) updateData.features = Array.isArray(features) ? features : [];
    if (basePricePerHour) updateData.basePricePerHour = Number(basePricePerHour);
    if (status) updateData.status = status;
    if (locationDetails !== undefined) updateData.locationDetails = locationDetails;
    if (images) updateData.images = Array.isArray(images) ? images : [];

    await court.update(updateData);

    return res.json({
      message: "Cancha actualizada exitosamente",
      court
    });
  } catch (err: any) {
    console.error('Error updating court:', err);
    return res.status(500).json({ error: err?.message ?? "Error interno" });
  }
};

// ====== Change Status ======
/**
 * PATCH /courts/:id/status
 * body: { status: 'active' | 'maintenance' | 'inactive', reason?: string }
 */
export const changeCourtStatus = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const court = await Court.findByPk(id);
    if (!court) {
      return res.status(404).json({ error: "Cancha no encontrada" });
    }

    const oldStatus = court.status;
    await court.update({ status });

    // Si se está poniendo en mantenimiento, crear registro de disponibilidad
    if (status === "maintenance" && oldStatus !== "maintenance") {
      // Bloquear la cancha para los próximos 30 días (ejemplo)
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 30);

      await CourtAvailability.create({
        courtId: id,
        date: today,
        startTime: "00:00",
        endTime: "23:59",
        isAvailable: false,
        reason: "maintenance",
        notes: reason || "Cancha en mantenimiento"
      });
    }

    return res.json({
      message: `Status de cancha cambiado de ${oldStatus} a ${status}`,
      court
    });
  } catch (err: any) {
    console.error('Error changing court status:', err);
    return res.status(500).json({ error: err?.message ?? "Error interno" });
  }
};

// ====== Delete ======
/**
 * DELETE /courts/:id
 * Soft delete - Evita borrar si tiene reservas activas (pending/confirmed)
 */
export const deleteCourt = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const { id } = req.params;

    const court = await Court.findByPk(id);
    if (!court) {
      return res.status(404).json({ error: "Cancha no encontrada" });
    }

    // Verificar reservas activas
    const activeReservations = await Reservation.count({
      where: {
        courtId: id,
        status: { [Op.in]: ["pending", "confirmed"] },
        reservationDate: { [Op.gte]: new Date() }
      }
    });
    
    if (activeReservations > 0) {
      return res.status(409).json({
        error: `No se puede eliminar: la cancha tiene ${activeReservations} reserva(s) activa(s)`
      });
    }

    // Soft delete
    await court.destroy();
    
    return res.json({ 
      message: "Cancha eliminada exitosamente",
      courtId: id
    });
  } catch (err: any) {
    console.error('Error deleting court:', err);
    return res.status(500).json({ error: err?.message ?? "Error interno" });
  }
};
