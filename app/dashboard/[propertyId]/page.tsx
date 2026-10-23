import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABEL: Record<string, string> = {
  programada: "Programada",
  hecha: "Realizada",
  fallida: "No realizada",
};

export default async function PropertyVisitsPage({
  params,
}: {
  params: { propertyId: string };
}) {
  const supabase = createClient();

  const { data: property } = await supabase
    .from("properties")
    .select("id, address")
    .eq("id", params.propertyId)
    .single();

  if (!property) notFound(); // RLS ya impide ver viviendas ajenas: esto cubre el 404 normal.

  const { data: visits } = await supabase
    .from("visits")
    .select("id, scheduled_date, completed_date, status")
    .eq("property_id", params.propertyId)
    .order("scheduled_date", { ascending: false });

  return (
    <div>
      <p className="muted" style={{ marginBottom: 4 }}>
        <Link href="/dashboard">← Sus viviendas</Link>
      </p>
      <h1 style={{ fontSize: 32, marginBottom: 24 }}>{property.address}</h1>

      <h2 style={{ fontSize: 20, marginBottom: 16 }}>Historial de visitas</h2>

      {!visits?.length && <p className="muted">Todavía no hay visitas registradas.</p>}

      <div className="visit-list">
        {visits?.map((v) => (
          <Link
            key={v.id}
            href={`/dashboard/${params.propertyId}/visits/${v.id}`}
            className="visit-row"
          >
            <span>{v.completed_date ?? v.scheduled_date ?? "Sin fecha"}</span>
            <span className="muted">{STATUS_LABEL[v.status] ?? v.status}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
