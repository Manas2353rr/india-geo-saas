const router = require("express").Router();
const prisma = require("../config/database");
const { authenticateApiKey } = require("../middleware/auth");
const rateLimiter     = require("../middleware/rateLimiter");
const { sendSuccess, sendError } = require("../utils/response");

router.use(authenticateApiKey, rateLimiter);

router.get("/", async (req, res) => {
  try {
    const { q, limit: limitParam = 10 } = req.query;
    if (!q || q.trim().length < 2) return sendSuccess(res, []);
    const limit = Math.min(20, parseInt(limitParam) || 10);
    const villages = await prisma.village.findMany({
      where: { name: { startsWith: q.trim(), mode: "insensitive" } },
      take: limit, orderBy: { name: "asc" },
      include: {
        subDistrict: {
          include: { district: { include: { state: { select: { name: true } } } } },
        },
      },
    });
    const suggestions = villages.map((v) => ({
      value: `village_${v.id}`,
      label: v.name,
      subtitle: `${v.subDistrict.name}, ${v.subDistrict.district.name}, ${v.subDistrict.district.state.name}`,
      fullAddress: `${v.name}, ${v.subDistrict.name}, ${v.subDistrict.district.name}, ${v.subDistrict.district.state.name}, India`,
      hierarchy: {
        village: v.name,
        subDistrict: v.subDistrict.name,
        district: v.subDistrict.district.name,
        state: v.subDistrict.district.state.name,
        country: "India",
      },
    }));
    return sendSuccess(res, suggestions);
  } catch (err) {
    return sendError(res, "Autocomplete failed.");
  }
});

module.exports = router;