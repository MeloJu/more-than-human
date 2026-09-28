-- Toda forma passa a cobrar stamina na ativação e energia e stamina por
-- rodada. Os valores vêm do catálogo (catalog:sync); aqui só nascem as colunas.
ALTER TABLE "Transformation" ADD COLUMN "activationStaminaCost" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Transformation" ADD COLUMN "drainStaminaPerTurn" INTEGER NOT NULL DEFAULT 0;

-- Contagem de redistribuições de atributo: a primeira é de graça.
ALTER TABLE "UserCharacter" ADD COLUMN "redistribuicoes" INTEGER NOT NULL DEFAULT 0;
