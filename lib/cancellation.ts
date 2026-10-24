// Reglas de permanencia y penalización confirmadas para el contrato Portofino
// (facturación anual = 12 meses de compromiso; sin permanencia en Flexible):
//   Meses 1-3: 65% de las cuotas pendientes · 4-6: 65% · 7-9: 50% · 10-12: 35%
//   Empresas: 100% siempre, cualquier mes.
export function monthsElapsed(start: Date, now: Date) {
  const days = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  return Math.floor(days / 30);
}

export function penaltyRate(monthElapsed: number, clientType: "particular" | "empresa") {
  if (clientType === "empresa") return 1;
  if (monthElapsed >= 12) return 0;
  if (monthElapsed >= 9) return 0.35;
  if (monthElapsed >= 6) return 0.5;
  return 0.65; // meses 0-5 (cubre también los meses 1-3, sin tramo propio definido en el contrato)
}

export function computeCancellation(params: {
  billingMode: string;
  contractStartDate: string;
  monthlyFee: number | null;
  clientType: "particular" | "empresa";
  now?: Date;
}) {
  const now = params.now ?? new Date();
  if (params.billingMode !== "annual") {
    return { insideCommitment: false, elapsed: null, remainingMonths: 0, rate: 0, penaltyAmount: 0, effectiveAt: now };
  }

  const elapsed = monthsElapsed(new Date(params.contractStartDate), now);
  const insideCommitment = elapsed < 12;
  const remainingMonths = Math.max(0, 12 - elapsed);
  const rate = insideCommitment ? penaltyRate(elapsed, params.clientType) : 0;
  const penaltyAmount = insideCommitment && params.monthlyFee ? round2(remainingMonths * params.monthlyFee * rate) : 0;

  const commitmentEnd = new Date(params.contractStartDate);
  commitmentEnd.setFullYear(commitmentEnd.getFullYear() + 1);
  const effectiveAt = insideCommitment ? commitmentEnd : now;

  return { insideCommitment, elapsed, remainingMonths, rate, penaltyAmount, effectiveAt, commitmentEnd };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
