-- CreateEnum
CREATE TYPE "public"."Status" AS ENUM ('ACTIVE', 'ONGOING', 'COMPLETED');

-- AlterTable
ALTER TABLE "public"."Room" ADD COLUMN     "status" "public"."Status" NOT NULL DEFAULT 'ACTIVE';
