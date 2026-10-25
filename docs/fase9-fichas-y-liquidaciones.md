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
- Tipo de IVA: 21% general (cuotas de gestión y obras con materiales >40% de la base) / 10% reducido (mano de obra de mantenimiento en vivienda particular, o con materiales ≤40% de la base) — ver decisión 4

---

## Decisiones tomadas en esta fase (25 oct 2026)

1. **Pago a profesionales → ⚠️ REVERTIDO a manual.** El usuario eligió Stripe Connect con IBAN, pero al intentar construirlo (25 oct 2026) se comprobó contra la documentación real de Stripe que no es viable ahora:
   - Esta cuenta de Stripe, al activar Connect, quedó en la API nueva "Accounts v2" (ya no permite crear cuentas Connect clásicas vía `v1/accounts`, que es el método simple y lo que yo había asumido al tomar la decisión).
   - Con v2, para que el dinero llegue de verdad a un IBAN hace falta el stack completo de "Treasury for platforms" (cuenta financiera + dirección financiera + método de cobro + pago saliente), y el paso final de pago en EUR a un banco español está en **"private preview"** de Stripe: no se puede activar por API ni por el dashboard, hay que pedir acceso a Stripe sin garantía de cuándo (ni de si) lo conceden.
   - Se revirtió el código: `app/api/manager/professional-payments/[id]/pay/route.ts` vuelve a ser un registro manual (sin movimiento real de dinero por Stripe); se eliminó la ruta/botón de onboarding de Stripe Connect y el handler `account.updated` del webhook.
   - Las columnas `profiles.stripe_connect_account_id` / `stripe_connect_status` se dejan en la base de datos sin usar, por si en el futuro se consigue el acceso de Stripe y se retoma.
   - También se comprobó la vía "pago a tarjeta" (Instant Payouts a débito): requiere `POST /v1/transfers` y `POST /v1/payouts`, ninguna disponible en esta cuenta por el mismo motivo; y en la vía v2/Treasury, EUR solo contempla SEPA a IBAN (sin opción de tarjeta), que es la que está en private preview. Mismo bloqueo, cualquiera que sea el destino.
   - **Decisión final (25 oct 2026): pago manual por transferencia IBAN**, hecha de verdad por el usuario fuera de Stripe; la app solo registra el pago (concepto, importe, fecha, estado pagado/pendiente). No se reintentará Stripe Connect salvo que el usuario consiga el acceso de Stripe en el futuro.
2. **Formato del código de servicio:** `SRV-2026-0001-01` / `SRV-2026-0001-02`, donde:
   - El bloque `SRV-2026-0001` es el número de servicio correlativo del año.
   - El sufijo `-01` = visita de mantenimiento dentro del plan contratado.
   - El sufijo `-02` = trabajo facturado por presupuesto, fuera de las visitas contratadas.
3. **Bonificaciones del cliente:** campo de texto libre + importe manual opcional, anotado por el manager; no se aplica automáticamente a ningún cobro.

4. **Datos fiscales del emisor** — confirmados. Guardados como variables de entorno en Vercel (`ISSUER_NAME`, `ISSUER_NIF`, `ISSUER_ADDRESS`, `ISSUER_IVA_GENERAL=21`, `ISSUER_IVA_REDUCIDO=10`, `ISSUER_IAE_EPIGRAFE`), nunca en el código del repositorio.
   - El usuario aún no está dado de alta como autónomo; el NIF/dirección son los suyos personales y se usarán tal cual una vez se dé de alta.
   - Lógica de IVA aplicada por tipo de servicio:
     - Cuotas de gestión (planes Flexible/Anual): siempre 21% (no es una reforma/reparación, es un servicio de gestión).
     - Visita de mantenimiento (código `-01`): 10% si es solo mano de obra, o si aporta materiales cuyo coste no supera el 40% de la base imponible, y la vivienda es particular con más de 2 años de antigüedad. Si los materiales superan ese 40%, la operación completa pasa a tributar al 21% (no se puede dividir dentro de la misma factura).
     - Trabajo por presupuesto (código `-02`): igual regla — depende de si el peso de los materiales supera o no el 40% de la base.
   - Epígrafe IAE orientativo: 834.2 (administración de fincas / gestión de inmuebles) — pendiente de confirmar con una gestoría antes del alta real como autónomo; configurable sin tocar código.

## Progreso de implementación

- ✅ **Tarea 2 — Esquema de base de datos**: columnas nuevas en `profiles` (document_type, secondary_address, email_2, phone_2, observaciones, fiscal_address, bonus_note, bonus_amount, stripe_connect_account_id/status), tablas/función de número de servicio (`service_number_counters`, `next_service_number`), columnas `service_number` en `visits`/`quotes`.
- ✅ **Tarea 3 — Pago a profesionales**: cerrada, ver decisión 1 (manual por IBAN).
- ✅ **Tarea 4 — Alta de profesional y de cliente con los nuevos campos**:
  - Alta de profesional: añadidos tipo de documento (DNI/NIE/Pasaporte), dirección de domicilio fiscal y observaciones al formulario y a la ficha.
  - Alta de cliente: **nueva** (no existía ninguna UI de alta de cliente hasta ahora — los clientes se habían creado por SQL directo). Nuevo formulario "Dar de alta un cliente" en `/dashboard/manager/clientes` con nombre, email 1/2, teléfono español/2, tipo de documento + número, domicilio secundario y observaciones. La ficha del cliente ahora muestra estos campos.
  - Pendiente, fuera del alcance de esta tarea: todavía no hay un formulario para añadir el domicilio contratado (vivienda/`properties`) a un cliente ya creado — hoy se sigue haciendo por SQL. Lo añadiremos cuando construyamos el bloque de Liquidaciones embebido en la ficha (tarea 5), ya que esa es la vivienda sobre la que se da de alta el cobro recurrente.
  - Subida de documentos del profesional ampliada con los nuevos tipos (DNI anverso/reverso, contrato de colaboración firmado, certificado de contratistas y subcontratistas) — ya hecho en una iteración anterior de esta fase.
  - Documentación del cliente y vinculación del contrato de colaboración: se reutiliza el flujo ya existente (Documentación / firma electrónica), no se duplica en el alta.

## Decisiones ya tomadas en fases anteriores (no se repiten)
- Reembolsos a cliente: Stripe real a la misma tarjeta.
- Régimen fiscal del usuario: Autónomo.
- El 10% de la aceptación de un presupuesto ya está automatizado; firma/final y presupuestos adicionales se cobran manualmente desde Liquidaciones.
- Plantilla de contrato es un borrador (BORRADOR) pendiente de sustituir por la versión real del abogado antes de usar con clientes reales.
