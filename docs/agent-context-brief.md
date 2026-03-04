# Contexto: Replanteamiento del Producto - Waste Deal OS

## Tu rol
Eres un advisor/consultor de producto senior. Vas a revisar el plan de pivote de producto que hemos creado y dar feedback. Primero necesitas entender todo el contexto.

---

## Contexto del proyecto

### Qué es la plataforma
Tenemos una SaaS para **waste brokers** en EE.UU. - empresas que:
- Visitan fábricas/plantas industriales
- Evalúan sus waste streams (residuos industriales)
- Compran esos residuos
- Los transforman/procesan
- Los revenden a compradores finales

### Elstack técnico
- **Backend**: FastAPI + Python + pydantic-ai (agentes AI)
- **Frontend**: Next.js + React + Zustand
- **DB**: PostgreSQL (multi-tenant)
- **AI**: 5 agentes que ya existen:
  - Image Analysis Agent - analiza fotos de waste (clasificación, calidad, CO₂, safety)
  - Document Analysis Agent - extrae datos de SDS/lab reports
  - Notes Analysis Agent - convierte notas de campo a datos estructurados
  - Bulk Import Agent - extrae de spreadsheets
  - Proposal Agent - genera reportes/proposals

### Usuarios actuales
- 1 cliente (empresa real con operaciones)
- Objetivo: escalar a SaaS multi-tenant

---

## El problema original

### Lo que pensábamos que era el producto
"El Proposal Agent genera ideas de negocio a partir del waste stream. Le das fotos, documentos, datos del questionnaire, y la AI te dice: 'oye, esta madera la puedes convertir en aserrín y vendérsela a X'."

### Por qué esto no funciona
El stakeholder (nuestro cliente) rechazó esta propuesta porque:

1. **Los sales engineers ya saben qué hacer** - tienen 20+ años de experiencia, ya conocen los buyers, ya saben qué hacer con cada waste stream
2. **Las ideas son genéricas/superficiales** - la AI no puede competir con el conocimiento profundo del dominio
3. **No ahorra tiempo ni dinero real** - no es un pain point real

**El cliente dijo: "La AI no lo va a hacer tan bien como se espera porque en realidad hay miles de ideas y los ingenieros de ventas tienen más experiencia pero no es tanto por eso si no que en realidad no es algo muy útil"**

---

## Lo que descubrimos (investigación de mercado)

### El dolor real de la industria
1. **Todo es manual y fragmentado**: fotos, notas, SDS, lab reports, Excel, PDFs - todo disperso
2. **El buyer pide evidencia y no la tiene**: "¿Dónde está la certificación?", "¿Cumple para uso alimentario?"
3. **Rechazos costosos**: un "bad load" puede costar miles de dólares
4. **Compliance fragmentado**: cada estado tiene reglas diferentes, EPA e-Manifest, PFAS, etc.
5. **SB253 deadline**: California SB253 tiene deadline **Agosto 2026** - grandes corporaciones necesitarán datos de waste de sus proveedores

### Lo que el buyer realmente necesita
No "ideas de negocio". Necesita:
- **Especificaciones técnicas** (ISRI specs, moisture content, contamination ppm)
- **Evidencia** (lab reports, COA, photos)
- **Compliance** (manifasts, clasificaciones, permisos)
- **Métricas ambientales** (CO₂ avoided, circularity) para sus reportes ESG
- **Un formato estándar** que QA/procurement acepte "tal cual"

### Competidores existentes
- cieTrade, AMCS, Scrap Dragon: software de operaciones/ERP
- Ninguno tiene AI de captura de evidencia
- Ninguno genera "Material Passports" buyer-ready
- El gap está en la **capa de evidencia**, no en operaciones

---

## El pivote: Waste Deal OS

### La nueva tesis
**La AI no inventa - estructura, enrriquece, trabajo del experto.**

 y profesionaliza elEl producto central ya no es un "proposal" o "reporte de ideas de negocio". Es un **Material Passport** - un dossier digital estandarizado por cada waste stream que incluye:

| Sección | Qué tiene |
|---------|-----------|
| Material Identity | tipo, calidad, composición, origen |
| Technical Specs | moisture, particle size, heat value, labs |
| Safety & Handling | PPE, storage, hazards |
| Environmental Passport | CO₂ avoided, water saved, circularity, SDG |
| Compliance Status | clasificación, regulaciones, e-Manifest ready |
| Engineer Pathway | qué va a hacer el broker con el material |
| Quality Evidence | COA, fotos, lab reports |

### El flujo nuevo

```
1. Field agent visita site
2. Toma fotos, graba voz, sube SDS, llena questionnaire
3. AI analiza y estructura automáticamente:
   - Image Agent → clasificación, calidad, CO₂, safety
   - Document Agent → extracción de SDS/labs
   - Notes Agent → voz/texto a datos
4. Engineer define su "pathway" (qué va a hacer, a quién le vende)
5. Proposal Agent genera el Material Passport (no ideas - ensambla y enrriquece)
6. Broker comparte link al buyer (no PDF por email)
7. Buyer ve specs + evidencia + ESG metrics + compliance
8. Broker ve engagement (qué vio el buyer)
```

### Por qué esto es diferente
| Competidores | Nosotros |
|--------------|----------|
| Software de operaciones | Software de inteligencia |
| Captura manual de datos | **AI captura y estructura automáticamente** |
| Reportes genéricos | **Material Passport buyer-ready** |
| No hay ESG metrics | **Environmental Passport automático** |
| No hay AI | **Computer vision + NLP + extraction** |

---

## El plan de implementación

### Phase 1a: Material Passport MVP (2-3 semanas)
- Reescribir Proposal Agent: de "generador de ideas" a "ensamblador de Material Passport"
- Engineer Pathway Input: form donde el engineer define su plan
- Estructura del Material Passport

### Phase 1b: Deal Visibility + ESG (2-3 semanas)
- Deal Completeness Score (qué falta por capturar)
- Environmental Passport visible en dashboard
- Deal lifecycle stages

### Phase 2a: Buyer Portal (4-6 semanas)
- Link compartible en vez de PDF
- Buyer engagement tracking
- Buyer Requirement Templates por vertical

### Phase 2b: Compliance & Disclosure Pack (4-6 semanas)
- SB253 Supplier Data Pack (urgente: deadline Aug 2026)
- e-Manifest readiness
- EPR data pack

### Phase 2c: Intelligence Layer (4-8 semanas)
- Historical Intelligence (org-scoped)
- Risk-of-Rejection Score
- Internal Pricing Reference

### Phase 3: Multiplayer OS (3-6 meses)
- Generator Portal
- Marketplace (conditional)
- ESG Certification / Impact Ledger
- Multi-agent orchestration

---

## Moat (defensa competitiva)

| Fase | Moat | Cómo se defiende |
|------|------|------------------|
| 1 | **Speed** | Site visit → Material Passport en horas, no semanas |
| 2 | **Data** | Deals acumulados = inteligencia proprietaria |
| 3 | **Network** | Generators + brokers + buyers en la plataforma |

---

## Tu tarea

1. **Revisa el plan** en `docs/plans/2026-03-02-waste-deal-os-product-pivot.md`
2. **Evalúa**:
   - ¿El pivote tiene sentido estratégicamente?
   - ¿Las fases son realistas?
   - ¿Qué falta o está mal?
   - ¿Qué riesgos no estamos considerando?
   - ¿El timing tiene sentido (SB253 Aug 2026)?
3. **Da feedback** con recomendaciones específicas

---

## Preguntas específicas que necesito que respondas

1. ¿El concepto de "Material Passport" como artefacto central tiene sentido para los buyers?
2. ¿Es realista el timeline de Phase 1 (2-3 semanas) o es muy agresivo?
3. ¿Deberíamos priorizar algo diferente en Phase 1?
4. ¿El Compliance & Disclosure Pack (SB253) debería estar en Phase 1 en vez de Phase 2?
5. ¿Qué risks importantes no estamos considerando?
6. ¿El posicionamiento vs. competidores (cieTrade, AMCS) es correcto?
7. ¿Qué le faltaría a un early adopter para decir "sí, esto vale mi dinero"?

---

## Referencias
- Plan completo: `docs/plans/2026-03-02-waste-deal-os-product-pivot.md`
- Investigación de mercado: `docs/deep-research-report.md`
- Roadmap anterior: `docs/plans/waste-os-product-roadmap.md`
