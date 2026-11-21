import type { Viewport } from "next";
import { Overpass } from "next/font/google";
import s from "./auth.module.css";
import { INTRO_VIDEO } from "./intro-video";

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

/** The one-minute explainer, under the form so signing in stays the first thing. Nothing loads until it is played. */
function IntroVideo() {
  if (!INTRO_VIDEO) return null;
  return (
    <section className={s.intro} aria-labelledby="intro-title">
      <h2 id="intro-title" className={s.introTitle}>New here? See how it works.</h2>
      <video
        className={s.introVideo}
        controls
        playsInline
        preload="none"
        poster={INTRO_VIDEO.poster}
        width={INTRO_VIDEO.width}
        height={INTRO_VIDEO.height}
      >
        <source src={INTRO_VIDEO.src} type="video/mp4" />
      </video>
    </section>
  );
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
        <IntroVideo />
      </div>
    </div>
  );
}
