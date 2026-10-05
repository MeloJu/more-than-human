-- Recompensa diária: o último resgate e o dia da sequência de 7.
ALTER TABLE "User" ADD COLUMN "ultimoResgate" TIMESTAMP(3),
ADD COLUMN "sequenciaDiaria" INTEGER NOT NULL DEFAULT 0;
