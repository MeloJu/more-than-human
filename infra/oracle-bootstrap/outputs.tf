# Estes dois valores são exatamente o que vai no backend.hcl do infra/oracle.
output "bucket_name" {
  description = "Nome do bucket de state."
  value       = oci_objectstorage_bucket.tfstate.name
}

output "namespace" {
  description = "Namespace do Object Storage da tenancy."
  value       = data.oci_objectstorage_namespace.ns.namespace
}

# O que vai nos secrets do GitHub para o workflow Caçar Ampere (só existe
# depois de criar o usuário). A chave privada NÃO sai daqui: ela nunca entrou.
output "cacador_user_ocid" {
  description = "OCI_USER_OCID do workflow Caçar Ampere."
  value       = try(oci_identity_user.cacador[0].id, null)
}

output "cacador_fingerprint" {
  description = "OCI_FINGERPRINT do workflow Caçar Ampere."
  value       = try(oci_identity_api_key.cacador[0].fingerprint, null)
}
