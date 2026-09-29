import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/app/lib/session'
import { resolveErrorMessage } from '@/app/lib/error-messages'
import { registerAction } from '@/app/lib/auth-actions'
import { MIN_PASSWORD_LENGTH } from '@/app/lib/auth-helpers'

const REGISTER_ERROR_MESSAGES: Record<string, string> = {
  missing_fields: 'Preencha todos os campos.',
  weak_password: `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
  already_exists: 'Username ou email já está em uso.',
}

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  // Same reasoning as login/page.tsx: check the real session, not just
  // whether a (possibly stale) cookie happens to be present.
  const existingUser = await getCurrentUser()
  if (existingUser) redirect('/dashboard')

  const { error } = await searchParams
  const errorMessage = resolveErrorMessage(REGISTER_ERROR_MESSAGES, error, 'Ocorreu um erro.')

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-4">Create your account</h1>
      {errorMessage && (
        <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">{errorMessage}</div>
      )}
      <form action={registerAction} className="card p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Username</label>
          <input name="username" className="w-full rounded-md border border-border px-3 py-2 bg-surface" placeholder="yourname" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input type="email" name="email" className="w-full rounded-md border border-border px-3 py-2 bg-surface" placeholder="you@example.com" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input type="password" name="password" minLength={MIN_PASSWORD_LENGTH} className="w-full rounded-md border border-border px-3 py-2 bg-surface" />
        </div>
        <div className="pt-2">
          <button type="submit" className="btn-primary rounded-md px-4 py-2 text-sm">Register</button>
        </div>
      </form>
    </main>
  )
}
