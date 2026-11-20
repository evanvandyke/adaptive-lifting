import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { LiftLoader } from './lift-loader';

/** The workout. Signed-in only; everything else happens in the browser, on what the phone holds. */
export default async function LiftPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return (
    <>
      {/* The ground, before the app has loaded: the window is never white. */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 40, background: '#1c1a14' }} />
      <LiftLoader userId={user.id} />
    </>
  );
}
