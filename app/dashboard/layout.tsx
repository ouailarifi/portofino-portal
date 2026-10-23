import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./sign-out-button";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
        <span className="muted" style={{ marginRight: 16, fontSize: 14 }}>
          {user?.email}
        </span>
        <SignOutButton />
      </div>
      {children}
    </div>
  );
}
