import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TABATA + VIDEO",
    short_name: "Tabata",
    description:
      "Timer de intervalos que reproduce tus videos de YouTube en loop.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0f0c",
    theme_color: "#0b0f0c",
    lang: "es",
    icons: [
      {
        src: "/icon",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
