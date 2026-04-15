# UI/UX Patterns Cheatsheet - SecondStream
## Patrones Accionables de Productos AI-Native (Abril 2026)

---

## 🎯 PRINCIPIOS FUNDAMENTALES

### 1. Artifact-First (No Chat-First)
| ❌ Evitar | ✅ Hacer |
|-----------|----------|
| Chat como interfaz principal | Documento/Proposal como centro de gravedad |
| Conversación con AI | AI que colabora en el artifact |
| Respuestas en bubbles | Acciones en contexto del documento |

**Implementación:**
- Proposal tiene URL única: `/opportunities/[id]/proposals/[version]`
- Versionado explícito (v1, v2, v3...)
- Chat es opcional/secundario

---

### 2. Evidence Siempre Visible
| Patrón | Implementación en SecondStream |
|--------|----------------------------------|
| Perplexity: Sources panel | Sidebar derecho con evidence de proposal |
| Glean: Provenance badges | Cada dato muestra su source [1], [2] |
| Harvey: Document vault | Documents subidos son first-class |

**Layout recomendado:**
```
┌─────────────────────────────────────────┐
│  Header: Opportunity Name + Status      │
├──────────────────┬──────────────────────┤
│                  │                      │
│   PROPOSAL       │    EVIDENCE PANEL    │
│   (centro)       │    (sidebar)         │
│                  │    - Documents [1]   │
│   [Citations]    │    - Emails [2]      │
│   [1] [2]        │    - CRM Data [3]    │
│                  │    - Web Research [4]│
│                  │                      │
├──────────────────┴──────────────────────┤
│  Bottom Bar: Review Actions + Status   │
└─────────────────────────────────────────┘
```

---

### 3. Estados de Review First-Class

**Workflow de Linear aplicado:**
```
Draft → AI Generated → Under Review → Approved → Synced → Closed
```

**Estados visuales:**
- **Draft**: Borde gris, invisible para aprobadores
- **AI Generated**: Indicador sutil "AI" en header
- **Under Review**: Badge amarillo sutil (no llamativo)
- **Changes Requested**: Border izquierdo naranja 4px
- **Approved**: Border izquierdo verde 4px
- **Synced**: Checkmark + timestamp

**Asignación:**
- Siempre hay un owner humano
- Aprobadores por tipo de deal
- Escalation automático si pasa X tiempo

---

### 4. Agent como Colaborador (No Chatbot)

**Identidad visual:**
- Avatar consistente para ProposalAgent
- Color distintivo (ej: morado para AI, azul para humanos)
- Nombre propio: "ProposalAgent" no "AI Assistant"

**Comunicación:**
```
❌ "Hola, soy tu AI assistant. ¿En qué puedo ayudarte?"
✅ "ProposalAgent generated v3 - Confidence: 0.92"
```

**Patrón de Linear:**
```
┌─────────────────────────────────────┐
│ [Avatar] ProposalAgent              │
│ Generated proposal from RFP         │
│ 2m ago                              │
├─────────────────────────────────────┤
│ [Avatar] Sarah Chen                 │
│ Reviewed and requested changes      │
│ 1h ago                              │
└─────────────────────────────────────┘
```

---

### 5. Calm UI (De Linear)

**Especificaciones:**
- **Espaciado**: 24-32px entre elementos principales
- **Bordes**: 1px gris muy sutil (#E5E7EB)
- **Estados**: Indicadores de 4px en borde izquierdo (no badges grandes)
- **Tipografía**: Inter o similar, pesos 400-500, no negrita excesiva
- **Colores**: Fondo #FAFAFA, cards #FFFFFF, bordes #E5E7EB

**Activity Feed pattern:**
```
┌────────────────────────────────────────┐
│ [Icon] [Nombre] [Acción]       [Time]  │
│ [Contexto breve si aplica]             │
├────────────────────────────────────────┤
│ [Icon] [Nombre] [Acción]       [Time]  │
│ [Contexto breve si aplica]             │
└────────────────────────────────────────┘
```

---

### 6. Domain Language (De Harvey)

**Lenguaje de negocio:**
```
❌ "AI Generated Content"     ✅ "Proposal crafted"
❌ "Chat with AI"            ✅ "Request proposal revision"  
❌ "Prompt"                  ✅ "Describe opportunity"
❌ "AI Assistant"            ✅ "ProposalAgent"
```

**Workflows opinionated:**
- "RFP to Proposal" (no "generate content")
- "Compliance Check" (no "AI review")
- "Deal Sync" (no "export to CRM")

---

## 🎨 COMPONENTES CLAVE

### Proposal Card
```
┌──────────────────────────────────────────┐
│ ● Acme Corp - Enterprise Deal              │
│   $150K | 75% confidence                 │
│                                          │
│   [Draft] → [AI Generated] → [Review] →  │
│                                          │
│   Owner: Sarah Chen | Due: 3 days       │
│   Sources: 5 docs, 3 emails              │
└──────────────────────────────────────────┘
```

### Evidence Panel
```
┌─────────────────┐
│ Evidence        │
├─────────────────┤
│ 📄 RFP-v2.pdf   │
│    Used in §2   │
│ 📧 Email thread │
│    Used in §1   │
│ 🗃️ Salesforce   │
│    Account data │
├─────────────────┤
│ Confidence: 87% │
│ Freshness: ⚠️   │
│ 2 docs >30d old │
└─────────────────┘
```

### Review Interface
```
┌─────────────────────────────────────────┐
│ Proposed by ProposalAgent               │
│ Generated 2h ago | Confidence: 0.92     │
├─────────────────────────────────────────┤
│                                         │
│ [PROPUESTA]                             │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│ [  Approve  ] [Request Changes] [Reject]│
│                                         │
│ Assigned to: Compliance Team            │
│ Due: 24 hours                           │
└─────────────────────────────────────────┘
```

---

## ⚡ ANTI-PATRONES A EVITAR

| ❌ Anti-pattern | ✅ Alternativa |
|-----------------|----------------|
| Chatbot flotante | Agent como participante en feed |
| Badges grandes y coloridos | Indicadores sutiles de borde |
| "AI is typing..." | Progress discretos o invisible |
| "Generate" button grande | Acciones contextuales inline |
| Settings de AI expuestos | Agents configurables en admin |
| Explicaciones de cómo funciona AI | AI invisible cuando funciona bien |
| Prompt templates | Smart defaults por tipo de deal |

---

## 📱 PATTERNS POR PANTALLA

### Listado de Oportunidades (Linear-style)
- Vista tipo kanban por stage
- Cards con metadata esencial
- Hover revela acciones rápidas
- Filtros en sidebar (no top bar cargado)

### Detalle de Oportunidad
- Layout 3-paneles: Contexto | Proposal | Evidence
- Activity feed en bottom o sidebar
- Acciones de review prominentes pero no intrusivas

### Review de Proposal
- Proposal centrado
- Comments/threads inline (Notion-style)
- Evidence panel siempre visible
- Acciones de aprobación en top/bottom bar

---

## 🔧 IMPLEMENTACIÓN TÉCNICA

### URLs
```
/opportunities                    # Listado
/opportunities/new                # Nueva oportunidad
/opportunities/[id]                # Detalle
/opportunities/[id]/proposals     # Historial de versions
/opportunities/[id]/proposals/latest
/opportunities/[id]/proposals/[v]  # Version específica
```

### Estados
```typescript
type ProposalStatus = 
  | 'draft'
  | 'ai_generated' 
  | 'under_review'
  | 'changes_requested'
  | 'approved'
  | 'synced'
  | 'rejected';
```

### Estructura de Evidence
```typescript
interface Evidence {
  id: string;
  type: 'document' | 'email' | 'crm' | 'web';
  source: string;           // "RFP.pdf", "sales@acme.com"
  relevance: number;        // 0.0 - 1.0
  usedIn: string[];       // Secciones donde se usó
  freshness: 'fresh' | 'stale' | 'expired';
  url: string;            // Link al source original
}
```

---

## 📊 METRICS DE ÉXITO

### UX Metrics
- Time to first proposal generated
- Time to approval
- Review cycles por proposal
- Evidence verification rate

### AI Metrics
- Confidence score promedio
- Acceptance rate de proposals
- Corrections request rate

---

**Referencia completa:** `/docs/research/ui-ux-patterns-analysis-april-2026.md`

**Última actualización:** Abril 14, 2026
