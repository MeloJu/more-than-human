import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // SÓ WEBP. O AVIF sai cerca de metade do tamanho, mas codificar custa caro:
    // medido em produção (VM ARM da Oracle), a primeira conversão de um retrato
    // levava 4,7 s em AVIF contra 1,1 s em WebP — e o navegador pede AVIF
    // primeiro. O gargalo aqui é CPU, não banda.
    formats: ['image/webp'],
    // 31 dias. As artes são versionadas no nome do arquivo (_v2, _v3): trocar a
    // arte troca o endereço, então cache longo não prende imagem velha. Com 60 s
    // o navegador revalidava cada imagem a cada minuto.
    minimumCacheTTL: 2678400,
    // O cache em disco mora num volume (docker-compose.prod.yml) que sobrevive
    // aos deploys; o teto protege o disco da VM.
    maximumDiskCacheSize: 1_000_000_000,
    deviceSizes: [360, 414, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [64, 96, 128, 256, 384],
    qualities: [75, 90],
  },
};

export default nextConfig;
