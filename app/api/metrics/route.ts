import { registroDeMetricas } from '@/app/lib/metricas'

// O endpoint que o Prometheus lê, de dentro da rede do docker compose
// (app:3000/api/metrics). NÃO é público: o Caddy responde 404 para
// /api/metrics vindo da internet (ver deploy/Caddyfile), e a porta do app
// não é exposta no host. Ver app/lib/metricas.ts para o que sai aqui.
export const dynamic = 'force-dynamic'

export async function GET() {
  const registro = registroDeMetricas()
  return new Response(await registro.metrics(), { headers: { 'Content-Type': registro.contentType } })
}
