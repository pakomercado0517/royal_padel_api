import type { Request, Response } from "express";
import { Op } from "sequelize";
import { Reservation } from "../Models/Reservation";
import { Court } from "../Models/Court";
import { User } from "../Models/User";
import { Payment } from "../Models/Payment";
import { ReservationPlayer } from "../Models/ReservationPlayer";
import type {
  ReservationStatus,
  PaymentStatus,
  BookingType,
} from "../Models/Reservation";

// ====== Helpers ======

/**
 * Valida que el tiempo esté en formato HH:mm y sea válido
 */
function validateTimeFormat(time: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

/**
 * Convierte tiempo HH:mm a minutos desde medianoche
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Convierte minutos desde medianoche a formato HH:mm
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

/**
 * Valida rango de tiempo y calcula duración
 */
function validateTimeRange(
  startTime: string,
  endTime: string,
  reservationDate: Date
) {
  if (!validateTimeFormat(startTime) || !validateTimeFormat(endTime)) {
    return { error: "Formato de tiempo inválido. Use HH:mm" };
  }

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  if (endMinutes <= startMinutes) {
    return { error: "La hora de fin debe ser mayor a la de inicio" };
  }

  const duration = endMinutes - startMinutes;
  if (duration < 30) {
    return { error: "La duración mínima es de 30 minutos" };
  }

  // Validar que no sea en el pasado
  const now = new Date();
  const reservationDateTime = new Date(reservationDate);
  reservationDateTime.setHours(
    Math.floor(startMinutes / 60),
    startMinutes % 60,
    0,
    0
  );

  if (reservationDateTime <= now) {
    return { error: "No se pueden hacer reservas en el pasado" };
  }

  return { duration };
}

/**
 * Verifica traslapes con reservas activas
 */
async function hasOverlap(
  courtId: string,
  reservationDate: Date,
  startTime: string,
  endTime: string,
  excludeId?: string
) {
  const where: any = {
    courtId,
    reservationDate,
    status: { [Op.in]: ["pending", "confirmed"] as ReservationStatus[] },
    [Op.or]: [
      // Caso 1: Inicio de nueva reserva está dentro de reserva existente
      {
        [Op.and]: [
          { startTime: { [Op.lte]: startTime } },
          { endTime: { [Op.gt]: startTime } },
        ],
      },
      // Caso 2: Fin de nueva reserva está dentro de reserva existente
      {
        [Op.and]: [
          { startTime: { [Op.lt]: endTime } },
          { endTime: { [Op.gte]: endTime } },
        ],
      },
      // Caso 3: Nueva reserva contiene completamente a reserva existente
      {
        [Op.and]: [
          { startTime: { [Op.gte]: startTime } },
          { endTime: { [Op.lte]: endTime } },
        ],
      },
    ],
  };

  if (excludeId) {
    where.id = { [Op.ne]: excludeId };
  }

  const clash = await Reservation.findOne({ where });
  return Boolean(clash);
}

// ====== Create ======
/**
 * POST /reservations
 * body: { courtId, reservationDate, startTime, endTime, totalPrice, bookingType?, specialRequests? }
 */
export const createReservation = async (req: Request, res: Response) => {
  try {
    const {
      courtId,
      reservationDate,
      startTime,
      endTime,
      totalPrice,
      bookingType = "individual",
      specialRequests,
    } = req.body;

    if (
      !courtId ||
      !reservationDate ||
      !startTime ||
      !endTime ||
      totalPrice == null
    ) {
      return res.status(400).json({
        error:
          "courtId, reservationDate, startTime, endTime y totalPrice son requeridos",
      });
    }

    // Validar que la cancha existe y está activa
    const court = await Court.findByPk(courtId);
    if (!court) {
      return res.status(404).json({ error: "Cancha no encontrada" });
    }

    if (court.status !== "active") {
      return res.status(400).json({ error: "La cancha no está disponible" });
    }

    // Validar rango de tiempo
    const timeValidation = validateTimeRange(
      startTime,
      endTime,
      new Date(reservationDate)
    );
    if (timeValidation.error) {
      return res.status(400).json({ error: timeValidation.error });
    }

    // Verificar traslapes
    const overlap = await hasOverlap(
      courtId,
      new Date(reservationDate),
      startTime,
      endTime
    );

    if (overlap) {
      return res.status(409).json({
        error: "Ya existe una reservación en ese horario para esta cancha",
      });
    }

    // Obtener usuario autenticado
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    const reservation = await Reservation.create({
      userId,
      courtId,
      reservationDate: new Date(reservationDate),
      startTime,
      endTime,
      durationMinutes: timeValidation.duration!,
      totalPrice: Number(totalPrice),
      bookingType: bookingType as BookingType,
      specialRequests: specialRequests || null,
      status: "confirmed",
    });

    const withIncludes = await Reservation.findByPk(reservation.id, {
      include: [
        {
          model: Court,
          as: "court",
          attributes: ["id", "name", "description", "basePricePerHour"],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "fullName", "email"],
        },
        {
          model: Payment,
          as: "payment",
          required: false,
        },
        {
          model: ReservationPlayer,
          as: "players",
          required: false,
        },
      ],
    });

    return res.status(201).json({
      message: "Reservación creada exitosamente",
      reservation: withIncludes,
    });
  } catch (error: any) {
    console.error("Error creating reservation:", error);
    return res.status(500).json({ error: error?.message ?? "Error interno" });
  }
};

// ====== Read One ======
/**
 * GET /reservations/:id
 */
export const getReservationById = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const { id } = req.params;

    const reservation = await Reservation.findByPk(id, {
      include: [
        {
          model: Court,
          as: "court",
          attributes: [
            "id",
            "name",
            "description",
            "basePricePerHour",
            "status",
          ],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "fullName", "email"],
        },
        {
          model: Payment,
          as: "payment",
          required: false,
        },
        {
          model: ReservationPlayer,
          as: "players",
          required: false,
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "fullName", "email"],
            },
          ],
        },
      ],
    });

    if (!reservation) {
      return res.status(404).json({ error: "Reservación no encontrada" });
    }

    return res.json(reservation);
  } catch (error: any) {
    console.error("Error getting reservation:", error);
    return res.status(500).json({ error: error?.message ?? "Error interno" });
  }
};

// ====== List ======
/**
 * GET /reservations
 * query: courtId?, userId?, dateFrom?, dateTo?, status?, bookingType?, page?, pageSize?
 */
export const listReservations = async (req: Request, res: Response) => {
  try {
    const {
      courtId,
      userId,
      dateFrom,
      dateTo,
      status,
      bookingType,
      page = "1",
      pageSize = "20",
    } = req.query as {
      courtId?: string;
      userId?: string;
      dateFrom?: string;
      dateTo?: string;
      status?: ReservationStatus;
      bookingType?: BookingType;
      page?: string;
      pageSize?: string;
    };

    const where: any = {};

    if (courtId) where.courtId = courtId;
    if (userId) where.userId = userId;
    if (status) where.status = status;
    if (bookingType) where.bookingType = bookingType;

    // Filtro por rango de fechas
    if (dateFrom || dateTo) {
      where.reservationDate = {};
      if (dateFrom) where.reservationDate[Op.gte] = new Date(dateFrom);
      if (dateTo) where.reservationDate[Op.lte] = new Date(dateTo);
    }

    const limit = Math.max(1, Math.min(100, Number(pageSize)));
    const offset = (Math.max(1, Number(page)) - 1) * limit;

    const { rows, count } = await Reservation.findAndCountAll({
      where,
      order: [
        ["reservationDate", "DESC"],
        ["startTime", "ASC"],
      ],
      limit,
      offset,
      include: [
        {
          model: Court,
          as: "court",
          attributes: ["id", "name", "description"],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "fullName", "email"],
        },
        {
          model: Payment,
          as: "payment",
          required: false,
          attributes: ["id", "amount", "status"],
        },
      ],
    });

    return res.json({
      reservations: rows,
      pagination: {
        total: count,
        page: Number(page),
        pageSize: limit,
        totalPages: Math.ceil(count / limit),
        hasNext: Math.ceil(count / limit) > Number(page),
        hasPrev: Number(page) > 1,
      },
    });
  } catch (error: any) {
    console.error("Error listing reservations:", error);
    return res.status(500).json({ error: error?.message ?? "Error interno" });
  }
};

// ====== Update ======
/**
 * PUT /reservations/:id
 * body: { reservationDate?, startTime?, endTime?, totalPrice?, bookingType?, specialRequests?, status? }
 */
export const updateReservation = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const { id } = req.params;
    const {
      reservationDate,
      startTime,
      endTime,
      totalPrice,
      bookingType,
      specialRequests,
      status,
    } = req.body;

    const reservation = await Reservation.findByPk(id);
    if (!reservation) {
      return res.status(404).json({ error: "Reservación no encontrada" });
    }

    // No permitir modificar reservas completadas o canceladas
    if (["completed", "cancelled", "no_show"].includes(reservation.status)) {
      return res.status(409).json({
        error:
          "No se puede modificar una reserva completada, cancelada o con no-show",
      });
    }

    // Si cambia fecha/hora, validar
    if (reservationDate || startTime || endTime) {
      const newDate = reservationDate
        ? new Date(reservationDate)
        : reservation.reservationDate;
      const newStartTime = startTime || reservation.startTime;
      const newEndTime = endTime || reservation.endTime;

      const timeValidation = validateTimeRange(
        newStartTime,
        newEndTime,
        newDate
      );
      if (timeValidation.error) {
        return res.status(400).json({ error: timeValidation.error });
      }

      // Verificar traslapes (excluyendo esta reserva)
      const overlap = await hasOverlap(
        reservation.courtId,
        newDate,
        newStartTime,
        newEndTime,
        reservation.id
      );

      if (overlap) {
        return res.status(409).json({
          error: "Ya existe una reservación en ese horario para esta cancha",
        });
      }
    }

    // Preparar datos de actualización
    const updateData: any = {};
    if (reservationDate) updateData.reservationDate = new Date(reservationDate);
    if (startTime) updateData.startTime = startTime;
    if (endTime) updateData.endTime = endTime;
    if (totalPrice !== undefined) updateData.totalPrice = Number(totalPrice);
    if (bookingType) updateData.bookingType = bookingType;
    if (specialRequests !== undefined)
      updateData.specialRequests = specialRequests;
    if (status) updateData.status = status;

    // Calcular nueva duración si cambian los tiempos
    if (startTime || endTime) {
      const newStartTime = startTime || reservation.startTime;
      const newEndTime = endTime || reservation.endTime;
      const startMinutes = timeToMinutes(newStartTime);
      const endMinutes = timeToMinutes(newEndTime);
      updateData.durationMinutes = endMinutes - startMinutes;
    }

    await reservation.update(updateData);

    const updated = await Reservation.findByPk(reservation.id, {
      include: [
        {
          model: Court,
          as: "court",
          attributes: ["id", "name", "description"],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "fullName", "email"],
        },
        {
          model: Payment,
          as: "payment",
          required: false,
        },
      ],
    });

    return res.json({
      message: "Reservación actualizada exitosamente",
      reservation: updated,
    });
  } catch (error: any) {
    console.error("Error updating reservation:", error);
    return res.status(500).json({ error: error?.message ?? "Error interno" });
  }
};

// ====== Cancel ======
/**
 * POST /reservations/:id/cancel
 * body: { cancellationReason? }
 */
export const cancelReservation = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { cancellationReason } = req.body;

    const reservation = await Reservation.findByPk(id);
    if (!reservation) {
      return res.status(404).json({ error: "Reservación no encontrada" });
    }

    if (reservation.status === "cancelled") {
      return res.json({
        message: "La reservación ya está cancelada",
        reservation,
      });
    }

    if (reservation.status === "completed") {
      return res
        .status(409)
        .json({ error: "No se puede cancelar una reserva completada" });
    }

    await reservation.update({
      status: "cancelled",
      cancellationReason: cancellationReason || null,
      cancelledAt: new Date(),
    });

    return res.json({
      message: "Reservación cancelada exitosamente",
      reservation,
    });
  } catch (error: any) {
    console.error("Error cancelling reservation:", error);
    return res.status(500).json({ error: error?.message ?? "Error interno" });
  }
};

// ====== Complete ======
/**
 * POST /reservations/:id/complete
 */
export const completeReservation = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const { id } = req.params;

    const reservation = await Reservation.findByPk(id);
    if (!reservation) {
      return res.status(404).json({ error: "Reservación no encontrada" });
    }

    if (reservation.status === "cancelled") {
      return res
        .status(409)
        .json({ error: "No se puede completar una reserva cancelada" });
    }

    if (reservation.status === "completed") {
      return res.json({
        message: "La reservación ya está completada",
        reservation,
      });
    }

    await reservation.update({ status: "completed" });

    return res.json({
      message: "Reservación completada exitosamente",
      reservation,
    });
  } catch (error: any) {
    console.error("Error completing reservation:", error);
    return res.status(500).json({ error: error?.message ?? "Error interno" });
  }
};

// ====== Mark No Show ======
/**
 * POST /reservations/:id/no-show
 */
export const markNoShow = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const { id } = req.params;

    const reservation = await Reservation.findByPk(id);
    if (!reservation) {
      return res.status(404).json({ error: "Reservación no encontrada" });
    }

    if (["cancelled", "completed"].includes(reservation.status)) {
      return res.status(409).json({
        error:
          "No se puede marcar como no-show una reserva cancelada o completada",
      });
    }

    await reservation.update({ status: "no_show" });

    return res.json({
      message: "Reservación marcada como no-show",
      reservation,
    });
  } catch (error: any) {
    console.error("Error marking no-show:", error);
    return res.status(500).json({ error: error?.message ?? "Error interno" });
  }
};

// ====== Delete ======
/**
 * DELETE /reservations/:id
 * Solo permitir si está pending o cancelled
 */
export const deleteReservation = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const { id } = req.params;

    const reservation = await Reservation.findByPk(id);
    if (!reservation) {
      return res.status(404).json({ error: "Reservación no encontrada" });
    }

    if (!["pending", "cancelled"].includes(reservation.status)) {
      return res.status(409).json({
        error: "Solo se pueden eliminar reservas pendientes o canceladas",
      });
    }

    await reservation.destroy();

    return res.json({
      message: "Reservación eliminada exitosamente",
      reservationId: id,
    });
  } catch (error: any) {
    console.error("Error deleting reservation:", error);
    return res.status(500).json({ error: error?.message ?? "Error interno" });
  }
};

// ====== Check Availability ======
/**
 * GET /reservations/availability/:courtId
 * query: date, startTime?, endTime?
 */
export const checkAvailability = async (req: Request, res: Response) => {
  try {
    const { courtId } = req.params;
    const { date, startTime, endTime } = req.query as {
      date: string;
      startTime?: string;
      endTime?: string;
    };

    if (!date) {
      return res.status(400).json({ error: "Fecha es requerida" });
    }

    const court = await Court.findByPk(courtId);
    if (!court) {
      return res.status(404).json({ error: "Cancha no encontrada" });
    }

    const reservationDate = new Date(date);

    // Si se especifica un rango de tiempo, verificar disponibilidad específica
    if (startTime && endTime) {
      const timeValidation = validateTimeRange(
        startTime,
        endTime,
        reservationDate
      );
      if (timeValidation.error) {
        return res.status(400).json({ error: timeValidation.error });
      }

      const overlap = await hasOverlap(
        courtId,
        reservationDate,
        startTime,
        endTime
      );

      return res.json({
        available: !overlap,
        courtId,
        date,
        startTime,
        endTime,
        duration: timeValidation.duration,
      });
    }

    // Si no se especifica tiempo, devolver todas las reservas del día
    const existingReservations = await Reservation.findAll({
      where: {
        courtId,
        reservationDate,
        status: { [Op.in]: ["pending", "confirmed"] },
      },
      order: [["startTime", "ASC"]],
      attributes: ["id", "startTime", "endTime", "status", "bookingType"],
    });

    return res.json({
      courtId,
      date,
      reservations: existingReservations,
      totalReservations: existingReservations.length,
    });
  } catch (error: any) {
    console.error("Error checking availability:", error);
    return res.status(500).json({ error: error?.message ?? "Error interno" });
  }
};

// ====== User Reservations ======
/**
 * GET /reservations/user/:userId
 * query: status?, dateFrom?, dateTo?, page?, pageSize?
 */
export const getUserReservations = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const {
      status,
      dateFrom,
      dateTo,
      page = "1",
      pageSize = "20",
    } = req.query as {
      status?: ReservationStatus;
      dateFrom?: string;
      dateTo?: string;
      page?: string;
      pageSize?: string;
    };

    const where: any = { userId };

    if (status) where.status = status;

    if (dateFrom || dateTo) {
      where.reservationDate = {};
      if (dateFrom) where.reservationDate[Op.gte] = new Date(dateFrom);
      if (dateTo) where.reservationDate[Op.lte] = new Date(dateTo);
    }

    const limit = Math.max(1, Math.min(100, Number(pageSize)));
    const offset = (Math.max(1, Number(page)) - 1) * limit;

    const { rows, count } = await Reservation.findAndCountAll({
      where,
      order: [
        ["reservationDate", "DESC"],
        ["startTime", "ASC"],
      ],
      limit,
      offset,
      include: [
        {
          model: Court,
          as: "court",
          attributes: ["id", "name", "description", "basePricePerHour"],
        },
        {
          model: Payment,
          as: "payment",
          required: false,
          attributes: ["id", "amount", "status"],
        },
      ],
    });

    return res.json({
      reservations: rows,
      pagination: {
        total: count,
        page: Number(page),
        pageSize: limit,
        totalPages: Math.ceil(count / limit),
        hasNext: Math.ceil(count / limit) > Number(page),
        hasPrev: Number(page) > 1,
      },
    });
  } catch (error: any) {
    console.error("Error getting user reservations:", error);
    return res.status(500).json({ error: error?.message ?? "Error interno" });
  }
};

// ====== Reservation Statistics ======
/**
 * GET /reservations/stats
 * query: dateFrom?, dateTo?, courtId?, userId?
 */
export const getReservationStats = async (req: Request, res: Response) => {
  try {
    const { dateFrom, dateTo, courtId, userId } = req.query as {
      dateFrom?: string;
      dateTo?: string;
      courtId?: string;
      userId?: string;
    };

    const where: any = {};

    if (courtId) where.courtId = courtId;
    if (userId) where.userId = userId;

    if (dateFrom || dateTo) {
      where.reservationDate = {};
      if (dateFrom) where.reservationDate[Op.gte] = new Date(dateFrom);
      if (dateTo) where.reservationDate[Op.lte] = new Date(dateTo);
    }

    // Contar por estado
    const statusCounts = await Reservation.findAll({
      where,
      attributes: [
        "status",
        [
          require("sequelize").fn("COUNT", require("sequelize").col("id")),
          "count",
        ],
      ],
      group: ["status"],
      raw: true,
    });

    // Contar por tipo de reserva
    const bookingTypeCounts = await Reservation.findAll({
      where,
      attributes: [
        "bookingType",
        [
          require("sequelize").fn("COUNT", require("sequelize").col("id")),
          "count",
        ],
      ],
      group: ["bookingType"],
      raw: true,
    });

    // Total de reservas y ingresos
    const totalReservations = await Reservation.count({ where });

    const totalRevenue = await Reservation.sum("totalPrice", {
      where: {
        ...where,
        status: { [Op.in]: ["confirmed", "completed"] },
      },
    });

    // Cancellation rate
    const cancelledCount = await Reservation.count({
      where: { ...where, status: "cancelled" },
    });

    const noShowCount = await Reservation.count({
      where: { ...where, status: "no_show" },
    });

    const cancellationRate =
      totalReservations > 0
        ? ((cancelledCount + noShowCount) / totalReservations) * 100
        : 0;

    return res.json({
      totalReservations,
      totalRevenue: totalRevenue || 0,
      cancellationRate: Math.round(cancellationRate * 100) / 100,
      statusBreakdown: statusCounts,
      bookingTypeBreakdown: bookingTypeCounts,
      period: {
        from: dateFrom || null,
        to: dateTo || null,
      },
    });
  } catch (error: any) {
    console.error("Error getting reservation stats:", error);
    return res.status(500).json({ error: error?.message ?? "Error interno" });
  }
};
