-- Add display name to PlayerStats (leaderboard name)
ALTER TABLE "PlayerStats" ADD COLUMN "displayName" TEXT NOT NULL DEFAULT 'Anonymous';
