import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { FloatingActions } from "@/components/layout/FloatingActions";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { buildJsonLd, jsonLdScript } from "@/lib/seo";
import { site } from "@/lib/site";
import "./globals.css";

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-barlow",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0b0b0c",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.title,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  keywords: site.keywords,
  applicationName: site.name,
  authors: [{ name: site.name, url: site.url }],
  creator: site.name,
  publisher: site.name,
  category: "Autopeças",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: site.name,
    title: site.title,
    description: site.description,
    // A imagem vem de app/opengraph-image.tsx (PNG 1200×630 gerado no build).
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
  other: {
    "geo.region": "BR-BA",
    "geo.placename": site.address.city,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <body>
        <a
          href="#conteudo"
          className="sr-only z-50 rounded-md bg-ouro px-4 py-2 font-semibold text-preto focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Pular para o conteúdo
        </a>
        <Header />
        {children}
        <Footer />
        <FloatingActions />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(buildJsonLd()) }} />
      </body>
    </html>
  );
}
