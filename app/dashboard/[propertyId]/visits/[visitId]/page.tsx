import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const SIGNED_URL_TTL = 60 * 10; // 10 minutos: suficiente para ver la página, sin dejar enlaces abiertos.

export default async function VisitDetailPage({
  params,
}: {
  params: { propertyId: string; visitId: string };
}) {
  const supabase = createClient();

  const { data: visit } = await supabase
    .from("visits")
    .select("id, scheduled_date, completed_date, status, property_id")
    .eq("id", params.visitId)
    .single();

  if (!visit || visit.property_id !== params.propertyId) notFound();

  const [{ data: media }, { data: reports }] = await Promise.all([
    supabase
      .from("visit_media")
      .select("id, media_type, storage_path, sort_order")
      .eq("visit_id", params.visitId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("visit_reports")
      .select("id, storage_path, summary")
      .eq("visit_id", params.visitId),
  ]);

  // Las rutas guardadas en la base de datos no son URLs públicas — hay que
  // firmarlas una a una para que el navegador pueda cargarlas unos minutos.
  const mediaWithUrls = await Promise.all(
    (media ?? []).map(async (m) => {
      const { data } = await supabase.storage
        .from("visit-media")
        .createSignedUrl(m.storage_path, SIGNED_URL_TTL);
      return { ...m, url: data?.signedUrl };
    })
  );

  const reportsWithUrls = await Promise.all(
    (reports ?? []).map(async (r) => {
      const { data } = await supabase.storage
        .from("visit-reports")
        .createSignedUrl(r.storage_path, SIGNED_URL_TTL);
      return { ...r, url: data?.signedUrl };
    })
  );

  return (
    <div>
      <p className="muted" style={{ marginBottom: 4 }}>
        <Link href={`/dashboard/${params.propertyId}`}>← Historial de visitas</Link>
      </p>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>
        Visita del {visit.completed_date ?? visit.scheduled_date ?? "—"}
      </h1>

      {reportsWithUrls.map(
        (r) =>
          r.url && (
            <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="btn" style={{ marginBottom: 24 }}>
              Descargar informe en PDF
            </a>
          )
      )}

      <div className="media-grid">
        {mediaWithUrls.map(
          (m) =>
            m.url &&
            (m.media_type === "video" ? (
              <video key={m.id} src={m.url} controls />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={m.id} src={m.url} alt="Foto de la visita" />
            ))
        )}
      </div>

      {!mediaWithUrls.length && !reportsWithUrls.length && (
        <p className="muted">Todavía no se ha subido material de esta visita.</p>
      )}
    </div>
  );
}
