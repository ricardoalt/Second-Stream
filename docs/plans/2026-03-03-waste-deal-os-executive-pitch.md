# Pitch de Producto: De "AI Proposal Generator" a "Waste Deal OS"
**Objetivo de este documento:** Presentar al equipo la propuesta de reestructuración del producto (Fase 1: Discovery) basada en las llamadas con el cliente (Russ) y la investigación de mercado, demostrando que **NO necesitamos borrar la app actual**, sino recablear la experiencia de usuario (UX).

---

## 1. El Diagnóstico (¿Por qué debemos cambiar el flujo?)
En las llamadas recientes (Russ), validamos que nuestra premisa original ("La IA genera ideas de negocio para residuos") no es el dolor real. Sus ingenieros con 20 años de experiencia ya saben qué hacer con el material. 

**Los 4 Dolores Reales (El Cuello de Botella Operativo):**
1. **Esperar información congela las ventas (P0):** Recolectar datos (SDSs, análisis de laboratorio, volumetrías) a través de EHS es lento y caótico.
2. **Pricing Tribal (P0):** El conocimiento de a cuánto vender y a quién le compran, vive solo en la cabeza de los veteranos ("Steve").
3. **Decisiones de Laboratorio Caras (P1):** Gastar $1,500 en pruebas innecesarias, o no hacerlas y perder un trato.
4. **Miedo Regulatorio (P1):** Navegar el compliance (RCRA) y preparar el e-Manifest es un dolor de cabeza.

> *Insight:* "No venden residuos. Venden la capacidad de transformar incertidumbre y caos de datos, en un trato legal y rentable."

---

## 2. La Propuesta de Solución: Waste Deal OS
**Qué es:** Un "Discovery-to-Disposition Operating System". Un espacio de trabajo donde la IA no "inventa" ideas, sino que actúa como un asistente hiper-eficiente que estructura la evidencia, rastrea lo que falta, y aprende de los precios históricos.

**Nuestra Visión a Largo Plazo (Capas):**
*   **Fase 1 (Actual):** Discovery Assist & Material Passport.
*   **Fase 2:** Buyer Portal (Conectar Compradores).
*   **Fase 3:** Smart Matchmaking & Inversión.

---

## 3. ¿Cómo reutilizamos lo que ya tenemos? (No tiramos el código)
La excelente noticia es que **ya tenemos el 70% de la tecnología**. Nuestro backend en FastAPI con Pydantic-AI (Agentes de Documentos, Imagen, Notas de Voz) funciona perfecto. 

Solo vamos a **matar el botón "Generar Propuesta"** y vamos a **cambiar la Interfaz (Next.js)** para crear 2 nuevos artefactos:

| Lo que tenemos hoy | Lo que construiremos mañana (El Pivote) | Por qué (Razón de Negocio) |
| :--- | :--- | :--- |
| Formulario rígido de "Intake" | **1. Deal Workspace (Discovery Pack):** Un panel donde el agente sube audios y PDFs sueltos. La IA extrae la info y la pone en un panel visual. | El campo es caótico. El agente necesita subir fotos y audios, y que la IA ordene el desastre. |
| Intake Panel (Sugerencias AI) | **2. Missing Info Tracker:** Un semáforo de "blockers". "Tu deal está al 60%. Falta prueba de agua y Seguro de $3M". | Resuelve el P0: "Esperar info domina el funnel". El sistema te dice qué falta pedirle al cliente. |
| Generador de "Ideas de Negocio" | **3. El "Outcome Ledger" (Pricing):** Un pop-up obligatorio al cerrar la venta: "¿A qué precio vendiste y a quién?". | *Nuestro MOAT.* En 6 meses tendremos la única base de datos de precios de mercado de la industria. |
| Propuesta PDF inventada por IA | **4. Material Passport (Entregable):** Un dossier técnico limpio con métricas ESG (ahorro de CO2), Compliance y Laboratorios. Cero inventos de IA. | El comprador corporativo no quiere promesas de IA, quiere evidencia y cumplimiento legal (SB253). |

---

## 4. El Flujo Visual (Wireframe Conceptual de la Nueva App)

Así se verá la pantalla principal de un agente en la oficina (construida sobre nuestra UI actual):

```text
=================================================================================================
WASTE DEAL OS   |  Dashboard  |  Pipeline  |  [ Deal: Solvente - Texas ]       [👤 Mike]
=================================================================================================
[⚠️ PRODUCTION CRITICAL: YES] ➔ Regla Activa: Requiere Plan B de Salida Logística
-------------------------------------------------------------------------------------------------
 📥 DATA CAPTURE (La Base Actual)            |  🧠 INTELLIGENCE PANEL (Los Nuevos Motores)
                                             |
 📎 Sube Archivos (SDS, Invoices)            |  🚨 MISSING INFO TRACKER (El Tracker de Bloqueos)
 🎤 Graba Nota de Voz                        |  [🔴 CRÍTICO] Falta Test de Contenido de Agua
 [ SDS_Solvent_2024.pdf ] 🟢 Extraído        |      ↳ Impide cotizar. [✉️ Redactar Email al Cliente]
 [ Voice_Note_Lunes.mp3 ] 🟢 Transcrito      |  [🔴 OPS] Falta Seguro del Camión ($3M)
                                             |      ↳ Transportista bloqueado. [📎 Subir Póliza]
 📝 DISCOVERY PACK (La Información Extraída) |  -------------------------------------------------
                                             |  ⚖️ COMPLIANCE COPILOT (Regulatorio - Advisory)
 Identidad del Material                      |  [⚠️ F003 Probable] Solvente gastado.
 • Familia: Solvente 🪄 (Inferido)           |  [📍 Alerta TX] TCEQ requiere manifiesto extra.
 • Proceso: Limpieza 🔍 [Link a SDS pg.2]    |  -------------------------------------------------
                                             |  🔬 LAB DECISION ENGINE
 Especificaciones Técnicas                   |  Comprador usual exige agua <2%.
 • Químico: MEK (90%) 🪄                     |  💡 Recomendado: Prueba Karl Fischer ($150)
 • Flash point: 16°F 🔍 [Link a SDS pg.4]    |  ❌ NO pedir panel analítico completo ($1500)
 • Volumen: ~4 Tambores 🗣️ [Nota de Voz]    |  -------------------------------------------------
                                             |  💰 PRICING INTELLIGENCE (El Moat de Datos)
 🚚 LOGÍSTICA (Pickup Readiness)             |  Historial de tu empresa (MEK, Texas):
 [ ] Placards identificados (Clase 3)        |  • Trato #147: Se cerró a $0.12/lb (Ganado)
 [✓] Rampa de carga confirmada               |  • Trato #098: Se cerró a $0.10/lb (Ganado)
                                             |
=================================================================================================
[ Cancelar Deal ]                        [ ➔ Enviar a Revisión de Compliance / Gerente ]
```

---

## 5. Decisiones Arquitectónicas Críticas (El "Por Qué" Técnico)

Para no meter a la empresa en problemas legales (y para que la plataforma sea escalable), tomaremos 2 decisiones técnicas desde el Sprint 1:

1. **El "Evidence Graph" (Antídoto contra Alucinaciones):** 
   En el wireframe arriba ven un 🔍 `[Link a SDS pg.4]`. En la base de datos, los campos extraídos por IA (ej. Flash point) **no serán simples strings**, serán objetos que guardan un puntero al PDF original y la página exacta. Si el humano duda de la IA, hace clic y el PDF se abre resaltado. El comprador recibe pruebas, no alucinaciones.
2. **Data Governance & "Publish Boundary":** 
   *Riesgo Legal:* Russ mencionó que si guardamos cada borrador y nota, la empresa queda expuesta a auditorías (Discoverable Risk).
   *Solución Técnica:* Tendremos dos capas de base de datos. Una de **"Discovery/Trabajo"** (notas de voz, borradores) que se auto-purga a los 90 días de cerrar el trato. Y una de **"Compliance/Record"** (Pasaporte final aprobado, manifiestos) que se guarda por 7 años inmutablemente.

---

## 6. Roadmap: Próximos 2 Sprints

**Sprint 1: Fundación y Moat (No tirar código, recablear)**
*   Evolucionar el Modelo de Base de datos: Añadir el "Outcome Ledger" (forzar a preguntar a cuánto se vendió al cerrar el estado del trato).
*   Evolucionar `IntakeSuggestion` a "Evidence Graph" (añadir IDs de documento fuente).
*   Reescribir el Prompt del Proposal Agent: De "inventa ideas de negocio" a "ensambla el Material Passport (Ficha Técnica)".

**Sprint 2: El Dolor Diario**
*   Construir la UI del "Deal Workspace".
*   Crear el **Missing Info Tracker (v0)**: Crear los esquemas de requisitos (Qué se necesita para vender un solvente vs una chatarra metálica) y las alertas UI de bloqueos.
*   Crear el botón "Mapeo a e-Manifest" (Extraer en un JSON los campos listos para la EPA).

**Conclusión para el equipo:**
No estamos perdiendo el tiempo invertido. Hemos pasado de hacer una "demo de IA" a construir la infraestructura operativa que una empresa real de $10M de dólares usaría 8 horas al día.
