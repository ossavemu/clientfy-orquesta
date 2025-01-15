import axios from "axios";
import express from "express";
import { DO_API_URL, headers } from "../../config/digitalocean.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Obtener todas las instancias (droplets)
router.get("/list", authMiddleware, async (req, res) => {
  try {
    const response = await axios.get(`${DO_API_URL}/droplets`, { headers });
    const droplets = response.data.droplets.map((droplet) => ({
      id: droplet.id,
      name: droplet.name,
      status: droplet.status,
      created: droplet.created_at,
      ip: droplet.networks.v4.find((net) => net.type === "public")?.ip_address,
      memory: droplet.memory,
      disk: droplet.disk,
      region: droplet.region.name,
    }));

    return res.json({
      success: true,
      droplets,
    });
  } catch (error) {
    console.error("Error al obtener lista de droplets:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Obtener todas las imágenes
router.get("/images", authMiddleware, async (req, res) => {
  try {
    const response = await axios.get(`${DO_API_URL}/images`, { headers });
    const images = response.data.images.map((image) => ({
      id: image.id,
      name: image.name,
      distribution: image.distribution,
      created: image.created_at,
      size_gigabytes: image.size_gigabytes,
      description: image.description,
      status: image.status,
    }));

    return res.json({
      success: true,
      images,
    });
  } catch (error) {
    console.error("Error al obtener lista de imágenes:", error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
