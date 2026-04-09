const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../config/database");
const { authenticateJWT } = require("../middleware/auth");
const { sendSuccess, sendError } = require("../utils/response");

router.post("/register", async (req, res) => {
  try {
    const { email, password, businessName, phone, gstNumber } = req.body;
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
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return sendError(res, "An account with this email already exists.", {
        statusCode: 409, code: "EMAIL_EXISTS",
      });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email, passwordHash, businessName,
        phone: phone || null,
        gstNumber: gstNumber || null,
        status: "PENDING", role: "CLIENT", planType: "FREE",
      },
      select: { id: true, email: true, businessName: true, status: true, createdAt: true },
    });
    return sendSuccess(res, user, {
      statusCode: 201,
      meta: { message: "Account created. Awaiting admin approval." },
    });
  } catch (err) {
    console.error("Register error:", err);
    return sendError(res, "Registration failed.");
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return sendError(res, "Email and password are required.", {
        statusCode: 400, code: "MISSING_FIELDS",
      });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return sendError(res, "Invalid email or password.", {
        statusCode: 401, code: "INVALID_CREDENTIALS",
      });
    }
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return sendError(res, "Invalid email or password.", {
        statusCode: 401, code: "INVALID_CREDENTIALS",
      });
    }
    if (user.status === "PENDING") {
      return sendError(res, "Your account is awaiting admin approval.", {
        statusCode: 403, code: "PENDING_APPROVAL",
      });
    }
    if (user.status === "SUSPENDED") {
      return sendError(res, "Your account has been suspended.", {
        statusCode: 403, code: "ACCOUNT_SUSPENDED",
      });
    }
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );
    return sendSuccess(res, {
      token,
      user: {
        id: user.id, email: user.email,
        businessName: user.businessName,
        role: user.role, planType: user.planType,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return sendError(res, "Login failed.");
  }
});

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

router.post("/logout", (req, res) => {
  return sendSuccess(res, { message: "Logged out successfully." });
});

module.exports = router;