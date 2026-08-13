import { NextRequest } from "next/server";
import { fetchYoutubePlaylist } from "@/lib/playlist";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")?.trim() ?? "";
  if (!url) {
    return Response.json({ error: "Falta el link de la playlist" }, { status: 400 });
  }

  try {
    const playlist = await fetchYoutubePlaylist(url);
    return Response.json(playlist);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No pude importar la playlist";
    return Response.json({ error: message }, { status: 400 });
  }
}
