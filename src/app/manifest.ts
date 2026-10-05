import type { MetadataRoute } from "next";

// Makes the site installable ("Add to Home screen" / "Install app"). Icons come from scripts/make-icons.ts.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JRF Commerce Practice",
    short_name: "JRF Practice",
    description: "UGC NET / JRF Commerce (code 08) practice exams with history",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f5f1",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
