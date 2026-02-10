#!/usr/bin/env node

/**
 * Frontend + Sync regression checks
 *
 * Validates:
 * 1) /api/services field contract
 * 2) Column-shift heuristics (tekneAdi/yer)
 * 3) Date diversity (not all same date)
 * 4) /api/stats consistency vs DB
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const API_URL = process.env.API_URL || "http://localhost:3000";
const TEST_EMAIL = process.env.TEST_EMAIL || "admin@servicepro.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "admin123";

const REQUIRED_FIELDS = [
  "id",
  "tarih",
  "tekneAdi",
  "servisAciklamasi",
  "yer",
  "durum",
];

const LOCATION_TOKENS = [
  "MARINA",
  "YATMARIN",
  "ALBATROS",
  "NETSEL",
  "KARA",
  "LIMAN",
  "PIER",
  "DOCK",
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isLikelyLocation(value) {
  const text = String(value || "").toUpperCase();
  return LOCATION_TOKENS.some((token) => text.includes(token));
}

function toDateKey(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

async function loginAndGetToken() {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.token) {
    throw new Error(`Auth failed for regression test: ${res.status} ${JSON.stringify(body)}`);
  }
  return body.token;
}

async function getJson(path, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${API_URL}${path}`, { headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Request failed ${path}: ${res.status} ${body}`);
  }
  return res.json();
}

async function run() {
  console.log("Running frontend+sync regression checks...");

  const token = await loginAndGetToken();
  const servicesPayload = await getJson("/api/services?limit=3000", token);
  const statsPayload = await getJson("/api/stats", token);
  const services = Array.isArray(servicesPayload.services) ? servicesPayload.services : [];

  assert(services.length > 0, "No services returned from /api/services");

  const first = services[0];
  const missing = REQUIRED_FIELDS.filter((field) => !(field in first));
  assert(missing.length === 0, `Missing fields in /api/services: ${missing.join(", ")}`);

  const sample = services.slice(0, Math.min(500, services.length));
  const tekneLooksLikeLocation = sample.filter((s) => isLikelyLocation(s.tekneAdi)).length;
  const locationInTekneRatio = tekneLooksLikeLocation / sample.length;
  assert(
    locationInTekneRatio < 0.2,
    `Column shift suspect: ${Math.round(locationInTekneRatio * 100)}% tekneAdi looks like location`
  );

  const validDateKeys = services.map((s) => toDateKey(s.tarih)).filter(Boolean);
  const uniqueDateCount = new Set(validDateKeys).size;
  assert(uniqueDateCount > 10, `Date diversity too low: unique dates=${uniqueDateCount}`);

  const dbTodayStart = new Date();
  dbTodayStart.setHours(0, 0, 0, 0);
  const dbTodayEnd = new Date();
  dbTodayEnd.setHours(23, 59, 59, 999);

  const [dbTodayCount, dbBekleyenCount] = await Promise.all([
    prisma.service.count({
      where: {
        deletedAt: null,
        tarih: { gte: dbTodayStart, lte: dbTodayEnd },
      },
    }),
    prisma.service.count({
      where: {
        deletedAt: null,
        durum: {
          in: [
            "RANDEVU_VERILDI",
            "PARCA_BEKLIYOR",
            "MUSTERI_ONAY_BEKLIYOR",
            "RAPOR_BEKLIYOR",
            "KESIF_KONTROL",
          ],
        },
      },
    }),
  ]);

  assert(
    Number(statsPayload.bugunServisler) === dbTodayCount,
    `Stats mismatch: bugunServisler api=${statsPayload.bugunServisler} db=${dbTodayCount}`
  );
  assert(
    Number(statsPayload.bekleyenServisler) === dbBekleyenCount,
    `Stats mismatch: bekleyenServisler api=${statsPayload.bekleyenServisler} db=${dbBekleyenCount}`
  );

  console.log("PASS");
  console.log(
    JSON.stringify(
      {
        totalServices: services.length,
        uniqueDateCount,
        locationInTekneRatio: Number(locationInTekneRatio.toFixed(3)),
        bugunServisler: statsPayload.bugunServisler,
        bekleyenServisler: statsPayload.bekleyenServisler,
      },
      null,
      2
    )
  );
}

run()
  .catch((err) => {
    console.error("FAIL:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
