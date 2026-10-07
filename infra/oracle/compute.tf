data "oci_identity_availability_domains" "ads" {
  compartment_id = var.tenancy_ocid
}

# Imagem Ubuntu compatível com a shape escolhida (ARM na A1.Flex, AMD na E2.1.Micro).
data "oci_core_images" "ubuntu" {
  compartment_id           = var.compartment_ocid
  operating_system         = "Canonical Ubuntu"
  operating_system_version = "22.04"
  shape                    = var.instance_shape
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

# Imagem ARM, só usada quando enable_ampere = true.
data "oci_core_images" "ubuntu_ampere" {
  compartment_id           = var.compartment_ocid
  operating_system         = "Canonical Ubuntu"
  operating_system_version = "22.04"
  shape                    = "VM.Standard.A1.Flex"
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

resource "oci_core_instance" "app" {
  compartment_id      = var.compartment_ocid
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  display_name        = "animebattler-vm"
  shape               = var.instance_shape

  # shape_config só existe pra shapes *.Flex (Ampere) — a E2.1.Micro é
  # fixa e rejeita esse bloco.
  dynamic "shape_config" {
    for_each = strcontains(var.instance_shape, "Flex") ? [1] : []
    content {
      ocpus         = var.instance_ocpus
      memory_in_gbs = var.instance_memory_gb
    }
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.main.id
    assign_public_ip = true
  }

  # O endpoint LEGADO de metadados (v1) não exige o cabeçalho de
  # autorização que o v2 exige — um SSRF na aplicação rodando dentro da VM
  # conseguiria ler segredo da instância só com uma requisição GET simples.
  # Desabilitar não quebra nada aqui: nada neste projeto lê metadata da
  # instância via v1.
  instance_options {
    are_legacy_imds_endpoints_disabled = true
  }

  # Sem custo extra nem exigência de shape especial — só criptografa o
  # tráfego entre a instância e o volume de boot, que por padrão vai em
  # texto claro na rede interna da Oracle. Dentro de launch_options (em vez
  # do atalho is_pv_encryption_in_transit_enabled de nível superior) porque
  # é essa a forma que ferramenta de análise estática (Checkov CKV_OCI_4)
  # reconhece — as duas formas configuram o mesmo campo na API da Oracle.
  launch_options {
    # A API da Oracle exige o tipo de rede sempre que launch_options existe
    # (400 "NetworkType must be specified" — achado na primeira tentativa real).
    # É o mesmo modo que a VM atual já usa.
    network_type                        = "PARAVIRTUALIZED"
    is_pv_encryption_in_transit_enabled = true
  }

  source_details {
    source_type = "image"
    source_id   = data.oci_core_images.ubuntu.images[0].id
  }

  metadata = {
    ssh_authorized_keys = file(var.ssh_public_key_path)
    user_data           = base64encode(file("${path.module}/../shared/cloud-init.yaml"))
  }

  # O cloud-init só roda no PRIMEIRO boot. Mudar o arquivo depois não muda
  # uma VM que já existe, mas na Oracle trocar o user_data FORÇA RECRIAR a
  # instância: um ajuste no cloud-init (como desligar o fwupd) destruiria a VM
  # do jogo, com o banco dentro. Achado real ao rodar o plan em 2026-10-07.
  # Para aplicar uma mudança de cloud-init, é na VM, à mão — e a VM nova que
  # nascer já sai com o arquivo atual.
  lifecycle {
    ignore_changes = [metadata["user_data"]]
  }
}

# Instância Ampere opcional (2 OCPU/12GB), muito mais potente que a micro.
# Fica ao lado dela em vez de substituí-la: as cotas do Always Free são
# separadas, então tentar a Ampere não põe em risco a VM que já funciona.
# Se a região estiver sem capacidade, só este recurso falha.
resource "oci_core_instance" "ampere" {
  count = var.enable_ampere ? 1 : 0

  compartment_id      = var.compartment_ocid
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  display_name        = "animebattler-vm-ampere"
  shape               = "VM.Standard.A1.Flex"

  shape_config {
    ocpus         = var.instance_ocpus
    memory_in_gbs = var.instance_memory_gb
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.main.id
    assign_public_ip = true
  }

  # O endpoint LEGADO de metadados (v1) não exige o cabeçalho de
  # autorização que o v2 exige — um SSRF na aplicação rodando dentro da VM
  # conseguiria ler segredo da instância só com uma requisição GET simples.
  # Desabilitar não quebra nada aqui: nada neste projeto lê metadata da
  # instância via v1.
  instance_options {
    are_legacy_imds_endpoints_disabled = true
  }

  # Sem custo extra nem exigência de shape especial — só criptografa o
  # tráfego entre a instância e o volume de boot, que por padrão vai em
  # texto claro na rede interna da Oracle. Dentro de launch_options (em vez
  # do atalho is_pv_encryption_in_transit_enabled de nível superior) porque
  # é essa a forma que ferramenta de análise estática (Checkov CKV_OCI_4)
  # reconhece — as duas formas configuram o mesmo campo na API da Oracle.
  launch_options {
    # A API da Oracle exige o tipo de rede sempre que launch_options existe
    # (400 "NetworkType must be specified" — achado na primeira tentativa real).
    # É o mesmo modo que a VM atual já usa.
    network_type                        = "PARAVIRTUALIZED"
    is_pv_encryption_in_transit_enabled = true
  }

  source_details {
    source_type = "image"
    source_id   = data.oci_core_images.ubuntu_ampere.images[0].id
  }

  metadata = {
    ssh_authorized_keys = file(var.ssh_public_key_path)
    user_data           = base64encode(file("${path.module}/../shared/cloud-init.yaml"))
  }
}
