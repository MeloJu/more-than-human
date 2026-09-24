-- Cor secundária por personagem.
--
-- Escrita à mão pelo mesmo motivo das anteriores: prisma migrate dev quer
-- recriar o banco, e aqui existe jogador.
--
-- Serve ao CONFRONTO: quando os dois lados têm primárias quase iguais
-- (Ichigo e Jean Grey, laranja e amarelo a 10 graus de matiz), o adversário
-- troca para a secundária dele, tirada da própria arte. Nulável: metade do
-- elenco não tem uma, e esses caem numa cor de contraste do tema.
ALTER TABLE "Character" ADD COLUMN "corSecundaria" TEXT;
