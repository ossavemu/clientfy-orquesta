API DE GESTIÓN DE INSTANCIAS CLIENTFY-ORQUESTA

ÍNDICE
1. Configuración del Entorno de Desarrollo
2. Autenticación
3. APIs Disponibles
4. Ejemplos de Uso
5. Notas Importantes

CONFIGURACIÓN DEL ENTORNO DE DESARROLLO
=====================================

Requisitos Previos:
- Node.js (v16 o superior)
- Redis
- npm o yarn

Pasos para Desarrollo Local:
1. Clonar el repositorio

2. Instalar dependencias:
   npm install

3. Configurar variables de entorno:
   Crear un archivo .env con:
   
   PORT=3000
   DIGITALOCEAN_TOKEN=tu_token
   DIGITALOCEAN_SSH_PASSWORD=tu_password
   REDIS_HOST=localhost
   REDIS_PORT=6379
   API_KEY=tu_clave_api_para_desarrollo

4. Iniciar Redis:
   ./scripts/setup-redis.sh

5. Iniciar el servidor en modo desarrollo:
   npm run dev

AUTENTICACIÓN
============
Todas las peticiones deben incluir el header 'x-api-key' con la clave de API correspondiente.

APIs DISPONIBLES
==============

1. GESTIÓN DE INSTANCIAS
-----------------------

1.1 CREAR INSTANCIA
Endpoint: POST /api/instance/create
Headers:
  x-api-key: TU_CLAVE_API
  Content-Type: application/json
Body: 
{
    "numberphone": "573332221111",
    "provider": "baileys",           // opcional, por defecto "baileys"
    "enableAppointments": false,     // opcional, por defecto false
    "enableAutoInvite": false        // opcional, por defecto false
}

Respuesta Exitosa:
{
    "success": true,
    "data": {
        "numberphone": "573332221111",
        "status": "creating"
    }
}

Respuesta Error (Instancia Existente):
{
    "success": false,
    "error": "Ya existe una instancia en DigitalOcean para este número"
}

Estados posibles de la instancia:
- creating_droplet (25%)
- waiting_for_ssh (50%)
- initializing (75%) 
- completed (100%)
- failed

1.2 VERIFICAR ESTADO
Endpoint: GET /api/instance/status/{numberphone}
Headers:
  x-api-key: TU_CLAVE_API

Respuesta:
{
    "status": "creating_droplet",
    "progress": 25,
    "error": null,
    "instanceInfo": {
        "instanceName": "bot-573332221111",
        "ip": "123.456.789.0",
        "state": "active",
        "created": "2024-03-20T15:30:00Z",
        "numberphone": "573332221111",
        "dropletId": 123456
    }
}

2. GESTIÓN DE DROPLETS
---------------------

2.1 CREAR DROPLET SIMPLE
Endpoint: POST /api/droplet/create
Headers:
  x-api-key: TU_CLAVE_API
Body:
{
    "name": "nombre-droplet",
    "region": "sfo3",              // opcional, por defecto "sfo3"
    "size": "s-1vcpu-512mb-10gb"   // opcional, por defecto "s-1vcpu-512mb-10gb"
}

Respuesta Exitosa:
{
    "success": true,
    "data": {
        "id": 123456,
        "name": "nombre-droplet",
        "ip": null,
        "status": "creating",
        "message": "Droplet creado, esperando asignación de IP"
    }
}

2.2 VERIFICAR ESTADO DEL DROPLET
Endpoint: GET /api/droplet/{id}
Headers:
  x-api-key: TU_CLAVE_API

Respuesta:
{
    "success": true,
    "data": {
        "id": 123456,
        "name": "nombre-droplet",
        "ip": "123.456.789.0",
        "status": "active"
    }
}

NOTAS IMPORTANTES
===============

1. Autenticación:
   - Todas las operaciones requieren autenticación mediante el header x-api-key
   - La clave API debe ser configurada en las variables de entorno

2. Variables de Entorno:
   - DIGITALOCEAN_TOKEN: Token de acceso a DigitalOcean
   - DIGITALOCEAN_SSH_PASSWORD: Contraseña SSH para las instancias
   - REDIS_HOST: Host de Redis (default: localhost)
   - REDIS_PORT: Puerto de Redis (default: 6379)
   - API_KEY: Clave API para autenticación
   - PORT: Puerto del servidor (default: 3000)

3. Limitaciones:
   - Solo puede existir una instancia activa por número de teléfono
   - Las operaciones son asíncronas y devuelven respuesta inmediata
   - Se debe consultar el estado para verificar el progreso
   - Los errores devuelven código 400 o 500 con mensaje descriptivo

4. Persistencia:
   - Los datos se almacenan en Redis
   - La configuración de Redis puede ser modificada en redis.conf

5. Desarrollo:
   - Usar npm run dev para desarrollo local con hot-reload
   - Los logs se muestran en la consola en formato desarrollo
   - Se recomienda usar Postman o similar para pruebas de API 