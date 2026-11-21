import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import s from "../auth.module.css";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  async function signUp(formData: FormData) {
    "use server";

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!email || !password || !confirmPassword) {
      redirect("/signup?error=Please fill in all fields");
    }

    if (password !== confirmPassword) {
      redirect("/signup?error=Passwords do not match");
    }

    if (password.length < 6) {
      redirect("/signup?error=Password must be at least 6 characters");
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
      },
    });

    if (error) {
      redirect(`/signup?error=${encodeURIComponent(error.message)}`);
    }

    // With email confirmation on there is no session yet: say so, instead of bouncing to a bare login.
    if (!data.session) {
      redirect(`/login?message=${encodeURIComponent("Check your email for a confirmation link, then sign in.")}`);
    }

    redirect("/lift");
  }

  return (
    <div>
      <h2 className={s.title}>Create your account</h2>

      {params.error && (
        <p className={s.error} role="alert">
          <strong>Error:</strong>{" "}{params.error}
        </p>
      )}

      {params.message && (
        <p className={s.notice} role="status">{params.message}</p>
      )}

      <form action={signUp} className={s.form}>

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
            autoComplete="new-password"
            inputMode="text"
            autoCapitalize="none"
            spellCheck={false}
            required
            minLength={6}
            className={s.input}
            placeholder="At least 6 characters"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className={s.label}>Confirm password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            inputMode="text"
            autoCapitalize="none"
            spellCheck={false}
            required
            minLength={6}
            className={s.input}
            placeholder="Confirm your password"
          />
        </div>

        <span className={s.slabWrap}>
          <span className={s.ledge} aria-hidden="true" />
          <button type="submit" className={s.slab}>Create account</button>
        </span>
      </form>

      <p className={s.secondary}>
        <Link href="/login" className={s.word}>I have an account</Link>
      </p>
    </div>
  );
}
