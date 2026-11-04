import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// Comprueba que quien llama es un profesional activo. Devuelve su id o un error.
export async function requireProfessional() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" as const, status: 401 as const };
  const { data: profile } = await supabase.from("profiles").select("role, status").eq("id", user.id).single();
  if (profile?.role !== "profesional") return { error: "Solo para profesionales" as const, status: 403 as const };
  if (profile.status !== "activo") return { error: "Cuenta no activa" as const, status: 403 as const };
  return { user, supabase };
}

// Carga una visita SOLO si está asignada a este profesional.
export async function loadOwnVisit(visitId: string, professionalId: string) {
  const service = createServiceClient();
  const { data } = await service
    .from("visits")
    .select("id, property_id, professional_id, scheduled_date, status, arrived_at, departed_at, checklist, service_number, properties(address, plan, client_id)")
    .eq("id", visitId)
    .eq("professional_id", professionalId)
    .maybeSingle();
  return { service, visit: data as any };
}
