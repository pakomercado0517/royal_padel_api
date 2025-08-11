import { Router } from "express";
import * as ctrl from "../Controllers/courtControllers";

const router = Router();

router.post("/", ctrl.createCourt);
router.get("/", ctrl.listCourts);
router.get("/:id", ctrl.getCourtById);
router.put("/:id", ctrl.updateCourt);
router.post("/:id/toggle", ctrl.toggleCourt);
router.delete("/:id", ctrl.deleteCourt);

export default router;
