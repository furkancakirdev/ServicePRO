-- ServiceTitan pattern Sprint 5: Pricebook Lite + Templates foundation

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'PricebookItemType'
  ) THEN
    CREATE TYPE "PricebookItemType" AS ENUM (
      'HIZMET',
      'MALZEME',
      'PAKET'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "pricebook_category" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL DEFAULT 'org_default',
  "ad" TEXT NOT NULL,
  "parent_id" TEXT,
  "sira" INTEGER NOT NULL DEFAULT 0,
  "aktif" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pricebook_category_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "pricebook_category_aktif_idx" ON "pricebook_category" ("aktif");
CREATE INDEX IF NOT EXISTS "pricebook_category_parent_id_idx" ON "pricebook_category" ("parent_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pricebook_category_parent_id_fkey'
  ) THEN
    ALTER TABLE "pricebook_category"
      ADD CONSTRAINT "pricebook_category_parent_id_fkey"
      FOREIGN KEY ("parent_id") REFERENCES "pricebook_category"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "pricebook_item" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL DEFAULT 'org_default',
  "tip" "PricebookItemType" NOT NULL,
  "kod" TEXT,
  "ad" TEXT NOT NULL,
  "aciklama" TEXT,
  "birim" TEXT,
  "varsayilan_sure_saat" DECIMAL(10,2),
  "varsayilan_fiyat" DECIMAL(12,2),
  "maliyet" DECIMAL(12,2),
  "category_id" TEXT,
  "aktif" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pricebook_item_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "pricebook_item_kod_key" ON "pricebook_item" ("kod");
CREATE INDEX IF NOT EXISTS "pricebook_item_tip_idx" ON "pricebook_item" ("tip");
CREATE INDEX IF NOT EXISTS "pricebook_item_aktif_idx" ON "pricebook_item" ("aktif");
CREATE INDEX IF NOT EXISTS "pricebook_item_category_id_idx" ON "pricebook_item" ("category_id");
CREATE INDEX IF NOT EXISTS "pricebook_item_ad_idx" ON "pricebook_item" ("ad");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pricebook_item_category_id_fkey'
  ) THEN
    ALTER TABLE "pricebook_item"
      ADD CONSTRAINT "pricebook_item_category_id_fkey"
      FOREIGN KEY ("category_id") REFERENCES "pricebook_category"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "job_template" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL DEFAULT 'org_default',
  "ad" TEXT NOT NULL,
  "aciklama" TEXT,
  "aktif" BOOLEAN NOT NULL DEFAULT true,
  "default_status" TEXT,
  "default_notlar" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "job_template_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "job_template_aktif_idx" ON "job_template" ("aktif");

CREATE TABLE IF NOT EXISTS "job_template_item" (
  "id" TEXT NOT NULL,
  "template_id" TEXT NOT NULL,
  "pricebook_item_id" TEXT,
  "ad" TEXT NOT NULL,
  "miktar" DECIMAL(12,3) NOT NULL DEFAULT 1.0,
  "birim_fiyat" DECIMAL(12,2) NOT NULL,
  "sira" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "job_template_item_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "job_template_item_template_id_idx" ON "job_template_item" ("template_id");
CREATE INDEX IF NOT EXISTS "job_template_item_pricebook_item_id_idx" ON "job_template_item" ("pricebook_item_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_template_item_template_id_fkey'
  ) THEN
    ALTER TABLE "job_template_item"
      ADD CONSTRAINT "job_template_item_template_id_fkey"
      FOREIGN KEY ("template_id") REFERENCES "job_template"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_template_item_pricebook_item_id_fkey'
  ) THEN
    ALTER TABLE "job_template_item"
      ADD CONSTRAINT "job_template_item_pricebook_item_id_fkey"
      FOREIGN KEY ("pricebook_item_id") REFERENCES "pricebook_item"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "job_line_item" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL DEFAULT 'org_default',
  "servis_id" TEXT NOT NULL,
  "pricebook_item_id" TEXT,
  "ad" TEXT NOT NULL,
  "miktar" DECIMAL(12,3) NOT NULL DEFAULT 1.0,
  "birim_fiyat" DECIMAL(12,2) NOT NULL,
  "toplam" DECIMAL(14,2) NOT NULL,
  "notlar" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "job_line_item_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "job_line_item_servis_id_idx" ON "job_line_item" ("servis_id");
CREATE INDEX IF NOT EXISTS "job_line_item_pricebook_item_id_idx" ON "job_line_item" ("pricebook_item_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_line_item_servis_id_fkey'
  ) THEN
    ALTER TABLE "job_line_item"
      ADD CONSTRAINT "job_line_item_servis_id_fkey"
      FOREIGN KEY ("servis_id") REFERENCES "servis"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_line_item_pricebook_item_id_fkey'
  ) THEN
    ALTER TABLE "job_line_item"
      ADD CONSTRAINT "job_line_item_pricebook_item_id_fkey"
      FOREIGN KEY ("pricebook_item_id") REFERENCES "pricebook_item"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
