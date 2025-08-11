// src/Routes/reservation.ts
import { Router } from "express";
import * as ctrl from "../Controllers/reservationControllers";

const router = Router();
router.post("/", ctrl.createReservation);
router.get("/", ctrl.listReservations);
router.get("/:id", ctrl.getReservationById);
router.put("/:id", ctrl.updateReservation);
router.post("/:id/cancel", ctrl.cancelReservation);
router.post("/:id/complete", ctrl.completeReservation);
router.delete("/:id", ctrl.deleteReservation);

export default router;
