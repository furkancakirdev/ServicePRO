-- Dynamic settings schema (backwards-compatible)

CREATE TABLE IF NOT EXISTS "servis_durumlari" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "color" TEXT NOT NULL,
  "icon" TEXT,
  "sirasi" INTEGER NOT NULL DEFAULT 0,
  "aktif" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "servis_durumlari_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "servis_durumlari_key_key" ON "servis_durumlari" ("key");
CREATE INDEX IF NOT EXISTS "servis_durumlari_aktif_sirasi_idx" ON "servis_durumlari" ("aktif", "sirasi");

CREATE TABLE IF NOT EXISTS "konumlar" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "adres" TEXT,
  "telefon" TEXT,
  "sirasi" INTEGER NOT NULL DEFAULT 0,
  "aktif" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "konumlar_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "konumlar_key_key" ON "konumlar" ("key");
CREATE INDEX IF NOT EXISTS "konumlar_aktif_sirasi_idx" ON "konumlar" ("aktif", "sirasi");

CREATE TABLE IF NOT EXISTS "personel_unvanlari" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "puanCarpani" DECIMAL(6,2) NOT NULL DEFAULT 1.0,
  "sirasi" INTEGER NOT NULL DEFAULT 0,
  "aktif" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "personel_unvanlari_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "personel_unvanlari_key_key" ON "personel_unvanlari" ("key");
CREATE INDEX IF NOT EXISTS "personel_unvanlari_aktif_sirasi_idx" ON "personel_unvanlari" ("aktif", "sirasi");

CREATE TABLE IF NOT EXISTS "system_settings" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "system_settings_key_key" ON "system_settings" ("key");
CREATE INDEX IF NOT EXISTS "system_settings_category_idx" ON "system_settings" ("category");

ALTER TABLE "personel" ADD COLUMN IF NOT EXISTS "unvan_id" TEXT;
ALTER TABLE "servis" ADD COLUMN IF NOT EXISTS "durum_id" TEXT;
ALTER TABLE "servis" ADD COLUMN IF NOT EXISTS "konum_id" TEXT;

CREATE INDEX IF NOT EXISTS "personel_unvan_id_idx" ON "personel" ("unvan_id");
CREATE INDEX IF NOT EXISTS "servis_durum_id_idx" ON "servis" ("durum_id");
CREATE INDEX IF NOT EXISTS "servis_konum_id_idx" ON "servis" ("konum_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'personel_unvan_id_fkey'
  ) THEN
    ALTER TABLE "personel"
      ADD CONSTRAINT "personel_unvan_id_fkey"
      FOREIGN KEY ("unvan_id") REFERENCES "personel_unvanlari"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'servis_durum_id_fkey'
  ) THEN
    ALTER TABLE "servis"
      ADD CONSTRAINT "servis_durum_id_fkey"
      FOREIGN KEY ("durum_id") REFERENCES "servis_durumlari"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'servis_konum_id_fkey'
  ) THEN
    ALTER TABLE "servis"
      ADD CONSTRAINT "servis_konum_id_fkey"
      FOREIGN KEY ("konum_id") REFERENCES "konumlar"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
