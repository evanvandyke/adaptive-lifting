"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function SuccessBanner({ message }: { message: string }) {
  const [visible, setVisible] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      // Clean up the URL search params
      router.replace("/profile", { scroll: false });
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  if (!visible) return null;

  return (
    <div
      className="rounded-lg px-4 py-3 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300"
      style={{
        background: "rgba(52, 211, 153, 0.12)",
        color: "var(--success)",
        border: "1px solid rgba(52, 211, 153, 0.25)",
      }}
    >
      {message}
    </div>
  );
}
