import type { MetadataRoute } from "next";
export const dynamic = "force-static";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Manin • Controle financeiro",
    short_name: "Manin",
    lang: "pt-BR",
    description: "Seu dinheiro, com clareza.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#e60012",
    theme_color: "#0d0d0d",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
