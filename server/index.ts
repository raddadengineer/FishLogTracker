import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import session from "express-session";
import { v4 as uuidv4 } from "uuid";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

// Set up session middleware with PostgreSQL session store for production
if (process.env.NODE_ENV === 'production') {
  const pgStore = connectPg(session);
  const sessionTtl = 7 * 24 * 60 * 60; // 7 days in seconds
  
  console.log("Setting up PostgreSQL session storage");
  
  app.use(session({
    store: new pgStore({
      pool: pool,
      createTableIfMissing: true,
      tableName: 'sessions',
      ttl: sessionTtl
    }),
    secret: process.env.SESSION_SECRET || 'fish-tracker-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: sessionTtl * 1000, // convert seconds to milliseconds
      secure: true,
      httpOnly: true,
      sameSite: 'lax'
    },
    genid: () => uuidv4() // Use UUID for session IDs
  }));
} else {
  // In development, use simpler session setup
  app.use(session({
    secret: 'fish-tracker-dev-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      secure: false,
      httpOnly: true,
      sameSite: 'lax'
    },
    genid: () => uuidv4() // Use UUID for session IDs
  }));
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
