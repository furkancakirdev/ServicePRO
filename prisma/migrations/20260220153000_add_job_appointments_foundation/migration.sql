-- ServiceTitan pattern foundation: Job(App Service alias) + Appointment table

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'AppointmentStatus'
  ) THEN
    CREATE TYPE "AppointmentStatus" AS ENUM (
      'PLANLANDI',
      'ONAY_BEKLIYOR',
      'ONAYLANDI',
      'YOLDA',
      'VARIS',
      'BASLADI',
      'TAMAMLANDI',
      'IPTAL',
      'ERTELENDI'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "appointment" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL DEFAULT 'org_default',
  "servis_id" TEXT NOT NULL,
  "personel_id" TEXT,
  "baslangic_at" TIMESTAMP(3) NOT NULL,
  "bitis_at" TIMESTAMP(3) NOT NULL,
  "status" "AppointmentStatus" NOT NULL DEFAULT 'PLANLANDI',
  "confirmed_at" TIMESTAMP(3),
  "confirmed_by_id" TEXT,
  "notlar" TEXT,
  "sira" INTEGER NOT NULL DEFAULT 0,
  "kilitli" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "appointment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "appointment_servis_id_idx" ON "appointment" ("servis_id");
CREATE INDEX IF NOT EXISTS "appointment_personel_id_idx" ON "appointment" ("personel_id");
CREATE INDEX IF NOT EXISTS "appointment_baslangic_at_idx" ON "appointment" ("baslangic_at");
CREATE INDEX IF NOT EXISTS "appointment_status_idx" ON "appointment" ("status");
CREATE INDEX IF NOT EXISTS "appointment_personel_id_baslangic_at_bitis_at_idx"
  ON "appointment" ("personel_id", "baslangic_at", "bitis_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointment_servis_id_fkey'
  ) THEN
    ALTER TABLE "appointment"
      ADD CONSTRAINT "appointment_servis_id_fkey"
      FOREIGN KEY ("servis_id") REFERENCES "servis"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointment_personel_id_fkey'
  ) THEN
    ALTER TABLE "appointment"
      ADD CONSTRAINT "appointment_personel_id_fkey"
      FOREIGN KEY ("personel_id") REFERENCES "personel"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointment_confirmed_by_id_fkey'
  ) THEN
    ALTER TABLE "appointment"
      ADD CONSTRAINT "appointment_confirmed_by_id_fkey"
      FOREIGN KEY ("confirmed_by_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
