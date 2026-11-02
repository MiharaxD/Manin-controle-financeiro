import type { Metadata, Viewport } from "next";
import { Pwa } from "@/components/pwa";
import "./globals.css";
// Bump when the icons change: browsers (Safari above all) cache icons by URL.
const iconVersion = 2;
export const metadata: Metadata = {
  title: "Manin — seu dinheiro, com clareza",
  description:
    "Seu controle financeiro pessoal. Compras, cartões e assinaturas em um só lugar.",
  applicationName: "Manin",
  appleWebApp: { capable: true, title: "Manin", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: `/favicon.svg?v=${iconVersion}`, type: "image/svg+xml" },
      {
        url: `/icons/favicon-96.png?v=${iconVersion}`,
        sizes: "96x96",
        type: "image/png",
      },
    ],
    apple: `/icons/apple-touch-icon.png?v=${iconVersion}`,
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e60012" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0b" },
  ],
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('manin-theme');document.documentElement.dataset.theme=t|| (matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light')}catch{}",
          }}
        />
      </head>
      <body>
        {children}
        <Pwa />
      </body>
    </html>
  );
}
