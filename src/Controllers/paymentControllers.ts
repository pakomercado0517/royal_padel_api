import type { Request, Response } from "express";
import { Op, Transaction } from "sequelize";
import db from "../Config/db";
import type { PaymentMethod, PaymentStatus } from "../Models/Payment";

const { Payment, Reservation, conn } = db;

// ========= Helpers =========
function assertInt(n: any) {
  return Number.isInteger(n) ? n : Number(n);
}

const includeBasics = [
  {
    model: Reservation,
    attributes: [
      "id",
      "courtId",
      "customerId",
      "status",
      "startsAt",
      "endsAt",
      "priceCents",
      "currency",
    ],
  },
];

// ========= Create =========
/**
 * POST /payments
 * body: { reservationId:number, method:PaymentMethod, amountCents:number, currency?:string, externalRef?:string, markPaid?:boolean }
 */
export const createPayment = async (req: Request, res: Response) => {
  const t = await conn.transaction();
  try {
    const {
      reservationId,
      method,
      amountCents,
      currency = "MXN",
      externalRef,
      markPaid = false,
    } = req.body as {
      reservationId: number;
      method: PaymentMethod;
      amountCents: number;
      currency?: string;
      externalRef?: string;
      markPaid?: boolean;
    };

    if (!reservationId || !method || amountCents == null) {
      await t.rollback();
      return res
        .status(400)
        .json({ error: "reservationId, method y amountCents son requeridos." });
    }

    const amount = assertInt(amountCents);
    if (!Number.isFinite(amount) || amount <= 0) {
      await t.rollback();
      return res
        .status(400)
        .json({ error: "amountCents debe ser un entero positivo." });
    }

    const reservation = await Reservation.findByPk(Number(reservationId), {
      transaction: t,
    });
    if (!reservation) {
      await t.rollback();
      return res.status(404).json({ error: "Reservación no encontrada." });
    }
    // Opcional: permitir pagos solo en pending/confirmed
    if (!["pending", "confirmed"].includes(reservation.status)) {
      await t.rollback();
      return res.status(409).json({
        error:
          "Solo se pueden registrar pagos para reservas pendientes o confirmadas.",
      });
    }

    const payment = await Payment.create(
      {
        reservationId: reservation.id,
        method,
        status: markPaid ? "paid" : "pending",
        amountCents: amount,
        currency,
        externalRef: externalRef ?? null,
        paidAt: markPaid ? new Date() : null,
      },
      { transaction: t }
    );

    // Si marcamos pagado y la reserva estaba pending, súbela a confirmed
    if (markPaid && reservation.status === "pending") {
      await reservation.update({ status: "confirmed" }, { transaction: t });
    }

    await t.commit();

    const withInclude = await Payment.findByPk(payment.id, {
      include: includeBasics,
    });
    return res.status(201).json(withInclude);
  } catch (err: any) {
    await (t as Transaction).rollback();
    return res.status(500).json({ error: err?.message ?? "Error interno" });
  }
};

// ========= Get by ID =========
/**
 * GET /payments/:id
 */
export const getPaymentById = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "id inválido" });

    const payment = await Payment.findByPk(id, { include: includeBasics });
    if (!payment) return res.status(404).json({ error: "Pago no encontrado" });

    return res.json(payment);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Error interno" });
  }
};

// ========= List (filters) =========
/**
 * GET /payments
 * query: reservationId?, status?, method?, paidFrom?, paidTo?, page?, pageSize?
 */
export const listPayments = async (req: Request, res: Response) => {
  try {
    const {
      reservationId,
      status,
      method,
      paidFrom,
      paidTo,
      page = "1",
      pageSize = "20",
    } = req.query as {
      reservationId?: string;
      status?: PaymentStatus;
      method?: PaymentMethod;
      paidFrom?: string;
      paidTo?: string;
      page?: string;
      pageSize?: string;
    };

    const where: any = {};
    if (reservationId) where.reservationId = Number(reservationId);
    if (status) where.status = status;
    if (method) where.method = method;

    if (paidFrom || paidTo) {
      where.paidAt = {};
      if (paidFrom) where.paidAt[Op.gte] = new Date(paidFrom);
      if (paidTo) where.paidAt[Op.lte] = new Date(paidTo);
    }

    const limit = Math.max(1, Math.min(100, Number(pageSize)));
    const offset = (Math.max(1, Number(page)) - 1) * limit;

    const { rows, count } = await Payment.findAndCountAll({
      where,
      include: includeBasics,
      order: [
        ["paidAt", "DESC"],
        ["createdAt", "DESC"],
      ],
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

// ========= Mark as Paid =========
/**
 * POST /payments/:id/mark-paid
 * body: { externalRef? }
 */
export const markPaymentAsPaid = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  const t = await conn.transaction();
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      await t.rollback();
      return res.status(400).json({ error: "id inválido" });
    }

    const payment = await Payment.findByPk(id, { transaction: t });
    if (!payment) {
      await t.rollback();
      return res.status(404).json({ error: "Pago no encontrado" });
    }
    if (payment.status === "paid") {
      await t.rollback();
      return res.status(200).json(payment); // idempotente
    }
    if (payment.status === "refunded") {
      await t.rollback();
      return res
        .status(409)
        .json({ error: "No se puede marcar como pagado un pago reembolsado." });
    }

    const reservation = await Reservation.findByPk(payment.reservationId, {
      transaction: t,
    });
    if (!reservation) {
      await t.rollback();
      return res
        .status(404)
        .json({ error: "Reservación asociada no encontrada." });
    }

    await payment.update(
      {
        status: "paid",
        paidAt: new Date(),
        externalRef: req.body?.externalRef ?? payment.externalRef,
      },
      { transaction: t }
    );

    if (reservation.status === "pending") {
      await reservation.update({ status: "confirmed" }, { transaction: t });
    }

    await t.commit();

    const withInclude = await Payment.findByPk(payment.id, {
      include: includeBasics,
    });
    return res.json(withInclude);
  } catch (err: any) {
    await (t as Transaction).rollback();
    return res.status(500).json({ error: err?.message ?? "Error interno" });
  }
};

// ========= Refund =========
/**
 * POST /payments/:id/refund
 * (marca el pago como refunded; si manejas montos parciales, necesitarías otro modelo/columna)
 */
export const refundPayment = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  const t = await conn.transaction();
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      await t.rollback();
      return res.status(400).json({ error: "id inválido" });
    }

    const payment = await Payment.findByPk(id, { transaction: t });
    if (!payment) {
      await t.rollback();
      return res.status(404).json({ error: "Pago no encontrado" });
    }
    if (payment.status !== "paid") {
      await t.rollback();
      return res
        .status(409)
        .json({ error: "Solo se pueden reembolsar pagos en estado 'paid'." });
    }

    await payment.update({ status: "refunded" }, { transaction: t });
    await t.commit();

    const withInclude = await Payment.findByPk(payment.id, {
      include: includeBasics,
    });
    return res.json(withInclude);
  } catch (err: any) {
    await (t as Transaction).rollback();
    return res.status(500).json({ error: err?.message ?? "Error interno" });
  }
};

// ========= Delete =========
/**
 * DELETE /payments/:id
 * Solo permitido si está en 'pending' o 'failed'
 */
export const deletePayment = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "id inválido" });

    const payment = await Payment.findByPk(id);
    if (!payment) return res.status(404).json({ error: "Pago no encontrado" });

    if (!["pending", "failed"].includes(payment.status)) {
      return res
        .status(409)
        .json({ error: "Solo se pueden eliminar pagos 'pending' o 'failed'." });
    }

    await payment.destroy();
    return res.json({ message: "Pago eliminado" });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Error interno" });
  }
};
