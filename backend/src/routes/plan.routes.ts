import { Router } from "express";
import { planController } from "../controllers/plan.controller";

const router = Router();

router.post("/generate", (req, res) => planController.generate(req, res));
router.post("/optimize", (req, res) => planController.optimize(req, res));
router.get("/", (req, res) => planController.get(req, res));

export default router;
