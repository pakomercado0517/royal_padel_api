import type { Request, Response } from "express";
import { Op } from "sequelize";
import db from "../Config/db";

const { Customer, User, Reservation } = db;

// ====== Helpers ======
const includeBasics = [
  {
    model: User,
    attributes: ["id", "fullName", "email", "phone", "role", "isActive"],
    required: true,
  },
];

// ====== Create ======
/**
 * POST /customers
 * body: { userId:number, notes?:string }
 */
export const createCustomer = async (req: Request, res: Response) => {
  try {
    const { userId, notes } = req.body as { userId: number; notes?: string };

    if (!userId) return res.status(400).json({ error: "userId es requerido." });

    const user = await User.findByPk(Number(userId));
    if (!user) return res.status(404).json({ error: "User no encontrado." });

    const exists = await Customer.findOne({ where: { userId: user.id } });
    if (exists)
      return res
        .status(409)
        .json({ error: "Ese usuario ya tiene un perfil de cliente." });

    const customer = await Customer.create({
      userId: user.id,
      notes: notes ?? null,
    });
    const withInclude = await Customer.findByPk(customer.id, {
      include: includeBasics,
    });
    return res.status(201).json(withInclude);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Error interno" });
  }
};

// ====== Read one ======
export const getCustomerById = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "id inválido" });

    const customer = await Customer.findByPk(id, {
      include: [
        ...includeBasics,
        { model: Reservation, order: [["startsAt", "DESC"]], limit: 20 },
      ],
    });
    if (!customer)
      return res.status(404).json({ error: "Cliente no encontrado" });

    return res.json(customer);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Error interno" });
  }
};

// ====== List (busca por campos del User) ======
export const listCustomers = async (req: Request, res: Response) => {
  try {
    const {
      q,
      page = "1",
      pageSize = "20",
    } = req.query as { q?: string; page?: string; pageSize?: string };

    const where: any = {};
    const include = [...includeBasics];

    if (q?.trim()) {
      const like = `%${q.trim()}%`;
      where[Op.or] = [
        { "$user.fullName$": { [Op.iLike]: like } },
        { "$user.email$": { [Op.iLike]: like } },
        { "$user.phone$": { [Op.iLike]: like } },
      ];
      include[0] = { ...(include[0] as any), required: true } as any;
    }

    const limit = Math.max(1, Math.min(100, Number(pageSize)));
    const offset = (Math.max(1, Number(page)) - 1) * limit;

    const { rows, count } = await Customer.findAndCountAll({
      where,
      include,
      order: [[{ model: User, as: "user" }, "fullName", "ASC"]],
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
export const updateCustomer = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "id inválido" });

    const customer = await Customer.findByPk(id);
    if (!customer)
      return res.status(404).json({ error: "Cliente no encontrado" });

    if (req.body.userId !== undefined) {
      const newUserId = Number(req.body.userId);
      const user = await User.findByPk(newUserId);
      if (!user)
        return res
          .status(404)
          .json({ error: "User no encontrado para vincular." });

      const taken = await Customer.findOne({ where: { userId: newUserId } });
      if (taken && taken.id !== customer.id) {
        return res
          .status(409)
          .json({ error: "Ese usuario ya tiene un perfil de cliente." });
      }
      customer.userId = newUserId as any;
    }

    customer.notes = req.body.notes ?? customer.notes;
    await customer.save();

    const updated = await Customer.findByPk(customer.id, {
      include: includeBasics,
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Error interno" });
  }
};

// ====== Delete ======
export const deleteCustomer = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "id inválido" });

    const customer = await Customer.findByPk(id);
    if (!customer)
      return res.status(404).json({ error: "Cliente no encontrado" });

    const activeRes = await Reservation.count({
      where: { customerId: id, status: { [Op.in]: ["pending", "confirmed"] } },
    });
    if (activeRes > 0) {
      return res
        .status(409)
        .json({
          error:
            "No se puede eliminar: el cliente tiene reservaciones activas.",
        });
    }

    await customer.destroy();
    return res.json({ message: "Cliente eliminado" });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Error interno" });
  }
};

// ====== Extra: listar reservas de un cliente ======
export const listCustomerReservations = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "id inválido" });

    const customer = await Customer.findByPk(id);
    if (!customer)
      return res.status(404).json({ error: "Cliente no encontrado" });

    const reservations = await Reservation.findAll({
      where: { customerId: id },
      order: [["startsAt", "DESC"]],
      include: [
        {
          model: User,
          as: "bookedBy",
          attributes: ["id", "fullName", "email"],
        },
      ],
    });

    return res.json(reservations);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Error interno" });
  }
};

// ====== Extra: vincular/desvincular user ======
export const linkUser = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { userId } = req.body as { userId: number };
    if (Number.isNaN(id) || !userId)
      return res.status(400).json({ error: "Parámetros inválidos" });

    const [customer, user] = await Promise.all([
      Customer.findByPk(id),
      User.findByPk(Number(userId)),
    ]);
    if (!customer)
      return res.status(404).json({ error: "Cliente no encontrado" });
    if (!user) return res.status(404).json({ error: "User no encontrado" });

    const taken = await Customer.findOne({ where: { userId: user.id } });
    if (taken && taken.id !== customer.id) {
      return res
        .status(409)
        .json({ error: "Ese usuario ya tiene un perfil de cliente." });
    }

    await customer.update({ userId: user.id });
    const updated = await Customer.findByPk(customer.id, {
      include: includeBasics,
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Error interno" });
  }
};

export const unlinkUser = async (
  _req: Request<{ id: string }>,
  res: Response
) => {
  try {
    return res
      .status(409)
      .json({
        error:
          "No es posible desvincular: cada Customer debe tener un User asociado.",
      });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Error interno" });
  }
};
