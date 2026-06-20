import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "追番日历 / Anime Calendar",
  description: "2020年至今新番追番日历，按年份与月份整理更新时间。Anime release calendar since 2020.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="jjk-background" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="jjk-background-image"
            src="/assets/jjk-bg-2k.png"
            alt=""
            decoding="async"
            fetchPriority="high"
          />
          <div className="jjk-background-overlay" />
        </div>
        {children}
      </body>
    </html>
  );
}
