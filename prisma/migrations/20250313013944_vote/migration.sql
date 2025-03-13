/*
  Warnings:

  - You are about to drop the column `downvotes` on the `posts` table. All the data in the column will be lost.
  - You are about to drop the column `upvotes` on the `posts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "posts" DROP COLUMN "downvotes",
DROP COLUMN "upvotes",
ADD COLUMN     "votes" INTEGER NOT NULL DEFAULT 0;
