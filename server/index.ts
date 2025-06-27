import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import routes from "./routes";

const app = express();
const PORT = process.env.PORT || 5000;

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

// Monkey-patch logging for route registration debugging
const originalMethods = {
  appGet: app.get.bind(app),
  appPost: app.post.bind(app),
  appUse: app.use.bind(app)
};

app.get = function(path: any, ...handlers: any[]) {
  console.log('🔍 app.get() called with:', { path, pathType: typeof path, pathValue: JSON.stringify(path) });
  if (path === '' || path === undefined || path === null) {
    console.error('❌ INVALID PATH in app.get():', path);
    console.trace('Stack trace for invalid app.get()');
  }
  return originalMethods.appGet(path, ...handlers);
};

app.post = function(path: any, ...handlers: any[]) {
  console.log('🔍 app.post() called with:', { path, pathType: typeof path, pathValue: JSON.stringify(path) });
  if (path === '' || path === undefined || path === null) {
    console.error('❌ INVALID PATH in app.post():', path);
    console.trace('Stack trace for invalid app.post()');
  }
  return originalMethods.appPost(path, ...handlers);
};

app.use = function(path: any, ...handlers: any[]) {
  console.log('🔍 app.use() called with:', { path, pathType: typeof path, pathValue: JSON.stringify(path) });
  if (path === '' || path === undefined || path === null) {
    console.error('❌ INVALID PATH in app.use():', path);
    console.trace('Stack trace for invalid app.use()');
  }
  return originalMethods.appUse(path, ...handlers);
};

// API Routes
console.log('ATTACHING ROUTES:', routes);
app.use(routes);

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
app.get("*", (req, res) => {
  if (!req.path.startsWith("/api")) {
    res.sendFile(path.join(__dirname, "../public/index.html"));
  } else {
    res.status(404).json({ error: "API endpoint not found" });
  }
});

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 ParentPal server running on port ${PORT}`);
  console.log(
    `📧 Ready to process school emails and manage parenting schedules`,
  );
  console.log(`🌐 Local access: http://0.0.0.0:${PORT}`);
  console.log(
    `🌐 External access: https://parentpaltracker.${process.env.REPL_OWNER}.replit.dev`,
  );
  console.log(
    `📁 Serving static files from: ${path.join(__dirname, "../public")}`,
  );

  // Log environment status
  const envStatus = {
    nodeEnv: process.env.NODE_ENV || "development",
    devMode: process.env.DEV_MODE === "true",
    hasDatabase: !!process.env.DATABASE_URL,
    hasGoogleAuth: !!(
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ),
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    hasTwilio: !!(
      process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ),
  };

  console.log("✅ Environment status:", envStatus);

  if (process.env.DEV_MODE === "true") {
    console.log(
      "🔧 Development mode: External services will use mock implementations",
    );
  }
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
