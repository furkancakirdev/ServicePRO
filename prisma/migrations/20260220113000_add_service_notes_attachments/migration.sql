-- Add work-order notes and attachments tables

CREATE TABLE IF NOT EXISTS "servis_not" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL DEFAULT 'org_default',
  "servis_id" TEXT NOT NULL,
  "metin" TEXT NOT NULL,
  "olusturan_user_id" TEXT,
  "olusturan_email" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "servis_not_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "servis_not_servis_id_created_at_idx" ON "servis_not" ("servis_id", "created_at");
CREATE INDEX IF NOT EXISTS "servis_not_olusturan_user_id_idx" ON "servis_not" ("olusturan_user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'servis_not_servis_id_fkey'
  ) THEN
    ALTER TABLE "servis_not"
      ADD CONSTRAINT "servis_not_servis_id_fkey"
      FOREIGN KEY ("servis_id") REFERENCES "servis"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'servis_not_olusturan_user_id_fkey'
  ) THEN
    ALTER TABLE "servis_not"
      ADD CONSTRAINT "servis_not_olusturan_user_id_fkey"
      FOREIGN KEY ("olusturan_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "servis_ek" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL DEFAULT 'org_default',
  "servis_id" TEXT NOT NULL,
  "dosya_adi" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "dosya_boyutu" INTEGER NOT NULL,
  "icerik" BYTEA NOT NULL,
  "olusturan_user_id" TEXT,
  "olusturan_email" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "servis_ek_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "servis_ek_servis_id_created_at_idx" ON "servis_ek" ("servis_id", "created_at");
CREATE INDEX IF NOT EXISTS "servis_ek_olusturan_user_id_idx" ON "servis_ek" ("olusturan_user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'servis_ek_servis_id_fkey'
  ) THEN
    ALTER TABLE "servis_ek"
      ADD CONSTRAINT "servis_ek_servis_id_fkey"
      FOREIGN KEY ("servis_id") REFERENCES "servis"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'servis_ek_olusturan_user_id_fkey'
  ) THEN
    ALTER TABLE "servis_ek"
      ADD CONSTRAINT "servis_ek_olusturan_user_id_fkey"
      FOREIGN KEY ("olusturan_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
