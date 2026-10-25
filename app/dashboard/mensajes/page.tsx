import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MessageForm from "./message-form";

export default async function MensajesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "cliente") redirect("/dashboard");

  const [{ data: properties }, { data: messages }] = await Promise.all([
    supabase.from("properties").select("id, address").eq("client_id", user.id),
    supabase
      .from("client_messages")
      .select("id, message, created_at, read_at, properties(address)")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h1 style={{ fontSize: 30 }}>Mensajes</h1>
      <div className="card" style={{ maxWidth: 560 }}>
        <strong>Escríbenos un mensaje</strong>
        <div style={{ marginTop: 14 }}>
          <MessageForm properties={properties ?? []} />
        </div>
      </div>
      <div className="card">
        <strong>Historial</strong>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
          {messages?.map((m: any) => (
            <div key={m.id} className="visit-row" style={{ alignItems: "flex-start" }}>
              <div>
                <p style={{ fontSize: 14 }}>{m.message}</p>
                <span className="muted" style={{ fontSize: 12 }}>
                  {m.properties?.address ?? "General"} — {new Date(m.created_at).toLocaleString("es-ES")}
                </span>
              </div>
              <span className="muted" style={{ fontSize: 12 }}>{m.read_at ? "Leído" : "Pendiente de leer"}</span>
            </div>
          ))}
          {!messages?.length && <p className="muted" style={{ fontSize: 14 }}>Todavía no has escrito ningún mensaje.</p>}
        </div>
      </div>
    </div>
  );
}
