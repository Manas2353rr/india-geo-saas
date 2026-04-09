const router = require("express").Router();
const prisma = require("../config/database");
const { authenticateApiKey } = require("../middleware/auth");
const rateLimiter     = require("../middleware/rateLimiter");
const { sendSuccess, sendError } = require("../utils/response");

router.use(authenticateApiKey, rateLimiter);

router.get("/states", async (req, res) => {
  try {
    const states = await prisma.state.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true, code: true, name: true,
        _count: { select: { districts: true } },
      },
    });
    return sendSuccess(res, states);
  } catch (err) {
    return sendError(res, "Failed to fetch states.");
  }
});

router.get("/states/:stateId/districts", async (req, res) => {
  try {
    const stateId = parseInt(req.params.stateId);
    if (isNaN(stateId)) {
      return sendError(res, "Invalid state ID.", { statusCode: 400, code: "INVALID_PARAMS" });
    }
    const state = await prisma.state.findUnique({ where: { id: stateId } });
    if (!state) {
      return sendError(res, "State not found.", { statusCode: 404, code: "NOT_FOUND" });
    }
    const districts = await prisma.district.findMany({
      where: { stateId },
      orderBy: { name: "asc" },
      select: {
        id: true, code: true, name: true, stateId: true,
        _count: { select: { subDistricts: true } },
      },
    });
    return sendSuccess(res, districts, { meta: { state: state.name } });
  } catch (err) {
    return sendError(res, "Failed to fetch districts.");
  }
});

router.get("/districts/:districtId/subdistricts", async (req, res) => {
  try {
    const districtId = parseInt(req.params.districtId);
    if (isNaN(districtId)) {
      return sendError(res, "Invalid district ID.", { statusCode: 400, code: "INVALID_PARAMS" });
    }
    const district = await prisma.district.findUnique({
      where: { id: districtId },
      include: { state: { select: { name: true } } },
    });
    if (!district) {
      return sendError(res, "District not found.", { statusCode: 404, code: "NOT_FOUND" });
    }
    const subDistricts = await prisma.subDistrict.findMany({
      where: { districtId },
      orderBy: { name: "asc" },
      select: {
        id: true, code: true, name: true, districtId: true,
        _count: { select: { villages: true } },
      },
    });
    return sendSuccess(res, subDistricts, {
      meta: { district: district.name, state: district.state.name },
    });
  } catch (err) {
    return sendError(res, "Failed to fetch sub-districts.");
  }
});

router.get("/subdistricts/:subdistrictId/villages", async (req, res) => {
  try {
    const subDistrictId = parseInt(req.params.subdistrictId);
    if (isNaN(subDistrictId)) {
      return sendError(res, "Invalid sub-district ID.", { statusCode: 400, code: "INVALID_PARAMS" });
    }
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 100));
    const skip  = (page - 1) * limit;

    const subDistrict = await prisma.subDistrict.findUnique({
      where: { id: subDistrictId },
      include: { district: { include: { state: { select: { name: true } } } } },
    });
    if (!subDistrict) {
      return sendError(res, "Sub-district not found.", { statusCode: 404, code: "NOT_FOUND" });
    }
    const [villages, total] = await Promise.all([
      prisma.village.findMany({
        where: { subDistrictId },
        orderBy: { name: "asc" },
        skip, take: limit,
        select: { id: true, code: true, name: true },
      }),
      prisma.village.count({ where: { subDistrictId } }),
    ]);
    const formatted = villages.map((v) => ({
      value: `village_${v.id}`,
      label: v.name,
      code: v.code,
      fullAddress: `${v.name}, ${subDistrict.name}, ${subDistrict.district.name}, ${subDistrict.district.state.name}, India`,
      hierarchy: {
        village: v.name,
        subDistrict: subDistrict.name,
        district: subDistrict.district.name,
        state: subDistrict.district.state.name,
        country: "India",
      },
    }));
    return sendSuccess(res, formatted, {
      count: total,
      meta: { page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return sendError(res, "Failed to fetch villages.");
  }
});

router.get("/village/:villageId", async (req, res) => {
  try {
    const villageId = parseInt(req.params.villageId);
    if (isNaN(villageId)) {
      return sendError(res, "Invalid village ID.", { statusCode: 400, code: "INVALID_PARAMS" });
    }
    const village = await prisma.village.findUnique({
      where: { id: villageId },
      include: {
        subDistrict: { include: { district: { include: { state: true } } } },
      },
    });
    if (!village) {
      return sendError(res, "Village not found.", { statusCode: 404, code: "NOT_FOUND" });
    }
    return sendSuccess(res, {
      value: `village_${village.id}`,
      label: village.name,
      code: village.code,
      fullAddress: `${village.name}, ${village.subDistrict.name}, ${village.subDistrict.district.name}, ${village.subDistrict.district.state.name}, India`,
      hierarchy: {
        village: { id: village.id, name: village.name, code: village.code },
        subDistrict: { id: village.subDistrict.id, name: village.subDistrict.name },
        district: { id: village.subDistrict.district.id, name: village.subDistrict.district.name },
        state: { id: village.subDistrict.district.state.id, name: village.subDistrict.district.state.name },
        country: "India",
      },
    });
  } catch (err) {
    return sendError(res, "Failed to fetch village.");
  }
});

module.exports = router;