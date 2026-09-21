# More Than Human

Jogo de batalha por turnos com personagens de anime e quadrinhos. Next.js 16,
React 19, Prisma e Postgres, rodando numa VM Always Free provisionada por
Terraform.

**No ar:** https://morethanhuman.duckdns.org

Projeto educacional, e também o laboratório onde eu testo esteira de deploy,
infraestrutura como código e ferramenta de segurança num serviço que de fato
está exposto na internet.

## O que existe hoje

Números do catálogo em produção, não de roadmap:

| | |
|---|---|
| Personagens jogáveis | 62 |
| Universos | 9 — Naruto, Bleach, Dragon Ball Z, Jujutsu Kaisen, Marvel, DC, Pokémon, Solo Leveling, Cartoon |
| Habilidades | 620 |
| Transformações | 54 |
| Estágios de história | 16, em 2 arcos |
| Equipamentos | 20 |

### Modos de jogo

- **`/battle/ai`** — batalha contra IA. O inimigo escala com o nível do
  jogador, e a vitória paga XP e moeda com teto diário.
- **`/battle/pvp`** — PvP assíncrono de verdade. Os dois lados escolhem a
  ação sem ver a do outro, e a rodada resolve sozinha quando o segundo joga.
- **`/story`** — dois arcos com diálogo, retrato dos falantes e chefes:
  **Arco Soul Society** e **Incidente de Shibuya**.
- **`/battle/raid`** — monstros com `tier` próprio como eixo de dificuldade.

### Telas de fora da batalha

`/select` e `/create` (elenco e criação) · `/dashboard` · `/status`
(atributos alocáveis e árvore de habilidades) · `/skills` (as 620, filtráveis
por categoria) · `/treino` (comprar ponto de atributo com moeda) · `/shop` e
`/equipment` · `/characters` (catálogo público) · `/creditos` (direitos das
artes).

## O motor de batalha

Tudo em [app/lib/battle/](app/lib/battle). A peça central é `resolveRound`,
que **recebe a função aleatória por parâmetro** — é o que torna o combate
testável de forma determinística, com PRNG semeado, em vez de esperança.

Tipos de efeito ([types.ts](app/lib/battle/types.ts)):

`BUFF` · `DEBUFF` · `DOT` · `STUN` · `COUNTER` · `SHIELD` · `HEAL` ·
`LIFESTEAL` · `DOMAIN` · `REVIVE`

E quatro **modificadores de dano**, que nunca viram status persistente — são
consumidos inteiros dentro do mesmo golpe que os carrega:

- `EXECUTE` — dano bônus contra alvo abaixo de um limiar de vida.
- `PIERCE` — ignora uma fração da defesa.
- `COMBO_STUN` — dano bônus contra alvo atordoado (prende com Bakudō,
  finaliza com Hadō).
- `COMBO_FOLLOWUP` — dano bônus se a ação anterior carregava a combo-tag
  exigida. Carrega numa rodada, finaliza na outra, e quebra com qualquer
  coisa no meio — inclusive bloquear ou se transformar.

Um efeito também pode ser **empilhável** (`stack` + `maxStacks`): a
magnitude soma a cada aplicação até um teto.

Batalha em time, revive de aliado caído, bloqueio com custo de stamina,
precisão por habilidade e transformações com gatilho (`MANUAL`, `LOW_HP`,
`ENERGY_CHARGE`, `ON_DAMAGE_TAKEN`) também estão no motor.

## Catálogo: acrescenta, nunca substitui

A parte do projeto de que mais me orgulho, e a menos visível.

O `prisma/seed.js` é **destrutivo** — apaga e recria. Serve para começar um
banco do zero, e **nunca roda em produção**, onde existe jogador com
progresso.

Quem leva conteúdo novo para produção é o
[prisma/sync-catalog.js](prisma/sync-catalog.js), lendo
[prisma/catalog/](prisma/catalog). Ele é **idempotente e aditivo**: dá para
rodar quantas vezes quiser, e ele não apaga nem sobrescreve o que já está lá.
Personagem novo, habilidade renomeada ou mecânica nova entram sem tocar em
nenhum `UserCharacter`.

```bash
npm run catalog:check   # dry-run: mostra o que mudaria
npm run catalog:sync    # aplica
```

Isso custou um bug real para ficar certo: o sync de invocadores sobrescrevia
`effects` com o literal cru do catálogo, e as habilidades oscilavam a cada
execução. A correção foram os helpers `comTagsPreservadas()` e
`comEfeitosPreservados()`, que fundem em vez de trocar.

## Stack

**Aplicação** — Next.js 16 (App Router, server components e server actions),
React 19, TypeScript, Tailwind CSS 4, Motion para as animações de batalha
(carregada só nas rotas de luta, em chunk separado), Lucide para ícones.

**Dados** — Prisma 6 sobre PostgreSQL 16.

**Infra** — Docker e Docker Compose, Terraform, Caddy (HTTPS automático via
Let's Encrypt), GitHub Actions para CI e CD, imagem publicada no GHCR.

**Qualidade** — Vitest, ESLint, e as ferramentas de segurança abaixo.

## Rodando localmente

### Docker (recomendado)

```bash
docker compose up --build
```

Sobe Postgres e o servidor de dev em `http://localhost:3000`, gerando o client
do Prisma e aplicando as migrations. Para popular o banco:

```bash
docker compose exec app npm run prisma:seed
```

No Windows o `next dev` não recebe eventos de arquivo pelo bind mount — depois
de editar, `docker compose restart app`.

### Node local

Precisa de Node 20+ e um Postgres acessível.

```bash
git clone https://github.com/MeloJu/more-than-human.git
cd more-than-human
npm install
cp .env.example .env      # ajuste a DATABASE_URL
npx prisma generate
npx prisma migrate dev
npm run prisma:seed
npm run dev
```

## Testes

```bash
npm test              # a suíte uma vez
npm run test:watch    # durante o desenvolvimento
npm run test:coverage
```

A estratégia é dividida por camada, em vez de perseguir uma % de cobertura.

**Unitários** ([tests/](tests)) cobrem a lógica pura: o motor (dano, crítico,
escudo, contra-ataque, DOT, stun, bloqueio, domínio, combo, efeito
empilhável, batalha em time, ordem de turno), a IA, a curva de XP, os
atributos, o treino, a recompensa e o parser de diálogo. Como `resolveRound`
recebe o `rand`, cada um desses testes é determinístico.

**Smoke test** ([scripts/smoke-test.sh](scripts/smoke-test.sh)) sobe a
**imagem de produção** de verdade, aplica migrations, roda o seed e exercita
rotas reais.

Rotas e componentes não têm teste unitário **de propósito**: mockar Prisma e
`cookies()` testaria o mock, não o comportamento. Quem cobre essa camada é o
smoke test, contra a imagem real.

Para mudança de regra de jogo existe ainda a medição de balanceamento:

```bash
npm run balance:referencia
```

## Deploy

GitHub Actions builda a imagem, publica no GHCR e sobe numa VM Always Free
provisionada por Terraform, com Caddy na frente fazendo TLS.

O Terraform é modular por provedor, um root independente por nuvem em
[infra/](infra):

- [infra/oracle](infra/oracle) — E2.1.Micro (amd64) ou Ampere A1.Flex
  (arm64), Oracle Always Free. Passo a passo:
  [docs/deploy-oracle.md](docs/deploy-oracle.md).
- [infra/gcp](infra/gcp) — e2-micro (amd64), Google Cloud Always Free. Passo a
  passo: [docs/deploy-gcp.md](docs/deploy-gcp.md).

O bootstrap de cada VM (Docker, firewall local) é compartilhado entre os dois
em [infra/shared/cloud-init.yaml](infra/shared/cloud-init.yaml).

Em produção, conteúdo novo entra por `npm run catalog:sync` — **nunca** pelo
seed.

## Segurança

O repositório é público e o serviço está exposto de verdade, então isto não é
decoração. Detalhe completo em [docs/seguranca.md](docs/seguranca.md), que é
honesto sobre o que **não** foi feito.

| Categoria | Ferramenta | Estado |
|---|---|---|
| Dependência (SCA) | Dependabot | ativo — npm, actions e imagem, com Security Updates |
| Segredo no histórico | gitleaks | ativo — hook de pre-push + job no CI |
| Código (SAST) | CodeQL | ativo — push, PR e agenda semanal |
| Infraestrutura (IaC) | Checkov | ativo — job no CI sobre `infra/` |
| Imagem de container | — | não feito |
| Aplicação em execução (DAST) | — | não feito |

Achados reais já corrigidos por essa esteira: SSH aberto para `0.0.0.0/0` em
dois provedores, e três **RCE não-autenticado** no Next.js que estavam
invisíveis porque a versão estava pinada exata.

Para ativar o hook de segredo no seu clone:

```bash
git config core.hooksPath .githooks
```

## Estrutura

```
app/
  battle/        ai, pvp, raid — arena e lobby
  lib/
    battle/      motor, IA, recompensa, apresentação
    progression/ atributos, treino
    pvp/         fila e resolução assíncrona
    story/       capítulos, estágios, diálogo
    equipment/   loja e equipar
  components/    UI, com battle/ e story/ separados
  story/ status/ skills/ shop/ treino/ creditos/ ...
prisma/
  schema.prisma
  seed.js          DESTRUTIVO — só para banco do zero
  sync-catalog.js  idempotente e aditivo — este é o de produção
  catalog/         o conteúdo do jogo, em arquivos por tema
  migrations/
infra/
  oracle/ gcp/ oracle-bootstrap/ shared/
scripts/         busca de arte, smoke test, verificação de balanço
tests/
docs/
```

## Arte e direitos

Todos os personagens, nomes e artes pertencem aos seus criadores e detentores
de direito. Este é um projeto educacional, sem fim lucrativo, e a atribuição
por universo fica em [/creditos](https://morethanhuman.duckdns.org/creditos) e
no rodapé de toda página. Qualquer detentor de direito que queira a remoção de
um material é só abrir uma issue.

## Autoria

Desenvolvido por Juan (**MeloJu**), com assistência de IA — Claude, via Claude
Code — em arquitetura, motor de batalha, infraestrutura e revisão.

Projeto educacional, em desenvolvimento ativo.
