require("dotenv").config();
const app = require("../api/index.js");
const PORT = process.env.PORT || 3000;
const express = require("express");
const cors    = require("cors");
const { v4: uuidv4 } = require("uuid");

const authRoutes         = require("./routes/auth.routes");
const geoRoutes          = require("./routes/geo.routes");
const searchRoutes       = require("./routes/search.routes");
const autocompleteRoutes = require("./routes/autocomplete.routes");
const userRoutes         = require("./routes/user.routes");
const adminRoutes        = require("./routes/admin.routes");
const billingRoutes      = require("./routes/billing.routes");
const usageTracker       = require("./middleware/usageTracker");


// CORS — allow all origins in production, specific in dev
const allowedOrigins = [
  "https://india-geo-saas-obt4.vercel.app",
  "http://localhost:5173"
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.includes(origin);
    const isVercelPreview = origin.endsWith(".vercel.app") && origin.includes("india-geo-saas-obt4");

    if (isAllowed || isVercelPreview) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
  credentials: true // Change to true if you use cookies/sessions, else false is fine
}));


app.options("*", cors());

app.use(express.json());

// Request ID and timer
app.use((req, res, next) => {
  res.locals.requestId = "req_" + uuidv4().replace(/-/g, "").substring(0, 12);
  res.locals.startTime = Date.now();
  next();
});

// Usage tracker
app.use(usageTracker);

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()) + "s",
  });
});

// Routes
app.use("/api/v1/auth",         authRoutes);
app.use("/api/v1/admin",        adminRoutes);
app.use("/api/v1/user",         userRoutes);
app.use("/api/v1/billing",      billingRoutes);
app.use("/api/v1/geo",          geoRoutes);
app.use("/api/v1/search",       searchRoutes);
app.use("/api/v1/autocomplete", autocompleteRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.path}`,
    code: "NOT_FOUND",
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "An unexpected error occurred.",
    code: "INTERNAL_ERROR",
  });
});

// Only listen locally — Vercel handles this in production
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`\n  Backend running on port ${PORT}`);
    console.log(`  Health: http://localhost:${PORT}/health\n`);
  });
}

module.exports = app;