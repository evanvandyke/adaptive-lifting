import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import s from "../auth.module.css";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  async function signIn(formData: FormData) {
    "use server";

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      redirect("/login?error=Please fill in all fields");
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      redirect(`/login?error=${encodeURIComponent(error.message)}`);
    }

    redirect("/lift");
  }

  return (
    <div>
      <h2 className={s.title}>Welcome back</h2>

      {params.error && (
        <p className={s.error} role="alert">
          <strong>Error:</strong>{" "}{params.error}
        </p>
      )}

      {params.message && (
        <p className={s.notice} role="status">{params.message}</p>
      )}

      <form action={signIn} className={s.form}>

        <div>
          <label htmlFor="email" className={s.label}>Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            className={s.input}
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className={s.label}>Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            inputMode="text"
            autoCapitalize="none"
            spellCheck={false}
            required
            className={s.input}
            placeholder="Your password"
          />
        </div>

        <span className={s.slabWrap}>
          <span className={s.ledge} aria-hidden="true" />
          <button type="submit" className={s.slab}>Sign in</button>
        </span>
      </form>

      <p className={s.secondary}>
        <Link href="/signup" className={s.word}>Create an account</Link>
      </p>
    </div>
  );
}
