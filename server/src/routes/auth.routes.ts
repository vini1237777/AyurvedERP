import { Router } from "express";
import * as auth from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";
import { loginRateLimit } from "../middleware/rateLimit";

const r = Router();

r.post("/login", loginRateLimit, auth.login);
r.post("/refresh", auth.refresh);
r.post("/logout", auth.logout);
r.get("/me", requireAuth, auth.me);

export default r;
