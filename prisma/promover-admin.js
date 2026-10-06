// Dá (ou tira) o papel ADMIN de uma conta, pela linha de comando.
//
// De propósito NÃO existe botão para isso na área de admin: quem vira admin
// é decidido por quem tem acesso à VM, nunca por um clique no site.
//
// Uso (na VM):
//   docker compose -f docker-compose.prod.yml exec app npm run admin:promover -- <username>
//   docker compose -f docker-compose.prod.yml exec app npm run admin:promover -- <username> --tirar
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const [username, flag] = process.argv.slice(2);
  if (!username) {
    console.error('Uso: npm run admin:promover -- <username> [--tirar]');
    process.exitCode = 1;
    return;
  }
  const role = flag === '--tirar' ? 'USER' : 'ADMIN';
  const conta = await prisma.user.findUnique({ where: { username }, select: { id: true, role: true } });
  if (!conta) {
    console.error(`Nenhuma conta com o username "${username}".`);
    process.exitCode = 1;
    return;
  }
  if (conta.role === role) {
    console.log(`"${username}" já é ${role}. Nada mudou.`);
    return;
  }
  await prisma.user.update({ where: { id: conta.id }, data: { role } });
  console.log(`"${username}": ${conta.role} -> ${role}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
