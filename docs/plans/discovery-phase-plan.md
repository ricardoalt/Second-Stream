# SecondStream: Plan de la Fase de Discovery

Basado en el análisis de los insights de la entrevista con Russ, el documento de Product Discovery y el reporte de investigación profunda, aquí está el diseño estratégico para la fase de **Discovery** (captura de información por agentes de campo).

Esta fase es el mayor cuello de botella porque los agentes se enfrentan a información asimétrica, fragmentada y altamente regulada. El objetivo de la plataforma no es ser un CRM, sino un sistema que transforma incertidumbre en un activo transaccionable y auditable.

---

## 1. Core Pain Points (Puntos de Dolor de los Field Agents)

*   **El "Nombre" del material es inútil:** Los clientes usan códigos internos (ej. "5850") o descripciones vagas. El agente debe descubrir la verdadera naturaleza química, el proceso que lo generó y su estado legal (waste vs. product).
*   **El abismo de la "Información Faltante" (Missing Info Loop):** El contacto en la planta (EHS) suele tener conocimiento variable. Los deals se congelan esperando respuestas, documentos o aprobaciones de terceros, matando el momentum de la venta.
*   **Conocimiento Tribal y Dependencia de la Memoria:** Saber qué preguntas críticas hacer (ej. *"¿Este solvente tiene agua?"*) o qué regulaciones aplican depende de la experiencia del agente. No existe una "enciclopedia" centralizada.
*   **El Dilema del Laboratorio (Lab vs. No Lab):** Pedir un análisis de laboratorio cuesta dinero ($1,500+) y tiempo. Pedirlo sin necesidad destruye margen; no pedirlo cuando el comprador lo exige arruina el deal.
*   **Opacidad en los Costos Reales:** Los clientes rara vez conocen su costo real de disposición. Las facturas están llenas de *fees* ocultos, lo que dificulta al agente calcular el margen y demostrar ahorros.
*   **Riesgo Regulatorio y Logístico:** La misma sustancia cambia de clasificación según su origen. Si el material es crítico para la producción (ej. si no se mueve, la fábrica se detiene), la logística exige redundancia inmediata.

---

## 2. Flujo de Trabajo Propuesto (Workflow del Field Agent)

Para construir un "System of Action", el flujo pasa de "tomar notas" a "construir un pasaporte de material auditable".

*   **Paso 1: Captura Multimodal en Terreno (Field Intake):** El agente llega a la planta. En lugar de teclear en formularios, toma fotos de contenedores/etiquetas, escanea códigos de barras, sube PDFs (SDS, facturas, manifiestos) y graba notas de voz con el contexto.
*   **Paso 2: Ingesta y Estructuración Automática (AI Processing):** El sistema procesa los inputs en background y puebla un **"Deal Canonical Schema"** (el borrador del pasaporte del material).
*   **Paso 3: Discovery Copilot (Entrevista Dinámica):** Mientras el agente sigue con el cliente, la plataforma cruza los datos con su motor de reglas y lanza alertas en tiempo real: *"Falta preguntar el proceso generador"* o *"Pregunta si hay límite de metales pesados"*.
*   **Paso 4: Evaluación de Evidencia y Compliance Gate:** El sistema clasifica la confiabilidad de los documentos (ej. *"Análisis de 4 años, riesgo alto"*). Recomienda si se necesita prueba de laboratorio o un *trial load*.
*   **Paso 5: Consolidación del "Material Passport":** Se genera un perfil estandarizado vinculado a un *Evidence Graph* (cada dato tiene su prueba), listo para el Buyer QA o para la propuesta comercial.

---

## 3. Visión UI/UX (Dentro de "Projects")

La interfaz en Next.js estará optimizada para **Mobile-First** (para uso en planta) y se expandirá a un **"Deal Command Center"** en desktop.

### Layout Principal: "Material Passport / Deal View"

*   **Header (Status & Criticality):** 
    *   Progreso: `Draft` → `Incomplete` → `Compliant-Ready` → `Buyer-Ready`.
    *   Tags de prioridad: `Production-Critical`, `Export-Restricted`.
*   **Panel Izquierdo (Structured Data & Evidence Confidence):**
    *   Campos: Familia, Proceso Generador, Volumen, Empaque.
    *   **Semáforos de Confianza:** Verde (evidencia confirmada), Amarillo (inferido por IA, requiere revisión), Rojo (falta evidencia).
*   **Panel Central (Action Center & Copilot):**
    *   **Missing Info Tracker:** Lista de tareas bloqueantes asignables (ej. "Esperando SDS de EHS").
    *   **AI Copilot Feed:** Feed contextual sugiriendo acciones (ej. *"En la foto se ven tanques ISO. ¿El cliente tiene loading capability?"*).
*   **Panel Derecho (Evidence Graph & Cost Normalizer):**
    *   Visor de documentos. Al hacer clic en un dato (ej. "Densidad"), abre el PDF resaltando la línea origen.
    *   Desglose de costos (factura original vs. costo efectivo calculado).

---

## 4. Funciones de IA para Eliminar el Cuello de Botella

El objetivo es reducir riesgo, estructurar datos y tomar decisiones determinísticas, no generar texto genérico.

1.  **Voice-to-Structured-Data (Field Notes AI):**
    *   El agente dicta notas de la visita. La IA transcribe y mapea a campos específicos (`Empaque`, `Volumen`, `Urgencia`, `Costo`) sin data entry manual.
2.  **Vision & Document Parsing (Evidence Graph Builder):**
    *   **Fotos:** Analiza imágenes para identificar empaques, estado (oxidación, fugas) y discrepancias.
    *   **Documentos (SDS, Profiles, Facturas):** Extrae información profunda y detecta contradicciones legales/químicas.
3.  **Material Discovery Copilot (Motor de Preguntas Dinámicas):**
    *   Motor de Reglas + LLM. Si detecta un solvente, inyecta en el checklist: *"Pregunta el % de agua"*. Guía al agente junior como si fuera un senior.
4.  **Cost Normalizer (Descomposición de Facturas):**
    *   Extrae *line items* (fees ocultos, transporte) de fotos de facturas y calcula el **costo efectivo real**, revelando el margen negociable.
5.  **Lab Decision Engine (Predictor de Laboratorio):**
    *   Evalúa el material y recomienda si pedir un test de laboratorio ($1500+) o intentar un *trial load*, optimizando márgenes y tiempos.