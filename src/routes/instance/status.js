import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { stateManager } from "../../services/instanceStateManager.js";

const router = express.Router();

router.get("/status/:numberphone", authMiddleware, async (req, res) => {
  const { numberphone } = req.params;

  try {
    const instance = await stateManager.getInstance(numberphone);

    if (!instance) {
      return res.status(404).json({ error: "Instancia no encontrada" });
    }

    return res.json(instance);
  } catch (error) {
    console.error("Error al obtener estado:", error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
