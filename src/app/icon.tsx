import { ImageResponse } from "next/og";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          background: "#0b0f0c",
        }}
      >
        <div style={{ width: 36, height: 108, background: "#c8f542" }} />
        <div style={{ width: 36, height: 108, background: "#c8f542", opacity: 0.28 }} />
      </div>
    ),
    { ...size },
  );
}
