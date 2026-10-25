# Fase 9 — Fichas completas (cliente/profesional), Liquidaciones por persona, Documentación reestructurada, Facturación y Liquidaciones generales

Especificación tal como la ha pedido el usuario (25 oct 2026), organizada antes de construir nada. Pendiente de confirmar los puntos marcados con ❓ antes de implementar.

## A. Alta de profesional — campos de la ficha
- Nombre, apellidos
- DNI / NIE / Pasaporte
- Dirección de domicilio fiscal
- Teléfono
- Email
- Documentos (adjuntos, cada uno sustituible/actualizable):
  - Seguro de responsabilidad civil (RC)
  - Recibo de pago del RC
  - DNI anverso
  - DNI reverso
  - Contrato de colaboración firmado
  - Certificado de contratistas y subcontratistas
- Zona de observaciones (texto libre)
- Alta en Stripe Connect (IBAN) para poder pagarle por Stripe — ver decisión 1 más abajo.

## B. Alta de cliente — campos de la ficha
- Nombre, apellidos
- DNI / NIE / Pasaporte
- Contrato de colaboración (ya existe como firma electrónica en Documentación — se vincula, no se duplica)
- Domicilio contratado (vivienda principal bajo gestión)
- Domicilio secundario
- Email 1, Email 2
- Teléfono español, Teléfono 2
- Zona de observaciones (texto libre)

(Ya existen varios de estos campos de la Fase 6 — esta fase amplía la ficha con los que faltan: NIE/pasaporte como alternativa a DNI, domicilio secundario, email 2, teléfono 2, observaciones.)

## C. Vista al entrar en la ficha de un cliente
- Cuotas cobradas (ya existe)
- Tipo de plan (ya existe)
- Días/meses restantes de periodo de prueba, si aplica (ya existe `trialAndWithdrawalStatus`)
- Visitas en el mes en curso y en el año en curso (contador)
- Bonificaciones — texto libre + importe manual opcional (ver decisión 3)
- Notificaciones / bandeja de la ficha: solicitudes de presupuesto, solicitud de cambio de plan, solicitud de baja, mensajes escritos por el cliente
- Bloque de Liquidaciones **dentro de la propia ficha** (no solo en el menú general):
  - Pausar cobro recurrente
  - Cancelar (dar de baja, aplicando la lógica de periodo de prueba/desistimiento/30% ya existente)
  - Reembolso manual por Stripe a su tarjeta (cantidad libre) — ya existe como funcionalidad, se repite aquí en contexto
  - Dar de alta nosotros el pago recurrente (si no se ha autogestionado): elegir plan, cantidad, fecha de inicio y fin
  - Cobrar la cuota inicial manualmente (caso plan flexible) si no se ha cobrado aún

## D. Vista al entrar en la ficha de un profesional
- Documentación cargada, con opción de volver a subir (sustituir) cada documento si caduca/cambia
- Listado de visitas/servicios realizados, con estado pagado/no pagado
- Para cada servicio no pagado: botón "Pagar" → introducir motivo + cantidad manual → se envía por Stripe Connect a la cuenta bancaria del profesional
- Confirmado: los profesionales **nunca** tienen pagos recurrentes, todo es manual por servicio
- Total facturado con nosotros por año (agregado de presupuestos libres + visitas), con detalle de servicios
- NPS / valoración de clientes sobre el profesional — cuando se lance la encuesta de satisfacción (fase futura, ya anotada en pendientes)

## E. Facturación
- Botón "Generar factura" en la ficha del cliente → formulario con los datos necesarios → PDF enviado por email (Resend)
- Recibo automático cada vez que se cobra una cuota/cargo (datos básicos, enviado por email)
- "Autofactura" a profesionales: documento generado con los datos que el profesional ha aportado en su ficha, con el detalle de servicios pagados en el periodo, enviado a su email
- ❓ Para que las facturas sean válidas fiscalmente, faltan los datos del emisor (ver preguntas)
- Numeración de factura correlativa obligatoria por ley española — se implementará con un contador interno por año fiscal

## F. Menú "Liquidaciones" (general, arriba) — simplificado
Flujo: seleccionar **Cliente** o **Profesional** → seleccionar la persona → aparecen las acciones: Cobrar / Pagar / Retener / Pausar / Cancelar (según corresponda a cliente o profesional).
- Dentro de cada ficha (cliente o profesional): botón "Añadir método de pago" — el manager puede registrar una tarjeta en su nombre (p. ej. durante el alta en persona). Regla: no se puede eliminar el único método de pago sin haber añadido antes uno nuevo válido (siempre debe quedar al menos uno activo).
  - Implementación segura: el formulario de tarjeta usará Stripe Elements (tokenización en el navegador) — el número de tarjeta no pasa nunca por nuestro servidor ni se guarda en la base de datos, solo el token de Stripe. Esto es obligatorio por cumplimiento PCI, no es opcional.

## G. Menú "Documentación" (arriba) — reestructurado
- Selector de vista: **Manager** / **Cliente** / **Profesional**
  - Manager: documentación propia de la empresa (contrato tipo genérico, nuestro RC, nuestro recibo de RC, otros documentos) — subir/sustituir/ver
  - Cliente: elegir cliente de una lista → ver, adjuntar, eliminar su documentación
  - Profesional: elegir profesional de una lista → ver, adjuntar, eliminar su documentación

## H. Código de servicio
- Cada servicio (presupuesto aceptado o visita) recibe un número de servicio único, asignado también al profesional que lo realiza
- Todo pago/cobro relacionado con ese servicio queda vinculado a su número
- La factura/autofactura de ese servicio incluye: número de servicio, dirección de la vivienda, importe facturado
- Formato: `SRV-2026-0001-01` (visita de mantenimiento) / `SRV-2026-0001-02` (trabajo por presupuesto fuera de las visitas contratadas) — ver decisión 2

## I. "Liquidaciones generales" — vista global mensual/anual
Nuevo submenú dentro de Liquidaciones, con vista jerárquica Año → Mes:
- Total que entra / que sale en el periodo, con el listado de números de servicio asociados a cada movimiento
- Para cada movimiento: enlace a su factura (si es un cobro) o autofactura (si es un pago), para no perder la trazabilidad de ningún servicio
- Totales con IVA y sin IVA en cada vista (mensual y anual)
- Pendiente del tipo de IVA aplicable — depende de los datos fiscales (decisión 4, aún sin confirmar)

---

## Decisiones tomadas en esta fase (25 oct 2026)

1. **Pago a profesionales → Stripe Connect con IBAN.** Cada profesional completará una vez un alta de verificación de identidad en Stripe (Connect); a partir de ahí los pagos por visitas/presupuestos se hacen por transferencia real a través de Stripe, con trazabilidad completa. Sustituye al pago manual/transferencia bancaria fuera de Stripe decidido en la fase anterior.
2. **Formato del código de servicio:** `SRV-2026-0001-01` / `SRV-2026-0001-02`, donde:
   - El bloque `SRV-2026-0001` es el número de servicio correlativo del año.
   - El sufijo `-01` = visita de mantenimiento dentro del plan contratado.
   - El sufijo `-02` = trabajo facturado por presupuesto, fuera de las visitas contratadas.
3. **Bonificaciones del cliente:** campo de texto libre + importe manual opcional, anotado por el manager; no se aplica automáticamente a ningún cobro.

## Pendiente de confirmar (bloqueante para facturación real)

4. **Datos fiscales del emisor** — para generar facturas/autofacturas reales (no solo recibos informativos) necesito: razón social o nombre completo, NIF, dirección fiscal, y si aplica IVA (régimen general 21%, exento, u otro) y qué actividad/epígrafe se facturará.

## Decisiones ya tomadas en fases anteriores (no se repiten)
- Reembolsos a cliente: Stripe real a la misma tarjeta.
- Régimen fiscal del usuario: Autónomo.
- El 10% de la aceptación de un presupuesto ya está automatizado; firma/final y presupuestos adicionales se cobran manualmente desde Liquidaciones.
- Plantilla de contrato es un borrador (BORRADOR) pendiente de sustituir por la versión real del abogado antes de usar con clientes reales.
