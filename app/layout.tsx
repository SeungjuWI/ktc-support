import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TalentMarket - 베트남 IT 인재 마켓플레이스",
  description: "한국 중소기업을 위한 베트남 IT 인재 마켓플레이스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
