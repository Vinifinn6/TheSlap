import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { UserProvider } from '@auth0/nextjs-auth0/client';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TheSlap.com",
  description: "Rede social inspirada no TheSlap.com da série Victorious",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <UserProvider>
        <body className={inter.className} style={{
          backgroundImage: "url('/images/background-pattern.png')",
          backgroundRepeat: "repeat",
          backgroundColor: "#0a1e5c"
        }}>
          {children}
        </body>
      </UserProvider>
    </html>
  );
}
