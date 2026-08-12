-- AlterTable
ALTER TABLE "abandoned_carts" ADD COLUMN     "optIn" BOOLEAN NOT NULL DEFAULT false;

-- Registros existentes foram criados sem consentimento explícito, então ficam
-- com optIn = false e deixam de receber lembrete. Preferir não enviar a enviar
-- sem base legal.
