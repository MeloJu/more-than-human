# Deploy no Google Cloud — checklist manual

Terraform em [infra/gcp](../infra/gcp) provisiona uma VM `e2-micro` (Always
Free — sem prazo de validade, ao contrário do crédito de $200 da AWS ou do
período de 12 meses do Azure). O que resta aqui exige a sua conta
GCP/GitHub e não tem como ser feito por fora.

> Provider Oracle? Ver [docs/deploy-oracle.md](deploy-oracle.md) em vez deste.

> ℹ️ O pipeline de CD (`.github/workflows/deploy.yml`) builda `amd64`, que
> é a arquitetura da `e2-micro` — então ele serve pra esta VM sem alteração.
> O que ele não faz é apontar pra dois hosts ao mesmo tempo: os secrets
> `DEPLOY_HOST`/`DEPLOY_SSH_KEY` apontam pra uma VM só.

> ⚠️ **Ainda pede cartão de crédito.** O Always Free do GCP não cobra
> nada dentro da cota, mas criar o projeto exige uma conta de faturamento
> vinculada, como na Oracle. A vantagem aqui não é evitar cartão — é evitar
> a fila de capacidade da Oracle e os prazos com cobrança automática da
> AWS/Azure.

## 1. Criar o projeto e habilitar a Compute Engine API

No [console GCP](https://console.cloud.google.com): crie um projeto (ou
reuse um existente) e anote o **Project ID** (não o nome — aparece ao lado
do nome do projeto, ex: `animebattler-123456`). Depois:

**APIs & Services → Enable APIs and Services → busque "Compute Engine API"
→ Enable.**

## 2. Criar a service account

**IAM & Admin → Service Accounts → Create Service Account.** Dê o papel
**Compute Admin** (`roles/compute.admin` — suficiente pra criar
VM/rede/firewall; é mais amplo que o estritamente necessário, mas simples
pra um projeto solo de estudo). Depois **Keys → Add Key → Create new key →
JSON** — isso baixa um arquivo `.json`. Guarde fora do repo, ex:
`~/.gcp/animebattler-sa.json`. **Nunca commitar esse arquivo.**

## 3. Configurar credenciais (`.env`) e variáveis (`terraform.tfvars`)

```bash
cd infra/gcp
cp .env.example .env
cp terraform.tfvars.example terraform.tfvars
# preencha os dois com os valores dos passos 1 e 2
```

Diferente da Oracle (tudo em `terraform.tfvars`), aqui a credencial vai no
`.env` — o provider `google` do Terraform lê essas variáveis de ambiente
sozinho, sem precisar declará-las em nenhum `.tf`. Terraform não carrega
`.env` automaticamente, então exporte antes de rodar:

```powershell
# PowerShell
Get-Content .env | ForEach-Object {
  if ($_ -match '^\s*([^#=]+)=(.*)$') {
    [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim())
  }
}
```

```bash
# bash
set -a; source .env; set +a
```

Chave SSH só pra essa VM, se ainda não tiver uma (pode reaproveitar a
mesma da Oracle também):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/animebattler-gcp -C "animebattler-deploy-gcp"
```

## 4. Provisionar a VM

```bash
terraform init
terraform validate
terraform apply
```

O `apply` cria a VPC, subnet, firewall (22/80/443), a instância `e2-micro`
e já instala Docker via cloud-init (o mesmo script usado pela Oracle, em
[infra/shared/cloud-init.yaml](../infra/shared/cloud-init.yaml)). No fim,
ele imprime o `public_ip` — anota esse IP, é o `SITE_ADDRESS` e o
`DEPLOY_HOST`.

## 5. Criar o `.env` na VM

```bash
ssh -i ~/.ssh/animebattler-gcp ubuntu@<public_ip>
cd ~/animebattler          # o cloud-init já criou esta pasta
nano .env                  # conteúdo: ver deploy/.env.prod.example
```

Mesma ressalva da Oracle: se `SITE_ADDRESS` for o IP puro (sem domínio), o
Caddy serve HTTP sem TLS e o cookie de sessão `Secure` é descartado pelo
navegador — use `COOKIE_SECURE=false` nesse caso.

## 6. Cadastrar os secrets no GitHub

Mesmos secrets da Oracle (`DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`),
apontando pro IP desta VM — ver o passo equivalente em
[docs/deploy-oracle.md](deploy-oracle.md). Como os secrets apontam pra um
host só, os dois deploys não coexistem sem criar um segundo ambiente no
GitHub.

## Destruir tudo

```bash
cd infra/gcp
terraform destroy
```

## Limites do Always Free a ter em mente

- **1 vCPU / 1GB RAM** (`e2-micro`) — bem mais apertado que os 2 OCPU/12GB
  Ampere da Oracle — mesma faixa da E2.1.Micro da Oracle.
  `docker-compose.prod.yml` (app + Postgres + Caddy) roda, e o cloud-init
  compartilhado já cria 2GB de swap pra absorver picos.
- **30GB de disco padrão** (`pd-standard`) — já configurado como default em
  `infra/gcp/main.tf`, não subir pra `pd-ssd`/`pd-balanced` ou sai da cota.
- **1GB de saída de rede/mês** (fora tráfego pra dentro do Google e exceto
  China/Austrália) — baixo pra um site com tráfego real; suficiente pra
  portfolio/estudo.
- Restrito a **uma zona por vez** dentro de us-west1/us-central1/us-east1
  (ver `infra/gcp/variables.tf`) — fora dessas regiões a instância é
  cobrada normalmente.
