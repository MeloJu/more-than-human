import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/app/lib/session'
import { resolveErrorMessage } from '@/app/lib/error-messages'
import { loginAction } from '@/app/lib/auth-actions'
import { sanitizeRedirectTarget } from '@/app/lib/auth-helpers'

const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  missing_fields: 'Preencha usuário/email e senha.',
  invalid_credentials: 'Usuário/email ou senha incorretos.',
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; redirect?: string }> }) {
  // A real DB-backed check, not middleware's cookie-presence guess - a stale
  // cookie (expired, revoked, or left over from a wiped Session table)
  // must not trap a visitor out of their own login page.
  const existingUser = await getCurrentUser()
  if (existingUser) redirect('/dashboard')

  const { error, redirect: redirectParam } = await searchParams
  const errorMessage = resolveErrorMessage(LOGIN_ERROR_MESSAGES, error, 'Ocorreu um erro.')
  const redirectTo = sanitizeRedirectTarget(redirectParam ?? '/select')

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-4">Entrar</h1>
      {errorMessage && (
        <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">{errorMessage}</div>
      )}
      <form action={loginAction} className="card p-6 space-y-4">
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <div>
          <label className="block text-sm font-medium mb-1">Usuário ou e-mail</label>
          <input name="id" className="w-full rounded-md border border-border px-3 py-2 bg-surface" placeholder="seunome ou voce@exemplo.com" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Senha</label>
          <input type="password" name="password" className="w-full rounded-md border border-border px-3 py-2 bg-surface" />
        </div>
        <div className="pt-2 flex items-center gap-2">
          <button type="submit" className="btn-primary rounded-md px-4 py-2 text-sm">Entrar</button>
          <a href="/register" className="text-sm underline">Criar uma conta</a>
        </div>
      </form>
    </main>
  )
}
