import type { Viewport } from "next";
import { Overpass } from "next/font/google";
import s from "./auth.module.css";

const overpass = Overpass({ subsets: ['latin'], weight: ['600', '800', '900'], variable: '--signal-font', display: 'swap' });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1c1a14",
  maximumScale: 5,
  userScalable: true,
};

function Wordmark() {
  // The lifter and the name, drawn in Overpass 900 outlines (source: design/app-icon/round-3/wordmark-e.svg).
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/wordmark.svg" alt="" width={1602} height={412} />;
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${overpass.variable} ${s.shell}`}>
      <div className={s.column}>
        <header className={s.header}>
          <h1 className={s.wordmark} aria-label="Adaptive Lifting"><Wordmark /></h1>
          <p className={s.tagline}>One set at a time.</p>
        </header>
        {children}
      </div>
    </div>
  );
}
