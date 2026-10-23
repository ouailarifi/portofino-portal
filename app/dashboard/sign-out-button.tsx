"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="muted"
      style={{ background: "none", border: "none", textDecoration: "underline", cursor: "pointer", fontSize: 14 }}
    >
      Cerrar sesión
    </button>
  );
}
