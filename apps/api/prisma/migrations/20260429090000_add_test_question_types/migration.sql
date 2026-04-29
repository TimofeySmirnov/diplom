-- Extend test question types and answer payload storage
ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'FREE_TEXT';
ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'MATCHING';
ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'ORDERING';

ALTER TABLE "TestQuestion"
  ADD COLUMN "freeTextAcceptedAnswers" JSONB,
  ADD COLUMN "matchingPairs" JSONB,
  ADD COLUMN "orderingItems" JSONB;

ALTER TABLE "TestAttemptAnswer"
  ADD COLUMN "textAnswer" TEXT,
  ADD COLUMN "matchingAnswer" JSONB,
  ADD COLUMN "orderingAnswer" JSONB;
