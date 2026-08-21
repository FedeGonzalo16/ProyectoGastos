import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Work_Sans } from "next/font/google";
import "./globals.css";

// Mismas fuentes que se usaron en los mockups aprobados (design/): Space
// Grotesk para títulos y números grandes, Work Sans para el resto del texto.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const workSans = Work_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "gastos",
  description: "Gastos diarios, resumen mensual e inversiones, todo en un solo lugar.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "gastos",
  },
};

export const viewport: Viewport = {
  themeColor: "#1baf7a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${spaceGrotesk.variable} ${workSans.variable} h-full antialiased`}
    >
      {/*
        Los providers de Supabase/auth se declaran en app/login/layout.tsx y
        app/(protected)/layout.tsx, no acá: así una ruta puramente estática
        (como /_not-found) no necesita las credenciales de Supabase para
        poder generarse en el build.
      */}
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
