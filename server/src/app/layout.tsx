import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "English Coach API",
  description: "Server for Tony's English Coach: sign-in, progress, AI lessons and speech scoring.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
