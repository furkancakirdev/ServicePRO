-- ServiceTitan pattern Sprint 3: Call Booking + Leads foundation

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'BookingStatus'
  ) THEN
    CREATE TYPE "BookingStatus" AS ENUM (
      'YENI',
      'ISLEMDE',
      'JOB_OLUSTURULDU',
      'LEAD_OLUSTURULDU',
      'REDDEDILDI'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'LeadStatus'
  ) THEN
    CREATE TYPE "LeadStatus" AS ENUM (
      'YENI',
      'TAKIPTE',
      'TEKLIF_BEKLIYOR',
      'KAYBEDILDI',
      'KAZANILDI'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "lead" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL DEFAULT 'org_default',
  "kaynak" TEXT,
  "ad" TEXT,
  "telefon" TEXT,
  "email" TEXT,
  "konu" TEXT,
  "notlar" TEXT,
  "status" "LeadStatus" NOT NULL DEFAULT 'YENI',
  "takip_at" TIMESTAMP(3),
  "tekne_id" TEXT,
  "owner_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "lead_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "lead_status_idx" ON "lead" ("status");
CREATE INDEX IF NOT EXISTS "lead_takip_at_idx" ON "lead" ("takip_at");
CREATE INDEX IF NOT EXISTS "lead_owner_user_id_idx" ON "lead" ("owner_user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lead_tekne_id_fkey'
  ) THEN
    ALTER TABLE "lead"
      ADD CONSTRAINT "lead_tekne_id_fkey"
      FOREIGN KEY ("tekne_id") REFERENCES "tekne"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lead_owner_user_id_fkey'
  ) THEN
    ALTER TABLE "lead"
      ADD CONSTRAINT "lead_owner_user_id_fkey"
      FOREIGN KEY ("owner_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "booking" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL DEFAULT 'org_default',
  "kaynak" TEXT,
  "arayan_ad" TEXT,
  "telefon" TEXT,
  "email" TEXT,
  "tekne_ad" TEXT,
  "tekne_seri_no" TEXT,
  "konu" TEXT,
  "notlar" TEXT,
  "tercih_tarih" TIMESTAMP(3),
  "tercih_saat_araligi" TEXT,
  "status" "BookingStatus" NOT NULL DEFAULT 'YENI',
  "tekne_id" TEXT,
  "servis_id" TEXT,
  "lead_id" TEXT,
  "owner_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "booking_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "booking_status_idx" ON "booking" ("status");
CREATE INDEX IF NOT EXISTS "booking_telefon_idx" ON "booking" ("telefon");
CREATE INDEX IF NOT EXISTS "booking_owner_user_id_idx" ON "booking" ("owner_user_id");
CREATE INDEX IF NOT EXISTS "booking_created_at_idx" ON "booking" ("created_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'booking_tekne_id_fkey'
  ) THEN
    ALTER TABLE "booking"
      ADD CONSTRAINT "booking_tekne_id_fkey"
      FOREIGN KEY ("tekne_id") REFERENCES "tekne"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'booking_servis_id_fkey'
  ) THEN
    ALTER TABLE "booking"
      ADD CONSTRAINT "booking_servis_id_fkey"
      FOREIGN KEY ("servis_id") REFERENCES "servis"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'booking_lead_id_fkey'
  ) THEN
    ALTER TABLE "booking"
      ADD CONSTRAINT "booking_lead_id_fkey"
      FOREIGN KEY ("lead_id") REFERENCES "lead"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'booking_owner_user_id_fkey'
  ) THEN
    ALTER TABLE "booking"
      ADD CONSTRAINT "booking_owner_user_id_fkey"
      FOREIGN KEY ("owner_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;