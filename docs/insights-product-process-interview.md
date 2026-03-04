1) Lo que realmente están “vendiendo” (aunque parezca venta de waste)
No venden una propuesta de 8 líneas. Venden la capacidad de “resolver incertidumbre” (descubrimiento) y convertirla en un movimiento compliant + logístico + económicamente viable.
La propuesta es simple (“recogemos a X ¢/lb, frecuencia Y, se recicla…”).
El trabajo duro es:
convertir información incompleta/errónea en un “material definido operativamente”
determinar clasificación regulatoria (waste vs product / RCRA)
diseñar ruta logística realista (y a veces internacional)
crear redundancia si el material es crítico para producción
evitar lab bills innecesarios
Implicación de producto: el core no es “CRM de deals”, es un sistema de “Discovery-to-Disposition” con inteligencia y trazabilidad.
2) Fase 1: Discovery con el generador (facility) — el gran cuello de botella
2.1. “Nombre” del material casi nunca sirve
Russ dice que el nombre suele ser un código interno sin significado (“5850”, “B980”…).
Insight: el sistema NO puede depender de “product name” como clave primaria.
Lo que necesitan en realidad:
Qué es (tipo / familia: solvente usado, ácido, producto terminado, equipo, etc.)
Proceso que lo generó (esto cambia lo permitido legalmente)
Documentación disponible (SDS, waste profile, manifest, BOL, análisis)
Volumen / peso + (ideal) densidad (para inferir uno desde el otro)
Estado / forma / empaque (tanque, silo, contenedor, super sack, pallets, etc.)
Recurrencia (one-off vs semanal/mensual)
Prioridades del cliente (brand protection, “no export”, urgencia, etc.)
Costo actual real (incluyendo fees escondidos)
Deadline (ej. “en 10 días”, típico “dato sorpresa”)
Ubicación (origen condiciona regulación y logística)
2.2. El rol principal es EHS, pero es inconsistente
El contacto suele ser EHS/EHNS, con niveles de conocimiento muy variables:
algunos saben mucho de ambiente y regulaciones
otros son más “safety” o incluso “bean counter”
muchas respuestas dependen de que EHS “pregunte a alguien más” → bloqueos
Insight operativo: “esperar información” domina el funnel.
Necesidad: un sistema que “mantenga momentum” y reduzca “pending info”.
2.3. Regulación: cambia todo según “waste” vs “product”
Punto clave: la misma sustancia puede NO ser hazardous waste como producto, y SÍ serlo como “discarded”.
Esto hace que el discovery sea multidimensional:
Composición química (aprox)
Proceso que la generó
Estado legal (discarded vs reutilización)
Ruta de salida (end-use)
Riesgo/transport classification (otra taxonomía distinta a waste)
Insight: el “estado” del material es dinámico. Puede “convertirse” a producto si hay un uso legítimo (y documentación/justificación).
3) Documentos y evidencias: qué se pide y por qué
3.1. Documentos típicos y señales
SDS: útil para manejo/transport, no para análisis real (pero se usa como pista).
Waste profile: “ficha descriptiva completa” (muy útil).
Manifest: “BOL del hazardous waste”.
BOL (Bill of Lading): cuando se mueve como producto.
Lab analysis / analytical: cuando el material o el comprador lo exige, o cuando la info está vieja.
Insight de producto: el sistema debe tratar documentos como evidencia con confianza, no como “adjuntos”.
Cada doc debería tener:
fecha (freshness)
propósito (transport vs composición vs regulatorio)
cobertura (qué tests incluye)
confiabilidad (virgin vs spent, viejo vs reciente)
3.2. Decidir si pedir laboratorio NO es trivial
Hay “reglas por material” (ej. agua en ciertos solventes → mata el valor).
Pero muchas veces es feedback loop con potenciales compradores (“necesito análisis reciente”, “lo tuyo está viejo”).
Dolor: si pides muestras temprano → gastas $ y tiempo, y quizás no era necesario.
Necesidad: un “decision engine” que recomiende:
No pedir lab todavía
Pedir lab específico (no genérico)
Pedir “trial load” si el comprador no requiere muestra
4) Variables comerciales ocultas que cambian el pricing
4.1. “Costo real” casi nunca es el costo que creen
Russ dice que como un bill de teléfono, hay fees y líneas extra.
Insight: el sistema debe capturar el costo total efectivo, no solo “¢/lb”.
Recomendación de feature:
captura estructurada de invoice line items
cálculo automático de effective cost per lb/gal
comparación “current route vs proposed route”
4.2. “Criticidad para producción” determina el tipo de solución
Ejemplos: glycol en Texas, BMW: si no se mueve, se para producción.
Eso obliga a:
redundancia (2-3 outlets)
backup trucks / contingencias
contratos con mínimos garantizados
Insight: “criticality” es una variable de riesgo y SLA, no solo venta.
Si es crítico, el pricing y el diseño logístico cambian.
5) Discovery no termina en el cliente: se replica del lado del “dónde va”
Russ lo dice directo: el discovery con el facility se repite para encontrar salida.
Y muchas veces tampoco hablan con end-user; hablan con vendors/subcontractors.
Implicación: tu sistema necesita dos grafos:
Material → (evidencia) → Clasificación/constraints → Propuesta
Material → (requirements) → Red de outlets/vendors → Ruta logística → Trazabilidad
6) Transparencia y trazabilidad: tensión entre “saber más” y “riesgo legal”
Russ plantea una ambivalencia importante:
Por auditoría / compliance / riesgo internacional (ej. “terminó en acción militar”), conviene rastrear.
Pero “documentar de más” puede crear exposición legal (“discoverable”).
Insight de producto (muy serio):
la plataforma necesita un modelo de data governance:
qué guardas
por cuánto tiempo
quién accede
qué es “compliance-required” vs “nice-to-have”
cómo generas reportes sin sobreexponer
7) Caso SF6 gas cylinders: qué revela del sistema ideal
Este caso es oro porque muestra requisitos extremos:
inventario real ≠ inventario declarado (500 vs 800+)
urgencia por visita de VP + presión del Ministry of Environment
tracking al centésimo de libra
barcodes por unidad + fotos + serial + trazabilidad total
vendor primario (haz waste company) con subcontractors para separación/purificación
necesidad de “saber quién realmente lo procesó” aunque sea cadena indirecta
Insight: tu sistema debe soportar:
unidad individual (no solo “lotes”) cuando aplica
workflows tipo “field ops”: etiquetar, escanear, evidencia fotográfica
cadena de custodia multi-etapa multi-vendor
8) Qué quieren de AI (dicho explícitamente)
Russ lo dice súper claro: AI impacta cuando el vendedor captura info y el sistema devuelve:
Preguntas pertinentes que “no sabías preguntar”
“Si ingresas componente X, que salgan regulaciones y preguntas críticas”.
Regulaciones + interpretaciones + ejemplos
“EPA escribe explicación de 3 páginas porque el texto legal es como tax code”.
Conectar puntos internos
No tanto “AI aprende del mundo”, sino de pricing histórico interno + outcomes.
“El número viene del IP de Steve y del historial”.
Encontrar rutas nuevas (needle in haystack)
reducir etapas logísticas (3-4 legs → 1 leg)
descubrir outlets que nadie vio
9) Pain points principales (priorizados por impacto)
P0 — Bloqueos por información faltante
dependencia de terceros internos del facility
NDAs / onboarding / insurance (“$3M umbrella”) antes de hablar
docs viejos (2–5 años) → inutilizables
Resultado: el funnel se “congela” y se pierde track.
P0 — Conocimiento tribal para discovery y pricing
“no existe enciclopedia”
dependen de historia / memoria (“llama a alguien que movió esto hace 4.5 años”)
pricing es IP interna (comparativas vs disposal, conocimiento de outlets)
P1 — Decidir lab vs no lab
riesgo de gastar $1500 y no servir
necesidad de criterio material-specific + buyer-specific
P1 — Logística compleja (especialmente internacional)
bookings semanas/meses
transfer facilities, ISO, puertos, responsabilidades por tramo
requisitos de placards, equipos especiales (vacuum truck, pneumatic)
P2 — Intermediarios y “fishing”
leads no reales
intermediario protege al facility y “90% no va a ningún lado”
necesitan visibilidad del estado para no perder tiempo
10) Requisitos funcionales que se desprenden (en lenguaje de producto)
10.1. Modelo de datos mínimo (lo que sí o sí debe existir)
Material Intake (fase discovery)
Identidad: alias interno + familia + estado (waste/product/unknown)
Proceso generador (texto + tags + industria + equipo/linea)
Forma/packaging (tanque/silo/drums/supersacks/equipo)
Ubicación
Cantidad (peso/volumen) + densidad si existe
Recurrencia
Plazo/urgencia
Prioridades del cliente (brand/export/goal)
Cost baseline (invoice + line items)
Evidencias: SDS/profile/manifest/BOL/analysis (con fecha y confidence)
Constraints Engine
Reglas RCRA/transport/handling (con “por qué” y “qué falta preguntar”)
Checklist de “prep para pickup” (placards, equipos, loading capability, etc.)
Outlet Graph
outlets posibles + requisitos (análisis requerido, límites de agua, specs)
vendors/subcontractors + capabilities por región
trazabilidad (chain of custody)
10.2. Flujos críticos
Interview-to-Structured Intake (script guiado)
Missing Info Loop (tareas, recordatorios, SLA, responsables)
Lab Decision Workflow (recomendación + costo/beneficio + aprobación)
Proposal Builder (simple, 8 líneas, pero trazable al discovery)
Ops Automation (docs: BOL/manifest/commercial invoice, etc.)
11) Métricas que deberías medir (porque reflejan el dolor real)
Si quieres “probar” que el producto sirve, mide:
Time to First Viable Proposal (TFVP): desde primer contacto a propuesta viable
% deals bloqueados por missing info + tiempo promedio en estado “Waiting”
# follow-ups por dato (y cuál dato bloquea más: proceso, análisis, cantidad, costos)
Lab spend por deal y % labs “innecesarios” (no influyeron en decisión)
Win rate: intermediario vs contacto directo con facility
Re-trabajo: % casos donde “no era lo que dijeron” y cambió la solución
Costo efectivo calculado vs declarado (gap promedio)
On-time pickup readiness: % camiones que fallan por falta de preparación en sitio
12) Ideas de features (muy aterrizadas) que caen directo del transcript
A) “Material Discovery Copilot” (script inteligente)
pregunta dinámica según familia/proceso/packaging
detecta “nombre inútil” y fuerza a “ingrediente principal” + uso
sugiere “te falta preguntar X porque material Y suele fallar por Z”
B) “Evidence Freshness + Confidence”
semáforo de docs viejos
“este análisis tiene 4 años → riesgo alto”
diferencia SDS virgin vs spent
C) “Lab Decision Engine”
reglas por material (ej. water threshold)
feedback de outlets (“si quieres vender a X, necesitas test Y reciente”)
opción “trial load” vs “sample” recomendada
D) “Cost Normalizer”
sube invoices y calcula costo real
arma comparación y savings potencial
E) “Criticality Flag + Redundancy Planner”
pregunta explícita: “¿esto limita producción?”
si sí: exige 2–3 outlets y plan de contingencia
F) “Location-based Logistics Finder”
mapa por capacidad (vacuum truck, pneumatic, hazmat, etc.)
con requisitos mínimos (insurance, permits)
G) “Chain-of-Custody (multi-vendor)”
track vendor principal + subcontractors conocidos
“qué guardas” según modo (compliance vs business intelligence)
13) Una frase que resume el problema (para visión del producto)
“La propuesta es trivial; lo difícil es convertir un material ambiguo en un movimiento compliant y rentable sin perderse en el discovery.”
