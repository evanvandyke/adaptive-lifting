import { notFound } from 'next/navigation';
import { LiftLoader } from '../lift-loader';

/**
 * The workout with no sign-in, for trying it on this machine: `npm run dev`, then /lift/preview. It keeps its
 * visits on the browser only, under a user called "preview". It does not exist in production.
 */
export default function PreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 40, background: '#1c1a14' }} />
      <LiftLoader userId="preview" />
    </>
  );
}
