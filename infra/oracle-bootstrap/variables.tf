variable "config_file_profile" {
  description = "Perfil no ~/.oci/config de onde vêm tenancy/user/fingerprint/key_file."
  type        = string
  default     = "DEFAULT"
}

variable "region" {
  description = "Região OCI onde o bucket de state vive."
  type        = string
  default     = "sa-saopaulo-1"
}

variable "compartment_ocid" {
  description = "OCID do compartment (pode ser o da tenancy)."
  type        = string
}

variable "bucket_name" {
  description = "Nome do bucket que guarda o tfstate. Precisa ser único dentro do namespace."
  type        = string
  default     = "animebattler-tfstate"
}

variable "tenancy_ocid" {
  description = "OCID da tenancy: onde moram usuários, grupos e políticas."
  type        = string
  default     = null
}

variable "cacador_chave_publica_path" {
  description = "Caminho da chave PÚBLICA da API do usuário cacador-ampere. Vazio (padrão) = não cria o usuário."
  type        = string
  default     = ""
}

variable "cacador_email" {
  description = "E-mail do usuário cacador-ampere (a Oracle exige um; ele não faz login, só usa a chave da API)."
  type        = string
  default     = null
}
