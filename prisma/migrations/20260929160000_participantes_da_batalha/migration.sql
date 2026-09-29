-- CreateTable
CREATE TABLE "BattleParticipant" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "lado" "ActorSide" NOT NULL,
    "posicao" INTEGER NOT NULL,
    "characterId" TEXT NOT NULL,
    "nivel" INTEGER NOT NULL,
    "custo" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BattleParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BattleParticipant_characterId_idx" ON "BattleParticipant"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "BattleParticipant_battleId_lado_posicao_key" ON "BattleParticipant"("battleId", "lado", "posicao");

-- AddForeignKey
ALTER TABLE "BattleParticipant" ADD CONSTRAINT "BattleParticipant_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "Battle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleParticipant" ADD CONSTRAINT "BattleParticipant_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

