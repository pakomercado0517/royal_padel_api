import { Router } from "express";
import * as ctrl from "../Controllers/customerControllers";

const router = Router();

router.post("/", ctrl.createCustomer);
router.get("/", ctrl.listCustomers);
router.get("/:id", ctrl.getCustomerById);
router.put("/:id", ctrl.updateCustomer);
router.delete("/:id", ctrl.deleteCustomer);

// extras
router.get("/:id/reservations", ctrl.listCustomerReservations);
router.post("/:id/link-user", ctrl.linkUser);
router.post("/:id/unlink-user", ctrl.unlinkUser);

export default router;
