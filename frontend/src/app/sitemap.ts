import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: site.url,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
      images: [
        `${site.url}/images/fachada-falcao-distribuidora-feira-de-santana.webp`,
        `${site.url}/images/galpao-falcao-distribuidora-feira-de-santana.webp`,
      ],
    },
  ];
}
