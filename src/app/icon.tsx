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
          background: "#0b0f0c",
          color: "#c8f542",
          fontSize: 110,
          fontWeight: 700,
          letterSpacing: -6,
          lineHeight: 1,
        }}
      >
        T
      </div>
    ),
    { ...size },
  );
}
