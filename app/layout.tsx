import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "promoteIt Ventures | Store Operations & POS",
  description: "Quality you can trust, service you'll love. Retail inventory, sales, and supply chain management.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
