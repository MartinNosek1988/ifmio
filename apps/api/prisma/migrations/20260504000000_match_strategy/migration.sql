-- B1: MatchStrategy enum + field on Property
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MatchStrategy') THEN
    CREATE TYPE "MatchStrategy" AS ENUM ('OLDEST_FIRST', 'SAME_MONTH', 'EXACT_AMOUNT');
  END IF;
END $$;

ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "matchStrategy" "MatchStrategy" NOT NULL DEFAULT 'OLDEST_FIRST';
