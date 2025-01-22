// Verificar variables de entorno
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.error(
    '❌ Error: Faltan credenciales de AWS en las variables de entorno'
  );
  process.exit(1);
}

async function testUpload() {
  try {
    // Crear cliente S3 usando la API nativa de Bun
    const s3 = new Bun.S3Client({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      region: process.env.AWS_REGION,
      bucket: process.env.AWS_BUCKET_NAME,
    });

    // Crear el contenido del archivo
    const fileContent = new TextEncoder().encode(
      'Hello World from Clientfy! 🚀'
    );

    // Crear referencia al archivo en S3
    const file = s3.file('test/hello-world.txt');

    // Subir el archivo
    await file.write(fileContent, {
      type: 'text/plain',
    });

    console.log('✅ Archivo subido exitosamente');
    console.log(`📁 Bucket: ${process.env.AWS_BUCKET_NAME}`);
    console.log('📝 Ruta: test/hello-world.txt');

    // Verificar que existe
    const exists = await file.exists();
    console.log('✅ Verificación de archivo:', exists ? 'Existe' : 'No existe');
  } catch (error) {
    console.error('❌ Error al subir archivo:', error);
  }
}

testUpload();
