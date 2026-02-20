-- Dispatch board preferences (user-scoped)

CREATE TABLE IF NOT EXISTS "dispatch_preference" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL DEFAULT 'org_default',
  "user_id" TEXT NOT NULL,
  "varsayilan_gorunum" TEXT NOT NULL DEFAULT 'DAY',
  "gosterilen_personel_ids" TEXT,
  "yogun_mod" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "dispatch_preference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "dispatch_preference_user_id_key"
  ON "dispatch_preference" ("user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dispatch_preference_user_id_fkey'
  ) THEN
    ALTER TABLE "dispatch_preference"
      ADD CONSTRAINT "dispatch_preference_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
