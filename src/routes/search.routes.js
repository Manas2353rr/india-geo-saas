/**
 * routes/search.routes.js
 * ────────────────────────
 * GET /api/v1/search?q=manibeli&stateId=1&limit=20
 * GET /api/v1/autocomplete?q=man&limit=10
 *
 * These are the most-used endpoints — optimized for speed.
 * Uses PostgreSQL ILIKE for search (works without extensions).
 */

const router = require("express").Router();
const prisma = require("../config/database");
const { authenticateApiKey } = require("../middleware/auth");
const { sendSuccess, sendError } = require("../utils/response");

router.use(authenticateApiKey);

// ── GET /search ───────────────────────────────────────────────────
// Search villages (and optionally districts, subdistricts) by name
router.get("/search", async (req, res) => {
  try {
    const { q, stateId, districtId, limit: limitParam = 25 } = req.query;

    if (!q || q.trim().length < 2) {
      return sendError(res, "Query 'q' must be at least 2 characters.", {
        statusCode: 400, code: "INVALID_QUERY",
      });
    }

    const searchTerm = q.trim();
    const limit = Math.min(100, Math.max(1, parseInt(limitParam) || 25));

    // Build the where clause — filter by state or district if provided
    const where = {
      name: { contains: searchTerm, mode: "insensitive" }, // ILIKE in postgres
    };

    if (districtId) {
      where.subDistrict = { districtId: parseInt(districtId) };
    } else if (stateId) {
      where.subDistrict = {
        district: { stateId: parseInt(stateId) },
      };
    }

    const villages = await prisma.village.findMany({
      where,
      take: limit,
      orderBy: { name: "asc" },
      include: {
        subDistrict: {
          include: {
            district: {
              include: { state: { select: { name: true, id: true } } },
            },
          },
        },
      },
    });

    const results = villages.map((v) => ({
      value: `village_${v.id}`,
      label: v.name,
      code: v.code,
      fullAddress: `${v.name}, ${v.subDistrict.name}, ${v.subDistrict.district.name}, ${v.subDistrict.district.state.name}, India`,
      hierarchy: {
        village: v.name,
        subDistrict: v.subDistrict.name,
        district: v.subDistrict.district.name,
        state: v.subDistrict.district.state.name,
        country: "India",
      },
    }));

    return sendSuccess(res, results, {
      meta: { query: searchTerm, limit },
    });
  } catch (err) {
    console.error("Search error:", err);
    return sendError(res, "Search failed.");
  }
});

// ── GET /autocomplete ─────────────────────────────────────────────
// Faster, leaner version for typeahead — returns minimal data
// Frontend calls this on every keystroke (debounced)
router.get("/autocomplete", async (req, res) => {
  try {
    const { q, limit: limitParam = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return sendSuccess(res, []); // return empty — don't error on short queries
    }

    const searchTerm = q.trim();
    const limit = Math.min(20, Math.max(1, parseInt(limitParam) || 10));

    const villages = await prisma.village.findMany({
      where: {
        name: { startsWith: searchTerm, mode: "insensitive" }, // startsWith is faster than contains
      },
      take: limit,
      orderBy: { name: "asc" },
      include: {
        subDistrict: {
          include: {
            district: {
              include: { state: { select: { name: true } } },
            },
          },
        },
      },
    });

    // Minimal response format for autocomplete dropdowns
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
    console.error("Autocomplete error:", err);
    return sendError(res, "Autocomplete failed.");
  }
});

module.exports = router;