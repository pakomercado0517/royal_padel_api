import type { Request, Response } from "express";
import { Op } from "sequelize";
import db from "../Config/db";

const { Customer, User, Reservation } = db;

// ====== Helpers ======
const includeBasics = [
  {
    model: User,
    attributes: ["id", "fullName", "email", "phone", "role", "isActive"],
  },
];

// ====== Create ======
/**
 * POST /customers
 * body: { fullName, email?, phone?, notes?, userId? }
 */
export const createCustomer = async (req: Request, res: Response) => {
  try {
    const { fullName, email, phone, notes, userId } = req.body;

    if (!fullName?.trim()) {
      return res.status(400).json({ error: "fullName es requerido." });
    }

    let linkUserId: number | null = null;
    if (userId != null) {
      const user = await User.findByPk(Number(userId));
      if (!user) return res.status(404).json({ error: "User no encontrado." });
      linkUserId = user.id;
    }

    // (Opcional) Unicidad por email si así lo decides
    if (email) {
      const exists = await Customer.findOne({ where: { email } });
      if (exists)
        return res
          .status(409)
          .json({ error: "Ese email ya está registrado en clientes." });
    }

    const customer = await Customer.create({
      fullName,
      email: email ?? null,
      phone: phone ?? null,
      notes: notes ?? null,
      userId: linkUserId,
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
/**
 * GET /customers/:id
 */
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
        { model: Reservation, order: [["startsAt", "DESC"]], limit: 20 }, // últimas 20 reservas
      ],
    });
    if (!customer)
      return res.status(404).json({ error: "Cliente no encontrado" });

    return res.json(customer);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Error interno" });
  }
};

// ====== List (con filtros, búsqueda y paginación) ======
/**
 * GET /customers
 * query: q? (busca en fullName/email/phone), page?, pageSize?
 */
export const listCustomers = async (req: Request, res: Response) => {
  try {
    const {
      q,
      page = "1",
      pageSize = "20",
    } = req.query as {
      q?: string;
      page?: string;
      pageSize?: string;
    };

    const where: any = {};
    if (q?.trim()) {
      const like = `%${q.trim()}%`;
      where[Op.or] = [
        { fullName: { [Op.iLike]: like } },
        { email: { [Op.iLike]: like } },
        { phone: { [Op.iLike]: like } },
      ];
    }

    const limit = Math.max(1, Math.min(100, Number(pageSize)));
    const offset = (Math.max(1, Number(page)) - 1) * limit;

    const { rows, count } = await Customer.findAndCountAll({
      where,
      include: includeBasics,
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
 * PUT /customers/:id
 * body: { fullName?, email?, phone?, notes?, userId? }
 */
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

    // Validar nuevo userId (si viene)
    if (req.body.userId !== undefined) {
      if (req.body.userId === null) {
        // desvincular
        customer.userId = null as any;
      } else {
        const user = await User.findByPk(Number(req.body.userId));
        if (!user)
          return res
            .status(404)
            .json({ error: "User no encontrado para vincular." });
        customer.userId = user.id as any;
      }
    }

    // Validar unicidad de email
    if (req.body.email) {
      const exists = await Customer.findOne({
        where: { email: req.body.email },
      });
      if (exists && exists.id !== customer.id) {
        return res
          .status(409)
          .json({ error: "Ese email ya está usado por otro cliente." });
      }
    }

    await customer.update({
      fullName: req.body.fullName ?? customer.fullName,
      email: req.body.email ?? customer.email,
      phone: req.body.phone ?? customer.phone,
      notes: req.body.notes ?? customer.notes,
      userId: customer.userId ?? null,
    });

    const updated = await Customer.findByPk(customer.id, {
      include: includeBasics,
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Error interno" });
  }
};

// ====== Delete ======
/**
 * DELETE /customers/:id
 * (opcional) impide borrar si tiene reservas activas
 */
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

    // Checar reservas activas (pending/confirmed)
    const activeRes = await Reservation.count({
      where: {
        customerId: id,
        status: { [Op.in]: ["pending", "confirmed"] },
      },
    });
    if (activeRes > 0) {
      return res.status(409).json({
        error: "No se puede eliminar: el cliente tiene reservaciones activas.",
      });
    }

    await customer.destroy();
    return res.json({ message: "Cliente eliminado" });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Error interno" });
  }
};

// ====== Extra: listar reservas de un cliente ======
/**
 * GET /customers/:id/reservations
 */
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

// ====== Extra: vincular/desvincular user explícito ======
/**
 * POST /customers/:id/link-user   body: { userId }
 * POST /customers/:id/unlink-user
 */
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
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "id inválido" });

    const customer = await Customer.findByPk(id);
    if (!customer)
      return res.status(404).json({ error: "Cliente no encontrado" });

    await customer.update({ userId: null });
    const updated = await Customer.findByPk(customer.id, {
      include: includeBasics,
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Error interno" });
  }
};
