API DE GESTIÓN DE INSTANCIAS DIGITALOCEAN

1. CREAR INSTANCIA
Endpoint: POST /api/instance/create
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
Ejemplo: POST /api/instance/restart/573332221111
Respuesta:
{
    "success": true,
    "message": "Reinicio iniciado"
}

4. ELIMINAR INSTANCIA
Endpoint: DELETE /api/instance/{numberphone}
Ejemplo: DELETE /api/instance/573332221111
Respuesta:
{
    "success": true,
    "message": "Instancia eliminada correctamente"
}

EJEMPLOS DE USO CON CURL:

1. Crear instancia:
curl -X POST http://localhost:3000/api/instance/create \
-H "Content-Type: application/json" \
-d '{"numberphone":"573332221111","provider":"baileys"}'

2. Verificar estado:
curl http://localhost:3000/api/instance/status/573332221111

3. Reiniciar instancia:
curl -X POST http://localhost:3000/api/instance/restart/573332221111

4. Eliminar instancia:
curl -X DELETE http://localhost:3000/api/instance/573332221111

NOTAS:
- Todas las operaciones requieren las variables de entorno DIGITALOCEAN_TOKEN y DIGITALOCEAN_SSH_PASSWORD configuradas
- Solo puede existir una instancia activa por número de teléfono
- Las operaciones asíncronas (crear, reiniciar) devuelven respuesta inmediata y se debe consultar el estado
- Los errores devuelven código 400 o 500 con mensaje descriptivo
- La API mantiene el estado en memoria, se pierde al reiniciar el servidor 