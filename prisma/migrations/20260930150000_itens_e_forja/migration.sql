-- Itens (material e consumível), mochila, refino da forja, e o espaço de
-- arma com nome genérico. Ver prisma/catalog/itens.js e a forja.
-- CreateEnum
CREATE TYPE "TipoDeItem" AS ENUM ('MATERIAL', 'CONSUMIVEL');

-- AlterEnum
-- RENAME VALUE, e não o recriar-e-converter que o Prisma gera: a conversão
-- por texto falharia em toda peça já comprada com o valor antigo.
ALTER TYPE "EquipmentSlot" RENAME VALUE 'ZANPAKUTO' TO 'ARMA';

-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN     "naLoja" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "UserEquipment" ADD COLUMN     "refino" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "tipo" "TipoDeItem" NOT NULL,
    "raridade" "EquipmentRarity" NOT NULL DEFAULT 'COMUM',
    "marca" TEXT NOT NULL,
    "preco" INTEGER,
    "efeito" JSONB,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UserItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Item_nome_key" ON "Item"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "UserItem_userId_itemId_key" ON "UserItem"("userId", "itemId");

-- AddForeignKey
ALTER TABLE "UserItem" ADD CONSTRAINT "UserItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserItem" ADD CONSTRAINT "UserItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

