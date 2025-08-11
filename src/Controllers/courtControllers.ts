import type { Request, Response } from "express";
import { Op } from "sequelize";
import db from "../Config/db";

const { Court, Reservation } = db;

// ====== Helpers ======

// Incluye últimas 10 reservaciones (opcional, ajusta a tu gusto)
const includeBasics = [
  {
    model: Reservation,
    as: "reservations",
    separate: true, // devuelve en arreglo separado (no hace JOIN gigante)
    limit: 10,
    order: [["startsAt", "DESC"]],
  },
];

// ====== Create ======
/**
 * POST /courts
 * body: { name, surface?, isActive? }
 */
export const createCourt = async (req: Request, res: Response) => {
  try {
    const { name, surface, isActive = true } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: "name es requerido." });
    }

    // (Opcional) Unicidad por nombre
    const exists = await Court.findOne({ where: { name } });
    if (exists)
      return res
        .status(409)
        .json({ error: "Ya existe una cancha con ese nombre." });

    const court = await Court.create({
      name: name.trim(),
      surface: surface ?? null,
      isActive: Boolean(isActive),
    });

    return res.status(201).json(court);
  } catch (err: any) {
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
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "id inválido" });

    const court = await Court.findByPk(id, { include: includeBasics as any });
    if (!court) return res.status(404).json({ error: "Cancha no encontrada" });

    // Estadísticas rápidas (opcional): próximas reservas activas
    const now = new Date();
    const upcomingCount = await Reservation.count({
      where: {
        courtId: id,
        status: { [Op.in]: ["pending", "confirmed"] },
        startsAt: { [Op.gte]: now },
      },
    });

    return res.json({ ...court.toJSON(), upcomingCount });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Error interno" });
  }
};

// ====== List ======
/**
 * GET /courts
 * query: q? (filtra por nombre/superficie), isActive? (true/false), page?, pageSize?
 */
export const listCourts = async (req: Request, res: Response) => {
  try {
    const {
      q,
      isActive,
      page = "1",
      pageSize = "20",
    } = req.query as {
      q?: string;
      isActive?: "true" | "false";
      page?: string;
      pageSize?: string;
    };

    const where: any = {};
    if (typeof isActive === "string") where.isActive = isActive === "true";

    if (q?.trim()) {
      const like = `%${q.trim()}%`;
      where[Op.or] = [
        { name: { [Op.iLike]: like } },
        { surface: { [Op.iLike]: like } },
      ];
    }

    const limit = Math.max(1, Math.min(100, Number(pageSize)));
    const offset = (Math.max(1, Number(page)) - 1) * limit;

    const { rows, count } = await Court.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    return res.json({
      items: rows,
      total: count,
      page: Number(page),
      pageSize: limit,
      totalPages: Math.ceil(count / limit),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Error interno" });
  }
};

// ====== Update ======
/**
 * PUT /courts/:id
 * body: { name?, surface?, isActive? }
 */
export const updateCourt = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "id inválido" });

    const court = await Court.findByPk(id);
    if (!court) return res.status(404).json({ error: "Cancha no encontrada" });

    // (Opcional) validar unicidad de name si cambia
    if (req.body.name && req.body.name !== court.name) {
      const exists = await Court.findOne({ where: { name: req.body.name } });
      if (exists && exists.id !== court.id) {
        return res
          .status(409)
          .json({ error: "Ya existe otra cancha con ese nombre." });
      }
    }

    await court.update({
      name: req.body.name ?? court.name,
      surface: req.body.surface ?? court.surface,
      isActive:
        typeof req.body.isActive === "boolean"
          ? req.body.isActive
          : court.isActive,
    });

    return res.json(court);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Error interno" });
  }
};

// ====== Toggle Active ======
/**
 * POST /courts/:id/toggle
 */
export const toggleCourt = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "id inválido" });

    const court = await Court.findByPk(id);
    if (!court) return res.status(404).json({ error: "Cancha no encontrada" });

    court.isActive = !court.isActive;
    await court.save();

    return res.json(court);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Error interno" });
  }
};

// ====== Delete ======
/**
 * DELETE /courts/:id
 * Evita borrar si tiene reservas activas (pending/confirmed)
 */
export const deleteCourt = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "id inválido" });

    const court = await Court.findByPk(id);
    if (!court) return res.status(404).json({ error: "Cancha no encontrada" });

    const activeReservations = await Reservation.count({
      where: {
        courtId: id,
        status: { [Op.in]: ["pending", "confirmed"] },
      },
    });
    if (activeReservations > 0) {
      return res.status(409).json({
        error: "No se puede eliminar: la cancha tiene reservaciones activas.",
      });
    }

    await court.destroy();
    return res.json({ message: "Cancha eliminada" });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Error interno" });
  }
};
