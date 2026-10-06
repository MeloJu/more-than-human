import { notFound } from 'next/navigation'
import { requireUser } from '@/app/lib/session'

/**
 * A porta da área de admin: conta logada E com papel ADMIN.
 *
 * Quem não é admin recebe 404, não "acesso negado": a área não anuncia que
 * existe. A conferência mora no servidor — em cada página E em cada action,
 * porque action é alcançável por POST direto, sem passar pela página.
 *
 * O papel muda pela linha de comando na VM (npm run admin:promover), nunca
 * pela própria área de admin: ninguém se promove por um botão.
 */
export async function requireAdmin() {
  const user = await requireUser()
  if (user.role !== 'ADMIN') notFound()
  return user
}
