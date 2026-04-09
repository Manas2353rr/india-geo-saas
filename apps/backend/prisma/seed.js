const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const prisma = new PrismaClient();
const CSV_PATH = path.join(__dirname, "cleaned_villages.csv");
const BATCH_SIZE = 10000;

async function readCSV(filePath) {
  const rows = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
  });
  let headers = null;
  for await (const line of rl) {
    if (!line.trim()) continue;
    const values = line.split(",").map((v) => v.replace(/^"|"$/g, "").trim());
    if (!headers) {
      headers = values;
    } else {
      const row = {};
      headers.forEach((h, i) => (row[h] = values[i] || ""));
      rows.push(row);
    }
  }
  return rows;
}

function log(msg) {
  process.stdout.write("\r" + msg + "                    ");
}

async function main() {
  console.log("\n==============================");
  console.log("  Fast Seeder — Bulk Insert");
  console.log("==============================\n");

  if (!fs.existsSync(CSV_PATH)) {
    console.error("ERROR: cleaned_villages.csv not found in prisma/ folder");
    process.exit(1);
  }

  // ── Read CSV ──────────────────────────────────────────────────
  console.log("Reading CSV...");
  const rows = await readCSV(CSV_PATH);
  console.log(`  ${rows.length.toLocaleString()} rows loaded\n`);

  // ── Build unique sets in memory first ─────────────────────────
  // This avoids hitting the DB for every single row
  const stateMap    = new Map(); // code → name
  const districtMap = new Map(); // stateCode-distCode → name
  const subMap      = new Map(); // distCode-subCode → name

  for (const row of rows) {
    stateMap.set(row.state_code, row.state_name);

    const dk = `${row.state_code}-${row.district_code}`;
    if (!districtMap.has(dk))
      districtMap.set(dk, { code: row.district_code, name: row.district_name, stateCode: row.state_code });

    const sk = `${row.district_code}-${row.subdistrict_code}`;
    if (!subMap.has(sk))
      subMap.set(sk, { code: row.subdistrict_code, name: row.subdistrict_name, districtKey: dk });
  }

  console.log(`Unique states       : ${stateMap.size}`);
  console.log(`Unique districts    : ${districtMap.size}`);
  console.log(`Unique sub-districts: ${subMap.size}`);
  console.log(`Total villages      : ${rows.length.toLocaleString()}\n`);

  // ── Step 1: Insert States (bulk) ──────────────────────────────
  console.log("Inserting states...");
  const stateRows = Array.from(stateMap.entries()).map(([code, name]) => ({ code, name }));

  await prisma.state.createMany({ data: stateRows, skipDuplicates: true });

  // Fetch back with IDs
  const stateRecords = await prisma.state.findMany({ select: { id: true, code: true } });
  const stateIdMap = new Map(stateRecords.map((s) => [s.code, s.id]));
  console.log(`  Done — ${stateIdMap.size} states\n`);

  // ── Step 2: Insert Districts (bulk) ───────────────────────────
  console.log("Inserting districts...");
  const districtRows = Array.from(districtMap.values()).map((d) => ({
    code: d.code,
    name: d.name,
    stateId: stateIdMap.get(d.stateCode),
  })).filter((d) => d.stateId);

  // Insert in batches of 1000
  for (let i = 0; i < districtRows.length; i += 1000) {
    await prisma.district.createMany({
      data: districtRows.slice(i, i + 1000),
      skipDuplicates: true,
    });
    log(`  Districts: ${Math.min(i + 1000, districtRows.length)}/${districtRows.length}`);
  }

  // Fetch back with IDs
  const districtRecords = await prisma.district.findMany({
    select: { id: true, code: true, stateId: true },
  });
  // Map: stateCode-distCode → districtId
  const districtIdMap = new Map();
  for (const d of districtRecords) {
    // Find stateCode from stateIdMap (reverse lookup)
    for (const [sc, sid] of stateIdMap) {
      if (sid === d.stateId) {
        districtIdMap.set(`${sc}-${d.code}`, d.id);
        break;
      }
    }
  }
  console.log(`\n  Done — ${districtIdMap.size} districts\n`);

  // ── Step 3: Insert Sub-Districts (bulk) ───────────────────────
  console.log("Inserting sub-districts...");
  const subRows = Array.from(subMap.entries()).map(([key, s]) => ({
    code: s.code,
    name: s.name,
    districtId: districtIdMap.get(s.districtKey),
  })).filter((s) => s.districtId);

  for (let i = 0; i < subRows.length; i += 1000) {
    await prisma.subDistrict.createMany({
      data: subRows.slice(i, i + 1000),
      skipDuplicates: true,
    });
    log(`  Sub-districts: ${Math.min(i + 1000, subRows.length)}/${subRows.length}`);
  }

  // Fetch back with IDs
  const subRecords = await prisma.subDistrict.findMany({
    select: { id: true, code: true, districtId: true },
  });
  // Map: districtId-subCode → subDistrictId
  const subIdMap = new Map();
  for (const s of subRecords) {
    subIdMap.set(`${s.districtId}-${s.code}`, s.id);
  }
  console.log(`\n  Done — ${subIdMap.size} sub-districts\n`);

  // ── Step 4: Insert Villages (bulk, large batches) ─────────────
  console.log("Inserting villages...");

  // Build all village records in memory
  const villageRows = [];
  for (const row of rows) {
    const dk = `${row.state_code}-${row.district_code}`;
    const districtId = districtIdMap.get(dk);
    if (!districtId) continue;

    const subDistrictId = subIdMap.get(`${districtId}-${row.subdistrict_code}`);
    if (!subDistrictId) continue;

    villageRows.push({
      code: row.village_code,
      name: row.area_name,
      subDistrictId,
    });
  }

  let inserted = 0;
  for (let i = 0; i < villageRows.length; i += BATCH_SIZE) {
    const batch = villageRows.slice(i, i + BATCH_SIZE);
    await prisma.village.createMany({ data: batch, skipDuplicates: true });
    inserted += batch.length;
    log(`  Villages: ${inserted.toLocaleString()}/${villageRows.length.toLocaleString()}`);
  }
  console.log(`\n  Done — ${inserted.toLocaleString()} villages\n`);

  // ── Step 5: Create Admin User ─────────────────────────────────
  const existing = await prisma.user.findUnique({
    where: { email: "admin@villageapi.com" },
  });
  if (!existing) {
    await prisma.user.create({
      data: {
        email: "admin@villageapi.com",
        passwordHash: await bcrypt.hash("Admin@123", 12),
        businessName: "Platform Admin",
        role: "ADMIN",
        status: "ACTIVE",
        planType: "UNLIMITED",
      },
    });
    console.log("Admin created: admin@villageapi.com / Admin@123");
  }

  // ── Final Count ───────────────────────────────────────────────
  const counts = await Promise.all([
    prisma.state.count(),
    prisma.district.count(),
    prisma.subDistrict.count(),
    prisma.village.count(),
  ]);

  console.log("\n==============================");
  console.log("  SEEDING COMPLETE");
  console.log("==============================");
  console.log(`  States        : ${counts[0]}`);
  console.log(`  Districts     : ${counts[1].toLocaleString()}`);
  console.log(`  Sub-districts : ${counts[2].toLocaleString()}`);
  console.log(`  Villages      : ${counts[3].toLocaleString()}`);
  console.log("==============================\n");
}

main()
  .catch((e) => { console.error("\nError:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());