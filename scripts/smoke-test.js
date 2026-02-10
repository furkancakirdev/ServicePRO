#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const requiredFiles = [
  "package.json",
  "next.config.js",
  "tsconfig.json",
  "prisma/schema.prisma",
  "app/layout.tsx",
];

const missing = requiredFiles.filter((file) =>
  !fs.existsSync(path.join(root, file))
);

if (missing.length > 0) {
  console.error("Smoke test failed. Missing files:", missing.join(", "));
  process.exit(1);
}

console.log("Smoke test passed.");
