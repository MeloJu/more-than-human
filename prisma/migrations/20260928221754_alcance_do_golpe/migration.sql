-- CreateEnum
CREATE TYPE "Alcance" AS ENUM ('CORPO', 'DISTANCIA', 'AREA');

-- AlterTable
ALTER TABLE "Skill" ADD COLUMN     "alcance" "Alcance";
