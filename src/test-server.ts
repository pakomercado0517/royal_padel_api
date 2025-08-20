import express from "express";
import cors from "cors";
import morgan from "morgan";
import { conn } from "./Config/db";
import authRouter from "./Routes/authRouter";

const app = express();

// Middlewares
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

// Solo rutas de auth para testing
app.use("/api/auth", authRouter);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Auth server is running!" });
});

// Manejo de errores
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

const PORT = process.env.PORT || 3003;

// Conectar a la base de datos y iniciar servidor
conn.authenticate()
  .then(() => {
    console.log("✅ Database connection established successfully.");
    
    // Sync models (solo para desarrollo)
    return conn.sync({ force: false });
  })
  .then(() => {
    console.log("📊 Database synced successfully.");
    
    app.listen(PORT, () => {
      console.log(`🚀 Auth Test Server running on port ${PORT}`);
      console.log(`📡 Health check: http://localhost:${PORT}/health`);
      console.log(`🔐 Auth routes: http://localhost:${PORT}/api/auth`);
    });
  })
  .catch((error: any) => {
    console.error("❌ Unable to connect to the database:", error);
    process.exit(1);
  });

export default app;
