import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import BottomNav from "./BottomNav";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return (
    <div className="flex flex-col min-h-[100dvh]">
      <div className="flex-1 flex flex-col">{children}</div>
      <BottomNav />
    </div>
  );
}
