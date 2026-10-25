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
  - Subida de documentos del profesional ampliada con los nuevos tipos (DNI anverso/reverso, contrato de colaboración firmado, certificado de contratistas y subcontratistas) — ya hecho en una iteración anterior de esta fase.
  - Documentación del cliente y vinculación del contrato de colaboración: se reutiliza el flujo ya existente (Documentación / firma electrónica), no se duplica en el alta.
  - Pendiente aparte de todas las tareas de Fase 9: seguir sin un formulario para añadir el domicilio contratado (vivienda/`properties`) a un cliente — hoy se sigue haciendo por SQL directo. No bloquea nada de lo construido hasta ahora porque el bloque de Liquidaciones y "dar de alta el pago recurrente" operan sobre viviendas ya existentes.
- ✅ **Tarea 5 — Vista de ficha de cliente (cuotas/visitas/bonificaciones/notificaciones + Liquidaciones embebidas)**:
  - Contador de visitas del mes y del año en curso (agregado de todas las viviendas del cliente), en una nueva tarjeta "Resumen".
  - Bonificación: texto libre + importe manual, editable desde la propia ficha (`BonusForm` → `/api/manager/clients/[id]/bonus`), usando las columnas `bonus_note`/`bonus_amount` ya creadas en la tarea 2.
  - Bandeja de "Notificaciones": solicitudes de cambio de plan (`plan_upgrade_requests`, con botones para aplicar el cambio de plan o descartar la petición — nuevo endpoint `/api/manager/plan-upgrade-requests/[id]/resolve`), bajas en curso (`properties.subscription_status = 'baja_solicitada'`), y mensajes escritos por el cliente (tabla nueva `client_messages`, con RLS: el cliente inserta/lee los suyos, el manager los lee y los marca como leídos). Las solicitudes de presupuesto ya tenían su propia tarjeta y siguen ahí (son también una notificación).
  - **Nuevo**: los clientes ahora pueden escribir un mensaje libre al manager desde `/dashboard/mensajes` (añadido a su menú).
  - Bloque de "Liquidaciones de esta vivienda" embebido dentro de cada tarjeta de vivienda en la ficha del cliente:
    - Pausar/reanudar el cobro recurrente (reutiliza el botón ya existente de Liquidaciones).
    - Cancelar (dar de baja) aplicando la misma lógica de periodo de prueba/desistimiento/30% que la baja autogestionada por el cliente — nuevo endpoint `/api/manager/properties/[id]/cancel`, con el cobro de la posible penalización a la tarjeta del cliente.
    - Dar de alta el pago recurrente cuando el cliente no lo ha autogestionado: el manager elige plan, modalidad, cuota mensual, fecha de inicio y (opcional) fecha de fin — nuevo endpoint `/api/manager/properties/[id]/activate-recurring`. La fecha de fin se traduce en un `cancel_at` de la suscripción de Stripe (decisión técnica: Stripe no tiene un campo de "fecha de fin" aparte, así que se usa su propio mecanismo de cancelación programada en vez de añadir una columna nueva). Requiere que el cliente ya tenga un método de pago guardado.
    - Reembolso manual por Stripe a la tarjeta del cliente, listado pago a pago (reutiliza el botón ya existente de Liquidaciones).
    - Cobro manual (incluye el caso de cobrar la cuota inicial del plan flexible): se reutiliza el formulario de cobro manual ya existente, embebido en la ficha y preseleccionado para este cliente.

- ✅ **Tarea 6 — Código de servicio real + ficha de profesional (servicios, pago por servicio, total facturado anual)**:
  - El número de servicio (`SRV-2026-0001-01`/`-02`, decisión 2) ya se asigna de verdad: al asignar un profesional a una visita o a un presupuesto desde el selector existente (`AssignProfessionalSelect` → `/api/manager/assign`), si todavía no tenía número, se le asigna uno con `next_service_number()` (-01 visita, -02 presupuesto). Antes solo existía la función en la base de datos; ahora está conectada al flujo real.
  - Ficha del profesional: cada visita y cada presupuesto asignado muestra su número de servicio, y si no está pagado aparece un botón "Pagar" (motivo + importe manual) que registra el pago como ya hecho por transferencia IBAN (un solo paso, no el flujo de dos pasos pendiente→pagado de Liquidaciones general, porque aquí el manager ya ha hecho la transferencia antes de entrar a registrarla) — nuevo endpoint `/api/manager/professional-payments/pay-now`, vinculado al `visit_id`/`quote_id` para la trazabilidad.
  - Nueva tarjeta "Total facturado con nosotros en &lt;año&gt;": suma de todos los pagos (visitas + presupuestos) ya pagados al profesional este año.
  - Pendiente, explícitamente aplazado por el usuario: NPS/valoración de clientes sobre el profesional (encuesta de satisfacción) — fase futura.

- ✅ **Tarea 7 — Menú "Liquidaciones" simplificado + añadir método de pago**:
  - `/dashboard/manager/liquidaciones` ahora empieza con un selector: Cliente/Profesional → persona. Al elegir una, aparece un panel con solo las acciones que le corresponden: para un cliente, cobrar / pausar (retener) / cancelar por cada vivienda, y un enlace a su ficha completa para todo lo demás (notificaciones, documentación…); para un profesional, la lista de servicios pendientes de pago con su botón "Pagar", y enlace a su ficha completa. Esto resuelve el problema original reportado ("no especifica a qué cliente cobrar") moviendo el cobro/pago a un flujo guiado por persona en vez de un formulario genérico. Las listas generales (historial de cobros, pausar/reanudar, pagos a profesionales) se mantienen debajo como vista de conjunto.
  - "Añadir método de pago" en nombre de un cliente: nuevo endpoint `/api/manager/payment-methods/[clientId]` (listar/crear SetupIntent) y `/api/manager/payment-methods/[clientId]/[pmId]` (eliminar), con la misma mecánica PCI-segura que ya usaba el cliente en Configuración (Stripe Elements, tokenización en el navegador, el número de tarjeta nunca pasa por nuestro servidor ni se guarda en la base de datos) y la misma regla: no se puede eliminar el único método de pago sin haber añadido antes uno nuevo válido (comprobado contra Stripe, no solo en el botón). Disponible tanto desde el selector de Liquidaciones como desde la propia ficha del cliente.
  - **Ajuste de alcance, por la decisión 1 (pago a profesionales revertido a manual por IBAN)**: "añadir método de pago" solo tiene sentido para clientes (se les cobra por Stripe). A los profesionales ya no se les paga por Stripe (es transferencia manual fuera de la app), así que no se les pide ni se les guarda ninguna tarjeta — no es una omisión, es consecuencia directa de la decisión 1 ya documentada.

- ✅ **Tarea 8 — Menú "Documentación" reestructurado (Manager/Cliente/Profesional)**:
  - `/dashboard/documentacion` (vista manager) ahora tiene 4 pestañas: **Contratos** (lo que ya había: plantilla + contratos firmados), **Nuestra documentación** (nueva — contrato tipo genérico, nuestro RC, nuestro recibo de RC, otros; tabla y bucket nuevos `manager_documents`/`manager-documents`), **Clientes** (selector de cliente → ver/subir/eliminar su documentación) y **Profesionales** (selector de profesional → ver/subir/eliminar la suya).
  - Añadida la opción de **eliminar** documentos, que no existía todavía para clientes ni profesionales (solo se podía subir y ver) — nuevos endpoints `DELETE /api/client-documents/[id]`, `DELETE /api/professional-documents/[id]`, `DELETE /api/manager-documents/[id]`. También añadido el botón de eliminar en las fichas de cliente/profesional (no solo en el nuevo menú de Documentación).
  - **Bug encontrado y corregido de paso**: el formulario de subida de documentos del profesional (tarea 4) ya ofrecía los tipos nuevos (DNI anverso/reverso, contrato de colaboración, certificado de contratistas), pero tanto la validación del endpoint como el `check` de la base de datos seguían con la lista antigua — cualquier subida de esos tipos nuevos habría fallado. Corregido en ambos sitios.

- ✅ **Tarea 9 — Facturación (manual a clientes, recibo automático en cada cobro, autofactura a profesionales)**:
  - Numeración propia por serie y año: tabla `invoice_counters` + función `next_invoice_number(p_series, p_prefix)` (análoga a `next_service_number`, pero sin exigir `is_manager()` porque solo se llama desde código de servidor ya protegido — webhooks de Stripe con el cliente de rol de servicio, o endpoints ya protegidos por `is_manager()`). Tabla `invoices` (serie/número/cliente/profesional/vivienda/pago/concepto/base/IVA/total/números de servicio relacionados/ruta en storage/destinatario del envío) con RLS (el manager ve/gestiona todo; cada cliente o profesional solo ve las suyas). Bucket privado nuevo `invoices`.
  - Módulo `lib/invoicing.ts`: genera el PDF (mismo estilo que los contratos, con los datos fiscales del emisor leídos de las variables de entorno de la decisión 4), lo sube al bucket, inserta la fila en `invoices` y envía el PDF por email como adjunto (si `RESEND_API_KEY` está configurada). Tres funciones: `generateFacturaCliente` (factura manual al cliente), `generateReceiptForPayment` (recibo automático), `generateAutofacturaProfesional` (autofactura al profesional).
  - **Recibo automático en cada cobro**: conectado en los 7 puntos del código donde se inserta un pago con `status: "cobrado"` (cobro manual desde Liquidaciones/ficha de cliente, los dos insertados del webhook de Stripe — cuota recurrente y checkout de alta/presupuesto —, activación de pago recurrente, y las dos bajas con penalización — autogestionada y por el manager). Si falla la generación/envío del recibo, el cobro ya registrado no se deshace (solo queda sin recibo, visible para reintentarlo manualmente en el futuro si hiciera falta).
  - **Autofactura a profesionales**: conectada en los dos puntos donde un pago a profesional pasa a `status: "pagado"` (el pago rápido vinculado a un servicio concreto desde la ficha del profesional, y el "marcar como pagado" del flujo general pendiente→pagado de Liquidaciones). Misma regla de que un fallo en la autofactura no deshace el pago ya registrado.
  - **Factura manual al cliente**: nuevo botón "Generar factura" en la tarjeta "Facturación" de la ficha del cliente (antes de "Método de pago"), con formulario (concepto, base imponible, tipo de IVA 21%/10%/exento, vivienda relacionada opcional, nº de servicio relacionado opcional) → `POST /api/manager/invoices/factura` (protegido con `is_manager()`) → genera el PDF, lo envía por email y devuelve el enlace de descarga inmediato. La misma tarjeta lista el historial de facturas/recibos ya generados para ese cliente (número, concepto, importe, fecha, PDF). En la ficha del profesional se añadió una tarjeta "Autofacturas" equivalente, solo de lectura (se generan solas, no hay botón manual ahí).
  - **Dudas/puntos abiertos para revisar a la vuelta** (siguiendo la instrucción de acumularlas en vez de preguntar):
    1. No existe todavía una vista de "historial de facturación" a nivel global (todas las facturas/recibos de todos los clientes/profesionales en un solo sitio) — hoy solo se ve por ficha individual. La Tarea 10 (Liquidaciones generales Año→Mes) va a enlazar ahí cada movimiento con su factura/recibo, lo que cubre parte de esta necesidad; si se quiere además un listado plano de facturas con filtro por cliente/fecha/serie, sería una vista adicional no pedida explícitamente en el encargo original.
    2. El selector de IVA en el formulario manual ofrece 21%/10%/exento como opciones fijas; la decisión 4 ya documentada deja claro el criterio (mano de obra vs. materiales &gt;40%), pero la aplicación de ese criterio al elegir 21% vs 10% la sigue haciendo el manager a ojo, no el sistema — no se ha automatizado una sugerencia porque requeriría saber el desglose de materiales de cada servicio, dato que hoy no se registra en ningún sitio.
    3. Validación pendiente con una gestoría (ya anotada en la decisión 4): el epígrafe IAE 834.2 y el propio alta como autónomo. No afecta al código, solo a los valores reales de las variables de entorno el día que se dé de alta.

- ✅ **Tarea 10 — Liquidaciones generales (vista jerárquica Año → Mes)**:
  - Nueva página `/dashboard/manager/liquidaciones/generales`, enlazada desde el menú principal de Liquidaciones. Agrupa todas las filas de la tabla `invoices` (facturas y recibos a clientes = entradas; autofacturas a profesionales = salidas) por año y luego por mes, usando `<details>/<summary>` para que se pueda plegar/desplegar sin JavaScript adicional.
  - Cada año y cada mes muestran el total de entradas y de salidas desglosado en base (sin IVA), IVA y total (con IVA).
  - Cada movimiento individual enlaza directamente a su PDF (factura/recibo/autofactura) ya generado en la Tarea 9, con el nombre del cliente o profesional y el número de serie.
  - No se ha creado ninguna tabla nueva para esto: se apoya íntegramente en lo ya construido en la Tarea 9 (`invoices` + storage), que es justo lo que hace posible esta vista sin tener que recalcular nada a partir de `payments`/`professional_payments`.

- ✅ **Fix crítico (25 oct 2026, tras pruebas reales del cliente): `is_manager()` causaba "stack depth limit exceeded"**:
  - La función `is_manager()` no era `SECURITY DEFINER`, así que al ejecutarse volvía a consultar `profiles`, cuya propia política de RLS llama otra vez a `is_manager()` → recursión infinita → Postgres cortaba con el error "stack depth limit exceeded". Esto rompía, como mínimo, la solicitud de presupuesto de un cliente (reproducido y confirmado con una inserción de prueba). Arreglado marcando la función como `SECURITY DEFINER` (patrón estándar de Supabase para evitar justo este problema), verificado con la misma prueba ya sin error.
  - **Dar de alta una vivienda a un cliente**: no existía ningún formulario para esto (ya estaba anotado como pendiente); se hacía por SQL directo. Nuevo botón "Dar de alta una vivienda" en la ficha del cliente (`/api/manager/clients/[id]/properties`), con dirección, tipo de vivienda, zona, plan, modalidad de facturación, cuota mensual, tipo de cliente y fecha de inicio de contrato. Solo crea la vivienda — el cobro recurrente se activa después con el formulario ya existente en el bloque de Liquidaciones de esa misma ficha. Esto también resuelve, como consecuencia, que un cliente sin vivienda no veía ningún plan en "Mi plan" ni ninguna vivienda que marcar en "Calendario": ambas páginas dependen de que exista al menos una vivienda.
  - **Fix previo relacionado, mismo día**: el menú del manager (y cualquier página dinámica) podía mostrar una foto desactualizada al navegar fuera y volver dentro de los 30s (caché de navegación de Next.js — `staleTimes.dynamic`), haciendo parecer que un alta recién hecha "desaparecía" aunque sí estaba guardada en la base de datos. Corregido forzando `staleTimes.dynamic = 0` en `next.config.mjs`. Los mensajes del cliente (`client_messages`) reportados como "no aparece en el historial" eran exactamente este caso — confirmado que sí se habían guardado correctamente.

## Decisiones ya tomadas en fases anteriores (no se repiten)
- Reembolsos a cliente: Stripe real a la misma tarjeta.
- Régimen fiscal del usuario: Autónomo.
- El 10% de la aceptación de un presupuesto ya está automatizado; firma/final y presupuestos adicionales se cobran manualmente desde Liquidaciones.
- Plantilla de contrato es un borrador (BORRADOR) pendiente de sustituir por la versión real del abogado antes de usar con clientes reales.
