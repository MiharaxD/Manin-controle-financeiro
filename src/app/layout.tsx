import type { Metadata, Viewport } from "next";
import { Pwa } from "@/components/pwa";
import "./globals.css";
export const metadata: Metadata = {
  title: "Manin — seu dinheiro, com clareza",
  description:
    "Seu controle financeiro pessoal. Compras, cartões e assinaturas em um só lugar.",
  applicationName: "Manin",
  appleWebApp: { capable: true, title: "Manin", statusBarStyle: "default" },
  icons: { icon: "/favicon.svg", apple: "/icons/apple-touch-icon.png" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f0e7" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0d" },
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
