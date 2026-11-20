'use client';
import dynamic from 'next/dynamic';

// Everything the app shows comes from what this phone holds, so it is drawn in the browser only.
const LiftApp = dynamic(() => import('./lift-app'), { ssr: false });

export function LiftLoader({ userId }: { userId: string }) {
  return <LiftApp userId={userId} />;
}
