-- ServiceTitan pattern Sprint 4: Alert Rules + Notification Center foundation

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'NotificationChannel'
  ) THEN
    CREATE TYPE "NotificationChannel" AS ENUM (
      'IN_APP',
      'EMAIL',
      'SMS'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'NotificationStatus'
  ) THEN
    CREATE TYPE "NotificationStatus" AS ENUM (
      'YENI',
      'OKUNDU',
      'ARSIV'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "alert_rule" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL DEFAULT 'org_default',
  "ad" TEXT NOT NULL,
  "aktif" BOOLEAN NOT NULL DEFAULT true,
  "event_tipi" TEXT NOT NULL,
  "kosul_json" TEXT NOT NULL,
  "hedef_rol" "UserRole",
  "hedef_user_id" TEXT,
  "kanal" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "alert_rule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "alert_rule_aktif_idx" ON "alert_rule" ("aktif");
CREATE INDEX IF NOT EXISTS "alert_rule_event_tipi_idx" ON "alert_rule" ("event_tipi");
CREATE INDEX IF NOT EXISTS "alert_rule_hedef_user_id_idx" ON "alert_rule" ("hedef_user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'alert_rule_hedef_user_id_fkey'
  ) THEN
    ALTER TABLE "alert_rule"
      ADD CONSTRAINT "alert_rule_hedef_user_id_fkey"
      FOREIGN KEY ("hedef_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "notification" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL DEFAULT 'org_default',
  "user_id" TEXT NOT NULL,
  "baslik" TEXT NOT NULL,
  "mesaj" TEXT NOT NULL,
  "entity_tipi" TEXT,
  "entity_id" TEXT,
  "action_url" TEXT,
  "status" "NotificationStatus" NOT NULL DEFAULT 'YENI',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "read_at" TIMESTAMP(3),
  CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "notification_user_id_idx" ON "notification" ("user_id");
CREATE INDEX IF NOT EXISTS "notification_status_idx" ON "notification" ("status");
CREATE INDEX IF NOT EXISTS "notification_created_at_idx" ON "notification" ("created_at");
CREATE INDEX IF NOT EXISTS "notification_user_id_status_idx" ON "notification" ("user_id", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notification_user_id_fkey'
  ) THEN
    ALTER TABLE "notification"
      ADD CONSTRAINT "notification_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
