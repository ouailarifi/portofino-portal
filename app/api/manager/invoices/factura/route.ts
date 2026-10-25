import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateFacturaCliente, signedInvoiceUrl } from "@/lib/invoicing";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "manager") return NextResponse.json({ error: "Solo el manager puede generar facturas" }, { status: 403 });

  const { clientId, propertyId, concept, baseAmount, ivaRate, serviceNumber } = await req.json().catch(() => ({}));
  if (!clientId || !concept || !baseAmount || Number(baseAmount) <= 0) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  try {
    const { path } = await generateFacturaCliente({
      clientId,
      propertyId: propertyId || null,
      concept,
      baseAmount: Number(baseAmount),
      ivaRate: ivaRate === "" || ivaRate == null ? null : Number(ivaRate),
      serviceNumber: serviceNumber || null,
    });
    const service = createServiceClient();
    const url = await signedInvoiceUrl(service, path);
    return NextResponse.json({ ok: true, url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "No se pudo generar la factura" }, { status: 400 });
  }
}
