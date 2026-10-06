import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Deluj",
    short_name: "Deluj",
    description: "Order from your table, the Deluj kitchen display and the owner's command center.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFF7EE",
    theme_color: "#FB4E12",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
