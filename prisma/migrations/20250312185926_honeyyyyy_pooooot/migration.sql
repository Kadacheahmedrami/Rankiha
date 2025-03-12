-- CreateTable
CREATE TABLE "HoneypotLog" (
    "id" SERIAL NOT NULL,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "url" TEXT,
    "headers" JSONB,
    "email" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HoneypotLog_pkey" PRIMARY KEY ("id")
);
