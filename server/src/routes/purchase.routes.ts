import { Router } from "express";
import * as pc from "../controllers/purchase.controller";

const router = Router();
router.get("/", pc.getAll);
router.get("/next-no", pc.getNextNo);
router.get("/:id", pc.getById);
router.post("/", pc.create);
router.patch("/:id/cancel", pc.cancel);
router.get("/:id/returns", pc.getAllReturns);
router.post("/:id/returns", pc.createReturn);
export default router;
