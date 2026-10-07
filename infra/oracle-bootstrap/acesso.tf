# O USUÁRIO DA CAÇA À AMPERE (workflow .github/workflows/cacar-ampere.yml).
#
# Por que um usuário só para isso: a chave que fica guardada no GitHub não
# pode ser a do administrador, que apaga máquina, vê cobrança e mexe em
# permissão. Este usuário cria instância e NADA mais — se a chave dele vazar,
# o pior que dá é alguém criar uma máquina dentro do limite gratuito.
#
# Mora aqui, e não em infra/oracle, pelo mesmo motivo do bucket: é da conta,
# não de uma VM, e um `terraform destroy` lá não deve apagar quem opera o
# resto.
#
# DESLIGADO POR PADRÃO: só cria algo quando cacador_chave_publica existe.
# A chave PRIVADA nunca passa pelo Terraform nem pelo state — quem gera o par
# é o openssl, na sua máquina; aqui entra só a pública:
#
#   openssl genrsa -out ~/.oci/oci_api_key_cacador.pem 2048
#   openssl rsa -in ~/.oci/oci_api_key_cacador.pem -pubout -out ~/.oci/oci_api_key_cacador_public.pem
#
# e depois, direto do arquivo para o GitHub (sem passar pelo chat):
#   gh secret set OCI_PRIVATE_KEY < ~/.oci/oci_api_key_cacador.pem
locals {
  criar_cacador = var.cacador_chave_publica_path != ""
}

resource "oci_identity_user" "cacador" {
  count = local.criar_cacador ? 1 : 0

  compartment_id = var.tenancy_ocid # usuários moram na raiz da tenancy
  name           = "cacador-ampere"
  description    = "Só cria a VM Ampere (workflow Caçar Ampere). Não apaga nada."
  email          = var.cacador_email

  freeform_tags = {
    project = "animebattler"
    purpose = "cacar-ampere"
  }
}

resource "oci_identity_group" "cacadores" {
  count = local.criar_cacador ? 1 : 0

  compartment_id = var.tenancy_ocid
  name           = "cacadores-de-ampere"
  description    = "Quem pode criar a VM Ampere do Always Free."
}

resource "oci_identity_user_group_membership" "cacador" {
  count = local.criar_cacador ? 1 : 0

  user_id  = oci_identity_user.cacador[0].id
  group_id = oci_identity_group.cacadores[0].id
}

# A chave da API: só a parte pública. O fingerprint que a Oracle calcula sai
# em outputs.tf, e é o que vai em OCI_FINGERPRINT no GitHub.
resource "oci_identity_api_key" "cacador" {
  count = local.criar_cacador ? 1 : 0

  user_id   = oci_identity_user.cacador[0].id
  key_value = file(var.cacador_chave_publica_path)
}

resource "oci_identity_policy" "cacador" {
  count = local.criar_cacador ? 1 : 0

  compartment_id = var.tenancy_ocid # política na raiz vale para a tenancy
  name           = "cacador-ampere"
  description    = "O mínimo para o workflow Caçar Ampere criar a VM e guardar o state."

  statements = [
    # Cria instância, mas NUNCA apaga uma. O terraform apply precisa também de
    # imagem e de volume de boot, que vêm junto da família da instância.
    "Allow group ${oci_identity_group.cacadores[0].name} to manage instance-family in tenancy where request.permission != 'INSTANCE_DELETE'",
    # Liga a VM nova à rede que já existe; não cria nem apaga rede.
    "Allow group ${oci_identity_group.cacadores[0].name} to use virtual-network-family in tenancy",
    "Allow group ${oci_identity_group.cacadores[0].name} to use volume-family in tenancy",
    # Enxergar compartimentos e domínios de disponibilidade (o plan lê isso).
    "Allow group ${oci_identity_group.cacadores[0].name} to inspect compartments in tenancy",
    "Allow group ${oci_identity_group.cacadores[0].name} to inspect tenancies in tenancy",
    # O state do Terraform: só o bucket dele, e só o namespace para achá-lo.
    "Allow group ${oci_identity_group.cacadores[0].name} to read objectstorage-namespaces in tenancy",
    "Allow group ${oci_identity_group.cacadores[0].name} to read buckets in tenancy where target.bucket.name = '${var.bucket_name}'",
    "Allow group ${oci_identity_group.cacadores[0].name} to manage objects in tenancy where target.bucket.name = '${var.bucket_name}'",
  ]
}
