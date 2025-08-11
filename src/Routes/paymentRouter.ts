import { Router } from "express";
import * as ctrl from "../Controllers/paymentControllers";

const router = Router();

router.post("/", ctrl.createPayment);
router.get("/", ctrl.listPayments);
router.get("/:id", ctrl.getPaymentById);
router.post("/:id/mark-paid", ctrl.markPaymentAsPaid);
router.post("/:id/refund", ctrl.refundPayment);
router.delete("/:id", ctrl.deletePayment);

export default router;
