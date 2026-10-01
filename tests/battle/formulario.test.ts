import { describe, it, expect } from 'vitest'
import { alvoDoFormulario, posturaDoFormulario } from '@/app/lib/battle/formulario'

const form = (campos: Record<string, string>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(campos)) f.set(k, v)
  return f
}

describe('posturaDoFormulario', () => {
  it('aceita as cinco posturas', () => {
    for (const p of ['NEUTRA', 'ESQUIVA', 'APARAR', 'GUARDA', 'IMPETO']) {
      expect(posturaDoFormulario(form({ postura: p }))).toBe(p)
    }
  })

  it('valor desconhecido ou ausente vira a neutra', () => {
    expect(posturaDoFormulario(form({ postura: 'VOAR' }))).toBe('NEUTRA')
    expect(posturaDoFormulario(form({}))).toBe('NEUTRA')
    expect(posturaDoFormulario(undefined)).toBe('NEUTRA')
  })
})

describe('alvoDoFormulario', () => {
  it('aceita um índice dentro do outro lado', () => {
    expect(alvoDoFormulario(form({ alvo: '0' }), 3)).toBe(0)
    expect(alvoDoFormulario(form({ alvo: '2' }), 3)).toBe(2)
  })

  it('fora do intervalo, quebrado ou ausente vira undefined (o motor escolhe)', () => {
    expect(alvoDoFormulario(form({ alvo: '3' }), 3)).toBeUndefined()
    expect(alvoDoFormulario(form({ alvo: '-1' }), 3)).toBeUndefined()
    expect(alvoDoFormulario(form({ alvo: '1.5' }), 3)).toBeUndefined()
    expect(alvoDoFormulario(form({ alvo: 'x' }), 3)).toBeUndefined()
    expect(alvoDoFormulario(form({}), 3)).toBeUndefined()
    expect(alvoDoFormulario(undefined, 3)).toBeUndefined()
  })
})
