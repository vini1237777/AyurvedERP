import { createHmac } from "node:crypto";
import { Router } from "express";
import { isbot } from "isbot";
import prisma from "../utils/prisma";

const router = Router();

router.post("/", async (req, res) => {
  const secret =
    process.env.VISIT_HASH_SECRET ||
    process.env.JWT_ACCESS_SECRET ||
    process.env.JWT_SECRET;
  if (!secret) return res.status(503).json({ message: "Unavailable" });

  try {
    const ip = req.ip;

    const userAgent = req.get("user-agent");
    if (ip && userAgent && !isbot(userAgent)) {
      await prisma.siteVisitor.createMany({
        data: [{ id: createHmac("sha256", secret).update(ip).digest("hex") }],
        skipDuplicates: true,
      });
    }

    return res.json({ visitors: await prisma.siteVisitor.count() });
  } catch {
    return res.status(503).json({ message: "Unavailable" });
  }
});

export default router;
