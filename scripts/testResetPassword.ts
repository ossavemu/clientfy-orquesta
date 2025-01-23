import axios from 'axios';
import '../src/config/env';
import { redisService } from '../src/services/redis/redisService';

const API_URL = process.env.API_URL || 'http://localhost:3001';
const API_KEY = process.env.SECRET_KEY;

async function testResetPassword() {
  try {
    console.log('🔄 Conectando a Redis...');
    await redisService.connect();

    const email = 'osanvem@gmail.com';
    const redisKey = `password:${email}`;
    console.log('🔍 Verificando datos en Redis para:', redisKey);
    const passwordInfo = await redisService.get(redisKey);
    console.log('📝 Datos encontrados:', passwordInfo);

    console.log('🔄 Probando restablecimiento de contraseña...');
    const response = await axios.post(
      `${API_URL}/api/password/reset`,
      {
        email,
        servicePassword: '2rza69YRdA',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
      }
    );

    console.log('✅ Respuesta exitosa:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ Error:', error.response?.data || error.message);
    } else {
      console.error('❌ Error inesperado:', error);
    }
  } finally {
    await redisService.disconnect();
  }
}

testResetPassword();
