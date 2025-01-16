import axios from 'axios';
import type { RequestHandler } from 'express';
import express from 'express';
import { DO_API_URL, headers } from '../../config/digitalocean';
import { authMiddleware } from '../../middleware/authMiddleware';
import type { ApiResponse, DODroplet, DOImage, SimpleDroplet } from '../../types';

const router = express.Router();

// Obtener todas las instancias (droplets)
const listDroplets: RequestHandler<{}, ApiResponse<SimpleDroplet[]>> = async (
  req,
  res,
  next
): Promise<void> => {
  try {
    const response = await axios.get<{ droplets: DODroplet[] }>(
      `${DO_API_URL}/droplets`,
      { headers }
    );
    const droplets = response.data.droplets.map((droplet) => ({
      id: droplet.id,
      name: droplet.name,
      status: droplet.status,
      created: droplet.created_at,
      ip: droplet.networks.v4.find((net) => net.type === 'public')?.ip_address,
      memory: droplet.memory,
      disk: droplet.disk,
      region: droplet.region.name,
    }));

    res.json({
      success: true,
      data: droplets,
    });
  } catch (error: unknown) {
    next(error);
  }
};

router.get('/list', authMiddleware, listDroplets);

const listImages: RequestHandler<{}, ApiResponse<DOImage[]>> = async (
  req,
  res,
  next
): Promise<void> => {
  try {
    const response = await axios.get<{ images: DOImage[] }>(
      `${DO_API_URL}/images`,
      { headers }
    );
    const images = response.data.images.map((image) => ({
      id: image.id,
      name: image.name,
      distribution: image.distribution,
      created_at: image.created_at,
      size_gigabytes: image.size_gigabytes,
      description: image.description,
      status: image.status,
    }));

    res.json({
      success: true,
      data: images,
    });
  } catch (error: unknown) {
    next(error);
  }
};

router.get('/images', authMiddleware, listImages);

export default router;
