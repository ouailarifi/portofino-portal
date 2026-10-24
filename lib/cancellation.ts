// Reglas de permanencia y penalización confirmadas para el contrato Portofino
// (facturación anual = 12 meses de compromiso; sin permanencia en Flexible):
//   Meses 1-3: periodo de prueba — baja libre, sin penalización (particulares y empresas).
//     Solo se cobran/mantienen las cuotas de los meses ya transcurridos, nada más.
//   A partir del mes 4: deducción fija del 30% sobre las cuotas no devengadas
//     (coincide con el derecho de desistimiento/reembolso proporcional del contrato:
//     "deducción del 30% ... en concepto de costes de regularización administrativa
//     y ajuste del compromiso anual").
//   El periodo de prueba de 3 meses cubre y excede el derecho legal de desistimiento
//     de 14 días naturales (contratación a distancia/fuera de establecimiento, LGDCU) —
//     no se necesita una ventana separada de 14 días porque ya está contenida en él.
export function monthsElapsed(start: Date, now: Date) {
  const days = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  return Math.floor(days / 30);
}

export function penaltyRate(monthElapsed: number, clientType: "particular" | "empresa") {
  if (monthElapsed < 3) return 0; // periodo de prueba: baja libre, sin penalización
  if (clientType === "empresa") return 1;
  return 0.3; // a partir del 4º mes: deducción fija del 30%
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
