-- Add blocking reason dictionary table

CREATE TABLE IF NOT EXISTS "blokaj_nedenleri" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "durum_key" TEXT NOT NULL,
  "sirasi" INTEGER NOT NULL DEFAULT 0,
  "aktif" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "blokaj_nedenleri_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "blokaj_nedenleri_key_key" ON "blokaj_nedenleri" ("key");
CREATE INDEX IF NOT EXISTS "blokaj_nedenleri_aktif_sirasi_idx" ON "blokaj_nedenleri" ("aktif", "sirasi");
CREATE INDEX IF NOT EXISTS "blokaj_nedenleri_durum_key_idx" ON "blokaj_nedenleri" ("durum_key");
