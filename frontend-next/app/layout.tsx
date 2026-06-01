import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Junior Senior QA",
    template: "%s | Junior Senior QA",
  },
  description: "Preguntas tecnicas respondidas por desarrolladores senior validados.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
