/*
  Warnings:

  - Added the required column `eventType` to the `Log` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Log" ADD COLUMN     "eventType" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."Room" ADD COLUMN     "candidateId" INTEGER;
