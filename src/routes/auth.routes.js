/**
 * routes/auth.routes.js
 * ──────────────────────
 * POST /api/v1/auth/register  → create new B2B client account
 * POST /api/v1/auth/login     → get JWT token
 * POST /api/v1/auth/logout    → (client-side token discard)
 * GET  /api/v1/auth/me        → get current user info
 */

const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../config/database");
const { authenticateJWT } = require("../middleware/auth");
const { sendSuccess, sendError } = require("../utils/response");

// ── POST /register ────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { email, password, businessName, phone, gstNumber } = req.body;

    // Basic validation
    if (!email || !password || !businessName) {
      return sendError(res, "Email, password, and business name are required.", {
        statusCode: 400, code: "MISSING_FIELDS",
      });
    }

    if (password.length < 8) {
      return sendError(res, "Password must be at least 8 characters.", {
        statusCode: 400, code: "WEAK_PASSWORD",
      });
    }

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return sendError(res, "An account with this email already exists.", {
        statusCode: 409, code: "EMAIL_EXISTS",
      });
    }

    // Hash password with bcrypt (cost factor 12 = very secure)
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user — status is PENDING until admin approves
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        businessName,
        phone: phone || null,
        gstNumber: gstNumber || null,
        status: "PENDING",
        role: "CLIENT",
        planType: "FREE",
      },
      select: {
        id: true, email: true, businessName: true, status: true, createdAt: true,
      },
    });

    return sendSuccess(res, user, {
      statusCode: 201,
      meta: { message: "Account created. Awaiting admin approval before you can use the API." },
    });
  } catch (err) {
    console.error("Register error:", err);
    return sendError(res, "Registration failed. Please try again.");
  }
});

// ── POST /login ───────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, "Email and password are required.", {
        statusCode: 400, code: "MISSING_FIELDS",
      });
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Generic message — don't reveal whether email exists
      return sendError(res, "Invalid email or password.", {
        statusCode: 401, code: "INVALID_CREDENTIALS",
      });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return sendError(res, "Invalid email or password.", {
        statusCode: 401, code: "INVALID_CREDENTIALS",
      });
    }

    // Check account status
    if (user.status === "PENDING") {
      return sendError(res, "Your account is awaiting admin approval.", {
        statusCode: 403, code: "PENDING_APPROVAL",
      });
    }
    if (user.status === "SUSPENDED") {
      return sendError(res, "Your account has been suspended. Contact support.", {
        statusCode: 403, code: "ACCOUNT_SUSPENDED",
      });
    }

    // Create JWT — expires in 24 hours
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    return sendSuccess(res, {
      token,
      user: {
        id: user.id,
        email: user.email,
        businessName: user.businessName,
        role: user.role,
        planType: user.planType,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return sendError(res, "Login failed. Please try again.");
  }
});

// ── GET /me ───────────────────────────────────────────────────────
// Returns current logged-in user's info
router.get("/me", authenticateJWT, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, email: true, businessName: true,
        role: true, status: true, planType: true,
        phone: true, gstNumber: true, createdAt: true,
        _count: { select: { apiKeys: true } },
      },
    });
    return sendSuccess(res, user);
  } catch (err) {
    return sendError(res, "Failed to fetch user info.");
  }
});

// ── POST /logout ──────────────────────────────────────────────────
// JWTs are stateless — client just deletes the token from localStorage
// We just send a 200 so the client knows it worked
router.post("/logout", (req, res) => {
  return sendSuccess(res, { message: "Logged out. Delete your token on the client side." });
});

module.exports = router;