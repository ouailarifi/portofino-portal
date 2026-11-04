"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton({ big = false }: { big?: boolean }) {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (big) {
    return (
      <button onClick={handleSignOut} className="pro-btn quiet">
        Cerrar sesión
      </button>
    );
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
