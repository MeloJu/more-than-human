-- CreateEnum
CREATE TYPE "StatusDaRaid" AS ENUM ('ATIVA', 'VENCIDA', 'PERDIDA');

-- DropForeignKey
ALTER TABLE "BattleParticipant" DROP CONSTRAINT "BattleParticipant_characterId_fkey";

-- AlterTable
ALTER TABLE "BattleParticipant" ADD COLUMN     "monsterId" TEXT,
ALTER COLUMN "characterId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Battle" ADD COLUMN     "andar" INTEGER,
ADD COLUMN     "raidRunId" TEXT;

-- CreateTable
CREATE TABLE "RaidRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userCharacterId" TEXT NOT NULL,
    "raid" TEXT NOT NULL,
    "andar" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusDaRaid" NOT NULL DEFAULT 'ATIVA',
    "contratados" JSONB NOT NULL,
    "reservas" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaidRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RaidRun_userCharacterId_status_idx" ON "RaidRun"("userCharacterId", "status");

-- CreateIndex
CREATE INDEX "Battle_raidRunId_idx" ON "Battle"("raidRunId");

-- AddForeignKey
ALTER TABLE "RaidRun" ADD CONSTRAINT "RaidRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidRun" ADD CONSTRAINT "RaidRun_userCharacterId_fkey" FOREIGN KEY ("userCharacterId") REFERENCES "UserCharacter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleParticipant" ADD CONSTRAINT "BattleParticipant_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleParticipant" ADD CONSTRAINT "BattleParticipant_monsterId_fkey" FOREIGN KEY ("monsterId") REFERENCES "Monster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_raidRunId_fkey" FOREIGN KEY ("raidRunId") REFERENCES "RaidRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

