const router = require("express").Router();
const { authenticateJWT } = require("../middleware/auth");
const { getAllPlans, getUsageSummary } = require("../services/billing.service");
const { sendSuccess, sendError } = require("../utils/response");

router.use(authenticateJWT);

// GET /api/v1/billing/plans — show all available plans
router.get("/plans", async (req, res) => {
  try {
    const plans = getAllPlans();
    return sendSuccess(res, plans);
  } catch (err) {
    return sendError(res, "Failed to fetch plans.");
  }
});

// GET /api/v1/billing/usage — detailed usage for current user
router.get("/usage", async (req, res) => {
  try {
    const summary = await getUsageSummary(req.user.id, req.user.planType);
    return sendSuccess(res, summary);
  } catch (err) {
    return sendError(res, "Failed to fetch usage.");
  }
});

module.exports = router;