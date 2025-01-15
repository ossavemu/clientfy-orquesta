import "./config/env.js";
import express from "express";
import { errorHandler } from "./middleware/errorHandler.js";
import apiRoutes from "./routes/api.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Rutas
app.use("/api", apiRoutes);

// Manejador de errores
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
