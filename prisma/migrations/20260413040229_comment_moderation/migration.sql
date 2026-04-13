/*
  Warnings:

  - Added the required column `updatedAt` to the `BlogComment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."CommentStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "public"."BlogComment" ADD COLUMN     "moderatedAt" TIMESTAMP(3),
ADD COLUMN     "status" "public"."CommentStatus" NOT NULL DEFAULT 'pending',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
