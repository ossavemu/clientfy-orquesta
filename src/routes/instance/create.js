import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { getExistingDroplet } from "../../services/droplet/getExistingDroplet.js";
import { processInstance } from "../../services/instance/processInstance.js";
import { stateManager } from "../../services/instanceStateManager.js";

const router = express.Router();

router.post("/create", authMiddleware, async (req, res) => {
  const { numberphone, provider = "baileys" } = req.body;

  if (!numberphone) {
    return res.status(400).json({ error: "numberphone es requerido" });
  }

  try {
    const existingDroplet = await getExistingDroplet(numberphone);

    if (existingDroplet) {
      stateManager.updateInstance(numberphone, {
        status: "existing_in_digitalocean",
        instanceInfo: existingDroplet,
      });

      return res.status(400).json({
        error: "Ya existe una instancia en DigitalOcean para este número",
      });
    }

    stateManager.createInstance(numberphone);

    processInstance(numberphone, provider).catch((error) => {
      console.error("Error en el proceso:", error);
      stateManager.updateInstance(numberphone, {
        status: "error",
        error: error.message,
      });
    });

    return res.json({
      success: true,
      numberphone,
      status: "creating",
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

export default router;
