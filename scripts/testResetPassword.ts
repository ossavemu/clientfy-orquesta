import axios from 'axios';
import '../src/config/env';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const API_KEY = process.env.SECRET_KEY;

async function testResetPassword() {
  try {
    console.log('🔄 Probando restablecimiento de contraseña...');

    const response = await axios.post(
      `${API_URL}/api/password/reset`,
      {
        email: 'test@example.com',
        servicePassword: 'password123',
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
  }
}

testResetPassword();
