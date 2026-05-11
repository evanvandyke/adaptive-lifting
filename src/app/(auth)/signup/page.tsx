import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

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
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
      },
    });

    if (error) {
      redirect(`/signup?error=${encodeURIComponent(error.message)}`);
    }

    redirect("/onboarding");
  }

  return (
    <div className="glass-card p-8">
      <h2
        className="text-xl font-semibold mb-6 text-center"
        style={{ color: "var(--text-primary)" }}
      >
        Create your account
      </h2>

      {params.error && (
        <div
          className="mb-6 px-4 py-3 rounded-md text-sm"
          style={{
            background: "rgba(248, 113, 113, 0.1)",
            border: "1px solid rgba(248, 113, 113, 0.3)",
            color: "var(--error)",
          }}
        >
          {params.error}
        </div>
      )}

      {params.message && (
        <div
          className="mb-6 px-4 py-3 rounded-md text-sm"
          style={{
            background: "rgba(52, 211, 153, 0.1)",
            border: "1px solid rgba(52, 211, 153, 0.3)",
            color: "var(--success)",
          }}
        >
          {params.message}
        </div>
      )}

      <form action={signUp} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium mb-1.5"
            style={{ color: "var(--text-secondary)" }}
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="glass-input"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium mb-1.5"
            style={{ color: "var(--text-secondary)" }}
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            className="glass-input"
            placeholder="At least 6 characters"
          />
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium mb-1.5"
            style={{ color: "var(--text-secondary)" }}
          >
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            className="glass-input"
            placeholder="Confirm your password"
          />
        </div>

        <button type="submit" className="btn-primary w-full mt-2">
          Create Account
        </button>
      </form>

      <p
        className="mt-6 text-center text-sm"
        style={{ color: "var(--text-secondary)" }}
      >
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium hover:underline"
          style={{ color: "var(--teal)" }}
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
