-- CreateTable
CREATE TABLE "email_flow_steps" (
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_flow_steps_pkey" PRIMARY KEY ("key")
);

