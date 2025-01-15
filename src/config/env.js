import dotenv from "dotenv";

const result = dotenv.config();
if (result.error) {
  console.error("Error al cargar .env:", result.error);
  process.exit(1);
}

console.log("Variables de entorno cargadas:", {
  token: process.env.DIGITALOCEAN_TOKEN ? "Configurado" : "No configurado",
  password: process.env.DIGITALOCEAN_SSH_PASSWORD
    ? "Configurado"
    : "No configurado",
  port: process.env.PORT,
});
