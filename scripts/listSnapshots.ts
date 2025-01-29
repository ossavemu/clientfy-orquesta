import axios from 'axios';
import { DO_API_URL, headers } from '../src/config/digitalocean';
import type { DOSnapshot } from '../src/types';

async function listSnapshots() {
  try {
    console.log('Obteniendo lista de snapshots...');

    const response = await axios.get<{ snapshots: DOSnapshot[] }>(
      `${DO_API_URL}/snapshots?resource_type=droplet`,
      { headers }
    );

    const snapshots = response.data.snapshots;

    console.log('\nSnapshots encontradas:');
    console.log('====================');

    snapshots.forEach((snapshot) => {
      console.log(`\nID: ${snapshot.id}`);
      console.log(`Nombre: ${snapshot.name}`);
      console.log(`Creada: ${new Date(snapshot.created_at).toLocaleString()}`);
      console.log(`Regiones: ${snapshot.regions.join(', ')}`);
      console.log(`Tamaño mínimo del disco: ${snapshot.min_disk_size} GB`);
      console.log(`Tamaño: ${snapshot.size_gigabytes} GB`);
      console.log('--------------------');
    });

    console.log(`\nTotal de snapshots: ${snapshots.length}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error al obtener snapshots:', error.message);
    } else {
      console.error('Error desconocido al obtener snapshots');
    }
    process.exit(1);
  }
}

// Ejecutar la función
listSnapshots();
