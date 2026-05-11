import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

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

    redirect("/dashboard");
  }

  return (
    <div className="glass-card p-8">
      <h2
        className="text-xl font-semibold mb-6 text-center"
        style={{ color: "var(--text-primary)" }}
      >
        Welcome back
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

      <form action={signIn} className="space-y-4">
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
            autoComplete="current-password"
            required
            className="glass-input"
            placeholder="Your password"
          />
        </div>

        <button type="submit" className="btn-primary w-full mt-2">
          Sign In
        </button>
      </form>

      <p
        className="mt-6 text-center text-sm"
        style={{ color: "var(--text-secondary)" }}
      >
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium hover:underline"
          style={{ color: "var(--teal)" }}
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
