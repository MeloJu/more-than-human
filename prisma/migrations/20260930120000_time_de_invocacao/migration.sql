-- O time que um treinador (o Red) leva para a luta: ids das invocações do
-- catálogo em código (app/lib/battle/invocacoes.ts). Nulo = time padrão.
ALTER TABLE "UserCharacter" ADD COLUMN "timeDeInvocacao" JSONB;
