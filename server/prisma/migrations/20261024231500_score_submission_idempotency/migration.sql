CREATE TABLE "ScoreSubmission" (
    "userId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreSubmission_pkey" PRIMARY KEY ("userId", "submissionId")
);

CREATE INDEX "ScoreSubmission_createdAt_idx" ON "ScoreSubmission"("createdAt");

ALTER TABLE "ScoreSubmission"
ADD CONSTRAINT "ScoreSubmission_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
