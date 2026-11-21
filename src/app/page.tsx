import { redirect } from "next/navigation";

// The workout is the front door. Signed-in visitors are sent to /lift by the middleware before this runs.
export default function Home() {
  redirect("/login");
}
