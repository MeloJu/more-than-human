output "public_ip" {
  description = "IP público da VM — use como SITE_ADDRESS (ou aponte um domínio pra ele) e como DEPLOY_HOST no GitHub."
  value       = oci_core_instance.app.public_ip
}

# O IP da Ampere, quando ela existe (enable_ampere). Lido pelo workflow
# Caçar Ampere para avisar na issue onde a máquina nova está.
output "ampere_public_ip" {
  value = var.enable_ampere ? oci_core_instance.ampere[0].public_ip : null
}
