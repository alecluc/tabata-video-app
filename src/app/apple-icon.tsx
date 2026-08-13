import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          background: "#0b0f0c",
        }}
      >
        <div style={{ width: 32, height: 100, background: "#c8f542" }} />
        <div style={{ width: 32, height: 100, background: "#c8f542", opacity: 0.28 }} />
      </div>
    ),
    { ...size },
  );
}
