import type { Request, Response } from "express";
import { Op } from "sequelize";
import db from "../Config/db";
import type { ReservationStatus } from "../Models/Reservation";

const { Reservation, Court, Customer, User, Payment } = db;

// Si tu middleware de auth agrega req.user, puedes tiparlo así:
// interface AuthedRequest extends Request {
//   user?: { id: number; role?: string };
// }

/**
 * Util: valida que [start, end) sea un rango válido y (opcional) multiplo de 30 min
 */
function validateTimeRange(startsAt: Date, endsAt: Date) {
  if (
    !(startsAt instanceof Date) ||
    !(endsAt instanceof Date) ||
    isNaN(+startsAt) ||
    isNaN(+endsAt)
  ) {
    return "Formato de fecha inválido.";
  }
  if (endsAt <= startsAt)
    return "La hora de fin debe ser mayor a la de inicio.";
  // Opcional: múltiplos de 30 min
  // const diffMin = Math.floor((+endsAt - +startsAt) / 60000);
  // if (diffMin % 30 !== 0) return "El intervalo debe ser múltiplo de 30 minutos.";
  return null;
}

/**
 * Util: verifica traslape con reservas activas (pending/confirmed)
 */
async function hasOverlap(
  courtId: number,
  startsAt: Date,
  endsAt: Date,
  excludeId?: number
) {
  const where: any = {
    courtId,
    status: { [Op.in]: ["pending", "confirmed"] as ReservationStatus[] },
    [Op.and]: [
      { startsAt: { [Op.lt]: endsAt } },
      { endsAt: { [Op.gt]: startsAt } },
    ],
  };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  const clash = await Reservation.findOne({ where });
  return Boolean(clash);
}

/**
 * POST /reservations
 * body: { courtId, customerId?, startsAt, endsAt, playersCount?, priceCents, currency?, notes? }
 */
export const createReservation = async (req: Request, res: Response) => {
  try {
    const {
      courtId,
      customerId,
      startsAt: startsAtRaw,
      endsAt: endsAtRaw,
      playersCount,
      priceCents,
      currency = "MXN",
      notes,
    } = req.body;

    if (!courtId || !startsAtRaw || !endsAtRaw || priceCents == null) {
      return res.status(400).json({
        error: "courtId, startsAt, endsAt y priceCents son requeridos.",
      });
    }

    const court = await Court.findByPk(Number(courtId));
    if (!court || !court.isActive) {
      return res
        .status(404)
        .json({ error: "La cancha no existe o está inactiva." });
    }

    const startsAt = new Date(startsAtRaw);
    const endsAt = new Date(endsAtRaw);

    const badRange = validateTimeRange(startsAt, endsAt);
    if (badRange) return res.status(400).json({ error: badRange });

    // (Opcional) validar disponibilidad contra horarios/closures si los manejas

    // Evitar traslapes
    const overlap = await hasOverlap(court.id, startsAt, endsAt);
    if (overlap) {
      return res.status(409).json({
        error: "Ya existe una reservación en ese horario para esta cancha.",
      });
    }

    // Si viene customerId, validar que exista (o manejar cliente anónimo)
    let effectiveCustomerId: number | null = null;
    if (customerId) {
      const customer = await Customer.findByPk(Number(customerId));
      if (!customer)
        return res.status(404).json({ error: "Cliente no encontrado." });
      effectiveCustomerId = customer.id;
    }

    const bookedByUser = req.user?.id ?? null;

    const reservation = await Reservation.create({
      courtId: court.id,
      customerId: effectiveCustomerId,
      bookedByUser,
      status: "confirmed", // o "pending" si quieres confirmar después
      startsAt,
      endsAt,
      playersCount: playersCount ?? null,
      priceCents: Number(priceCents),
      currency,
      notes: notes ?? null,
    });

    const withIncludes = await Reservation.findByPk(reservation.id, {
      include: [Court, Customer, Payment, { model: User, as: "bookedBy" }],
    });

    return res.status(201).json(withIncludes);
  } catch (error: any) {
    return res.status(500).json({ error: error?.message ?? "Error interno" });
  }
};

/**
 * GET /reservations/:id
 */
export const getReservationById = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "id inválido" });

    const reservation = await Reservation.findByPk(id, {
      include: [Court, Customer, Payment, { model: User, as: "bookedBy" }],
    });
    if (!reservation)
      return res.status(404).json({ error: "Reservación no encontrada" });

    return res.json(reservation);
  } catch (error: any) {
    return res.status(500).json({ error: error?.message ?? "Error interno" });
  }
};

/**
 * GET /reservations  (filtros: courtId?, dateFrom?, dateTo?, status?)
 */
export const listReservations = async (req: Request, res: Response) => {
  try {
    const { courtId, dateFrom, dateTo, status } = req.query as {
      courtId?: string;
      dateFrom?: string;
      dateTo?: string;
      status?: ReservationStatus;
    };

    const where: any = {};
    if (courtId) where.courtId = Number(courtId);
    if (status) where.status = status;

    if (dateFrom || dateTo) {
      where[Op.and] = where[Op.and] ?? [];
      if (dateFrom)
        where[Op.and].push({ endsAt: { [Op.gte]: new Date(dateFrom) } });
      if (dateTo)
        where[Op.and].push({ startsAt: { [Op.lte]: new Date(dateTo) } });
    }

    const reservations = await Reservation.findAll({
      where,
      order: [["startsAt", "ASC"]],
      include: [Court, Customer, { model: User, as: "bookedBy" }],
    });

    return res.json(reservations);
  } catch (error: any) {
    return res.status(500).json({ error: error?.message ?? "Error interno" });
  }
};

/**
 * PUT /reservations/:id  (reprogramar / actualizar datos)
 * body: { startsAt?, endsAt?, playersCount?, priceCents?, currency?, notes?, status? }
 */
export const updateReservation = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "id inválido" });

    const reservation = await Reservation.findByPk(id);
    if (!reservation)
      return res.status(404).json({ error: "Reservación no encontrada" });

    // Si cambia horario, validar rango y traslapes
    const startsAt = req.body.startsAt
      ? new Date(req.body.startsAt)
      : reservation.startsAt;
    const endsAt = req.body.endsAt
      ? new Date(req.body.endsAt)
      : reservation.endsAt;

    if (req.body.startsAt || req.body.endsAt) {
      const badRange = validateTimeRange(startsAt, endsAt);
      if (badRange) return res.status(400).json({ error: badRange });

      const overlap = await hasOverlap(
        reservation.courtId,
        startsAt,
        endsAt,
        reservation.id
      );
      if (overlap) {
        return res.status(409).json({
          error: "Ya existe una reservación en ese horario para esta cancha.",
        });
      }
    }

    // No permitir mover una reserva completada/cancelada
    if (["completed", "cancelled"].includes(reservation.status)) {
      return res.status(409).json({
        error: "No se puede modificar una reserva cancelada o completada.",
      });
    }

    await reservation.update({
      startsAt,
      endsAt,
      playersCount: req.body.playersCount ?? reservation.playersCount,
      priceCents: req.body.priceCents ?? reservation.priceCents,
      currency: req.body.currency ?? reservation.currency,
      notes: req.body.notes ?? reservation.notes,
      status: (req.body.status as ReservationStatus) ?? reservation.status,
    });

    const updated = await Reservation.findByPk(reservation.id, {
      include: [Court, Customer, Payment, { model: User, as: "bookedBy" }],
    });
    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error?.message ?? "Error interno" });
  }
};

/**
 * POST /reservations/:id/cancel
 */
export const cancelReservation = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "id inválido" });

    const reservation = await Reservation.findByPk(id);
    if (!reservation)
      return res.status(404).json({ error: "Reservación no encontrada" });

    if (reservation.status === "cancelled") return res.json(reservation);
    if (reservation.status === "completed")
      return res
        .status(409)
        .json({ error: "No se puede cancelar una reserva completada." });

    await reservation.update({ status: "cancelled" });
    return res.json(reservation);
  } catch (error: any) {
    return res.status(500).json({ error: error?.message ?? "Error interno" });
  }
};

/**
 * POST /reservations/:id/complete
 */
export const completeReservation = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "id inválido" });

    const reservation = await Reservation.findByPk(id);
    if (!reservation)
      return res.status(404).json({ error: "Reservación no encontrada" });

    if (reservation.status === "cancelled")
      return res
        .status(409)
        .json({ error: "No se puede completar una reserva cancelada." });

    await reservation.update({ status: "completed" });
    return res.json(reservation);
  } catch (error: any) {
    return res.status(500).json({ error: error?.message ?? "Error interno" });
  }
};

/**
 * DELETE /reservations/:id
 * (Opcional) Solo permitir si está pending o cancelled
 */
export const deleteReservation = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "id inválido" });

    const reservation = await Reservation.findByPk(id);
    if (!reservation)
      return res.status(404).json({ error: "Reservación no encontrada" });

    if (!["pending", "cancelled"].includes(reservation.status)) {
      return res.status(409).json({
        error: "Solo se pueden borrar reservas pendientes o canceladas.",
      });
    }

    await reservation.destroy();
    return res.json({ message: "Reservación eliminada." });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message ?? "Error interno" });
  }
};
