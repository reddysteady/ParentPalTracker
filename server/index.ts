import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import routes from "./routes";

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Environment validation
const requiredEnvVars =
  process.env.NODE_ENV === "production"
    ? [
        "DATABASE_URL",
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
        "OPENAI_API_KEY",
      ]
    : [];

const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);
if (missingEnvVars.length > 0 && process.env.NODE_ENV === "production") {
  console.error("❌ Missing required environment variables:", missingEnvVars);
  process.exit(1);
}

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "../public")));

// Clean route mounting without debugging

// API Routes
app.use('/', routes);

// Global error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error("❌ Unhandled error:", err);
    res.status(500).json({
      error: "Internal server error",
      message:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Something went wrong",
    });
  },
);

// Serve frontend for all non-API routes
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith("/api")) {
    res.sendFile(path.join(__dirname, "../public/index.html"));
  } else if (req.path.startsWith("/api")) {
    res.status(404).json({ error: "API endpoint not found" });
  } else {
    next();
  }
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 ParentPal server running on port ${PORT}`);
  console.log(`🌐 Access at: http://localhost:${PORT}`);
  console.log(`📧 Gmail OAuth configured: ${!!process.env.GOOGLE_CLIENT_ID}`);
  console.log(`📊 Database configured: ${!!process.env.DATABASE_URL}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('✅ Server startup complete');
});

// Graceful shutdown handling
process.on("SIGTERM", () => {
  console.log("🛑 SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("✅ Process terminated");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("🛑 SIGINT received, shutting down gracefully");
  server.close(() => {
    console.log("✅ Process terminated");
    process.exit(0);
  });
});

export default app;