const express = require("express");
const cors    = require("cors");
const { v4: uuidv4 } = require("uuid");

const authRoutes         = require("../src/routes/auth.routes");
const geoRoutes          = require("../src/routes/geo.routes");
const searchRoutes       = require("../src/routes/search.routes");
const autocompleteRoutes = require("../src/routes/autocomplete.routes");
const userRoutes         = require("../src/routes/user.routes");
const adminRoutes        = require("../src/routes/admin.routes");
const billingRoutes      = require("../src/routes/billing.routes");
const usageTracker       = require("../src/middleware/usageTracker");

const app = express();

// ── CORS — handle ALL vercel preview URLs + localhost ──────────────
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://india-geo-saas-obt4.vercel.app",
  "https://india-geo-saas-obt4-git-main-manas-s-projects-b7b9fe55.vercel.app",
  "https://india-geo-saas-obt4-git-main-manas-s-projects-b7b9fe55.vercel.app/",
  "https://india-geo-saas-obt4-nhu7sb5hj-manas-s-projects-b7b9fe55.vercel.app",
  "https://india-geo-saas-obt4-nhu7sb5hj-manas-s-projects-b7b9fe55.vercel.app/",
  "https://india-geo-saas-obt4-nhu7sb5hj-manas-s-projects-b7b9fe55.vercel.app/demo",
  "https://india-geo-saas-obt4-nhu7sb5hj-manas-s-projects-b7b9fe55.vercel.app/login",
  "https://india-geo-saas-obt4-nhu7sb5hj-manas-s-projects-b7b9fe55.vercel.app/login/",
  "https://india-geo-saas-obt4-nhu7sb5hj-manas-s-projects-b7b9fe55.vercel.app/register",
  "https://india-geo-saas-obt4-nhu7sb5hj-manas-s-projects-b7b9fe55.vercel.app/register/",
  "https://india-geo-saas-obt4-nhu7sb5hj-manas-s-projects-b7b9fe55.vercel.app/dashboard",
  "https://india-geo-saas-obt4-nhu7sb5hj-manas-s-projects-b7b9fe55.vercel.app/dashboard/",
  "https://india-geo-saas-obt4-nhu7sb5hj-manas-s-projects-b7b9fe55.vercel.app/admin",
  "https://india-geo-saas-obt4-nhu7sb5hj-manas-s-projects-b7b9fe55.vercel.app/admin/",
  "https://india-geo-saas-obt4-nhu7sb5hj-manas-s-projects-b7b9fe55.vercel.app/admin/users",
  "https://india-geo-saas-obt4-nhu7sb5hj-manas-s-projects-b7b9fe55.vercel.app/admin/users/",
  "https://india-geo-saas-obt4-nhu7sb5hj-manas-s-projects-b7b9fe55.vercel.app/admin/users/1",
  "https://india-geo-saas-obt4-nhu7sb5hj-manas-s-projects-b7b9fe55.vercel.app/admin/users/1/",
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  // Allow any vercel.app domain + localhost
  if (!origin || origin.includes("vercel.app") || allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin || "http://localhost:5173,https://india-geo-saas-obt4.vercel.app,https://india-geo-saas-obt4-git-main-manas-s-projects-b7b9fe55.vercel.app,https://india-geo-saas-obt4-nhu7sb5hj-manas-s-projects-b7b9fe55.vercel.app,https://india-geo-saas-lgwj3ldq6-manas-s-projects-b7b9fe55.vercel.app/api/v1/auth/login");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-API-Key");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

app.use((req, res, next) => {
  res.locals.requestId = "req_" + uuidv4().replace(/-/g, "").substring(0, 12);
  res.locals.startTime = Date.now();
  next();
});

app.use(usageTracker);

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/v1/auth",         authRoutes);
app.use("/api/v1/admin",        adminRoutes);
app.use("/api/v1/user",         userRoutes);
app.use("/api/v1/billing",      billingRoutes);
app.use("/api/v1/geo",          geoRoutes);
app.use("/api/v1/search",       searchRoutes);
app.use("/api/v1/autocomplete", autocompleteRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, error: "Route not found", code: "NOT_FOUND" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, error: "Server error", code: "INTERNAL_ERROR" });
});

module.exports = app;