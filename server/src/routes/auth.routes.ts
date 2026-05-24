import { Router } from "express";
import * as auth from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";

const r = Router();

r.post("/login", auth.login);
r.get("/me", requireAuth, auth.me);

export default r;
