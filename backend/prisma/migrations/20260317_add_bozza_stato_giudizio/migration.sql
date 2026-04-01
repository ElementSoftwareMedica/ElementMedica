-- AlterEnum: add BOZZA to stato_giudizio enum
ALTER TYPE "stato_giudizio" ADD VALUE IF NOT EXISTS 'BOZZA' BEFORE 'VALIDO';
