API DE GESTIÓN DE INSTANCIAS DIGITALOCEAN

AUTENTICACIÓN:
Todas las peticiones deben incluir el header 'x-api-key' con la clave de API correspondiente.

1. CREAR INSTANCIA
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

2. VERIFICAR ESTADO
Endpoint: GET /api/instance/status/{numberphone}
Headers:
  x-api-key: TU_CLAVE_API
Ejemplo: GET /api/instance/status/573332221111
Respuesta:
{
    "status": "configuring",
    "progress": 60,
    "error": null,
    "instanceInfo": null
}

3. REINICIAR INSTANCIA
Endpoint: POST /api/instance/restart/{numberphone}
Headers:
  x-api-key: TU_CLAVE_API
Ejemplo: POST /api/instance/restart/573332221111
Respuesta:
{
    "success": true,
    "message": "Reinicio iniciado"
}

4. ELIMINAR INSTANCIA
Endpoint: DELETE /api/instance/{numberphone}
Headers:
  x-api-key: TU_CLAVE_API
Ejemplo: DELETE /api/instance/573332221111
Respuesta:
{
    "success": true,
    "message": "Instancia eliminada correctamente"
}

5. LISTAR INSTANCIAS
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

6. LISTAR IMÁGENES
Endpoint: GET /api/instance/images
Headers:
  x-api-key: TU_CLAVE_API
Respuesta:
{
    "success": true,
    "images": [
        {
            "id": 789012,
            "name": "Ubuntu 20.04",
            "distribution": "Ubuntu",
            "created": "2024-03-20T15:30:00Z",
            "size_gigabytes": 2.34,
            "description": "Ubuntu 20.04 x64",
            "status": "available"
        }
    ]
}

EJEMPLOS DE USO CON CURL:

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

6. Listar imágenes:
curl http://localhost:3000/api/instance/images \
-H "x-api-key: TU_CLAVE_API"

NOTAS:
- Todas las operaciones requieren autenticación mediante el header x-api-key
- Todas las operaciones requieren las variables de entorno DIGITALOCEAN_TOKEN y DIGITALOCEAN_SSH_PASSWORD configuradas
- Solo puede existir una instancia activa por número de teléfono
- Las operaciones asíncronas (crear, reiniciar) devuelven respuesta inmediata y se debe consultar el estado
- Los errores devuelven código 400 o 500 con mensaje descriptivo
- La API mantiene el estado en memoria, se pierde al reiniciar el servidor 