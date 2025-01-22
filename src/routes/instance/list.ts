import { DO_API_URL, headers } from '@src/config/digitalocean';
import { authMiddleware } from '@src/middleware/authMiddleware';
import type {
  ApiResponse,
  DODroplet,
  DOSnapshot,
  SimpleDroplet,
} from '@src/types';

import axios from 'axios';
import { Router, type RequestHandler } from 'express';

const router = Router();

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

const listSnapshots: RequestHandler<{}, ApiResponse<DOSnapshot[]>> = async (
  req,
  res,
  next
): Promise<void> => {
  try {
    const response = await axios.get<{ snapshots: DOSnapshot[] }>(
      `${DO_API_URL}/snapshots?resource_type=droplet`,
      { headers }
    );
    const snapshots = response.data.snapshots.map((snapshot) => ({
      id: snapshot.id,
      name: snapshot.name,
      created_at: snapshot.created_at,
      regions: snapshot.regions,
      min_disk_size: snapshot.min_disk_size,
      size_gigabytes: snapshot.size_gigabytes,
    }));

    res.json({
      success: true,
      data: snapshots,
    });
  } catch (error: unknown) {
    next(error);
  }
};

router.get('/snapshots', authMiddleware, listSnapshots);

export default router;
