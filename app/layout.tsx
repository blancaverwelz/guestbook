import type { Metadata } from "next";
import Footer from "@/components/Footer/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wedding & Birthday Guestbook",
  description: "Leave a message and share photos from the celebration.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-background text-foreground">
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
