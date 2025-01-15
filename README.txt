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
Body: 
{
    "numberphone": "573332221111",
    "provider": "baileys"  // opcional, por defecto "baileys"
}
Respuesta:
{
    "success": true,
    "numberphone": "573332221111",
    "status": "creating"
}

1.2 VERIFICAR ESTADO
Endpoint: GET /api/instance/status/{numberphone}
Headers:
  x-api-key: TU_CLAVE_API
Respuesta:
{
    "status": "configuring",
    "progress": 60,
    "error": null,
    "instanceInfo": null
}

1.3 REINICIAR INSTANCIA
Endpoint: POST /api/instance/restart/{numberphone}
Headers:
  x-api-key: TU_CLAVE_API
Respuesta:
{
    "success": true,
    "message": "Reinicio iniciado"
}

1.4 ELIMINAR INSTANCIA
Endpoint: DELETE /api/instance/{numberphone}
Headers:
  x-api-key: TU_CLAVE_API
Respuesta:
{
    "success": true,
    "message": "Instancia eliminada correctamente"
}

1.5 LISTAR INSTANCIAS
Endpoint: GET /api/instance/list
Headers:
  x-api-key: TU_CLAVE_API
Respuesta:
{
    "success": true,
    "droplets": [
        {
            "id": 123456,
            "name": "bot-573332221111",
            "status": "active",
            "created": "2024-03-20T15:30:00Z",
            "ip": "123.456.789.0",
            "memory": 1024,
            "disk": 25,
            "region": "nyc1"
        }
    ]
}

2. GESTIÓN DE CONTRASEÑAS
------------------------

2.1 GENERAR CONTRASEÑA
Endpoint: POST /api/password/generate
Headers:
  x-api-key: TU_CLAVE_API
Body:
{
    "email": "usuario@ejemplo.com"
}
Respuesta:
{
    "success": true,
    "password": "generatedPassword123!"
}

EJEMPLOS DE USO
==============

Usando curl:

1. Crear instancia:
curl -X POST http://localhost:3000/api/instance/create \
-H "Content-Type: application/json" \
-H "x-api-key: TU_CLAVE_API" \
-d '{"numberphone":"573332221111","provider":"baileys"}'

2. Verificar estado:
curl http://localhost:3000/api/instance/status/573332221111 \
-H "x-api-key: TU_CLAVE_API"

3. Reiniciar instancia:
curl -X POST http://localhost:3000/api/instance/restart/573332221111 \
-H "x-api-key: TU_CLAVE_API"

4. Eliminar instancia:
curl -X DELETE http://localhost:3000/api/instance/573332221111 \
-H "x-api-key: TU_CLAVE_API"

5. Listar instancias:
curl http://localhost:3000/api/instance/list \
-H "x-api-key: TU_CLAVE_API"

6. Generar contraseña:
curl -X POST http://localhost:3000/api/password/generate \
-H "Content-Type: application/json" \
-H "x-api-key: TU_CLAVE_API" \
-d '{"email":"usuario@ejemplo.com"}'

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
   - Las operaciones asíncronas (crear, reiniciar) devuelven respuesta inmediata
   - Se debe consultar el estado para verificar el progreso
   - Los errores devuelven código 400 o 500 con mensaje descriptivo

4. Persistencia:
   - Los datos se almacenan en Redis
   - La configuración de Redis puede ser modificada en redis.conf

5. Desarrollo:
   - Usar npm run dev para desarrollo local con hot-reload
   - Los logs se muestran en la consola en formato desarrollo
   - Se recomienda usar Postman o similar para pruebas de API 