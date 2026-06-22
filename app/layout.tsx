import type { Metadata } from "next";
import "@/src/styles/globals.css";

export const metadata: Metadata = {
  title: "DailyEdge | MLB Analytics Dashboard",
  description:
    "DailyEdge is a premium MLB analytics dashboard for slate research, player props, pitching models, market movement, and betting decision support.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
