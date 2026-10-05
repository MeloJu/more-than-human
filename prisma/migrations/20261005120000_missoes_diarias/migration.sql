-- Missões diárias: só o resgate é gravado; as missões do dia são sorteadas.
CREATE TABLE "MissaoResgatada" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dia" TIMESTAMP(3) NOT NULL,
    "missaoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissaoResgatada_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MissaoResgatada_userId_dia_missaoId_key" ON "MissaoResgatada"("userId", "dia", "missaoId");

ALTER TABLE "MissaoResgatada" ADD CONSTRAINT "MissaoResgatada_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
