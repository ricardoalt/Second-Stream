# Design System Specification: Industrial Precision & Fluidity

## 1. Overview & Creative North Star
### The Creative North Star: "The Digital Curator"
In the world of industrial chemical sales, data is often dense, messy, and intimidating. This design system rejects the "spreadsheet-as-a-UI" trope. Instead, it adopts the persona of **The Digital Curator**: an authoritative, editorial-grade interface that treats industrial logistics with the same elegance as a high-end financial terminal.

We break the "standard SaaS template" by utilizing **Intentional Asymmetry** and **Tonal Depth**. Instead of boxing data into rigid, bordered grids, we use expansive breathing room and sophisticated layering to guide the eye. The interface shouldn't feel like a tool you use; it should feel like an environment you inhabit—efficient, modern, and unerringly professional.

---

## 2. Colors & Surface Philosophy
The palette moves beyond "safe blue" into a spectrum of deep oceanic tones and vibrant chemical teals.

### The "No-Line" Rule
**Explicit Mandate:** 1px solid borders for sectioning are strictly prohibited. We define boundaries through background color shifts.
- **Surface Hierarchy:** Use the `surface-container` tiers to create "nested" depth.
- **Example:** A `surface-container-lowest` card sitting on a `surface-container-low` section. This creates a soft, natural lift that feels architectural rather than "drawn."

### The "Glass & Gradient" Rule
To prevent a "flat" corporate feel, use **Glassmorphism** for floating elements (e.g., Modals, Popovers).
- **Token:** Use semi-transparent `surface` colors with a `backdrop-blur` of 12px–20px.
- **Signature Gradients:** For primary CTAs and high-level data visualizations, use a subtle linear gradient: `primary` (#006565) to `primary_container` (#008080) at a 135° angle. This adds "visual soul" to industrial data.

---

## 3. Typography: The Editorial Edge
We pair the technical precision of **Inter** with the structural authority of **Manrope**.

| Role | Token | Font | Size | Intent |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | `display-lg` | Manrope | 3.5rem | High-impact data totals / Hero stats |
| **Headline** | `headline-md` | Manrope | 1.75rem | Major section headers (Orders, Inventory) |
| **Title** | `title-md` | Inter | 1.125rem | Card titles and modal headers |
| **Body** | `body-md` | Inter | 0.875rem | Standard data entry and descriptions |
| **Label** | `label-sm` | Inter | 0.6875rem | Micro-data, timestamps, table headers |

**The Typographic Strategy:** Headlines use Manrope with tighter letter-spacing (-0.02em) to feel "machined" and precise. Body text uses Inter with standard tracking to ensure maximum legibility during high-stress logistics operations.

---

## 4. Elevation & Depth
We convey hierarchy through **Tonal Layering** rather than structural lines.

- **The Layering Principle:**
- Base Level: `surface` (#f7f9ff)
- Content Sections: `surface_container_low` (#ecf4ff)
- Interactive Cards: `surface_container_lowest` (#ffffff)
- **Ambient Shadows:** When an element must float (e.g., a chemical safety tooltip), use an extra-diffused shadow: `offset-y: 8px, blur: 24px, color: rgba(11, 29, 43, 0.06)`. Note the use of the `on_surface` color for the shadow tint.
- **The "Ghost Border" Fallback:** If a border is required for accessibility, use `outline_variant` at **20% opacity**. Never use 100% opaque borders.

---

## 5. Components: Precision Engineered

### Buttons & Actions
- **Primary:** Gradient fill (`primary` to `primary_container`), `round-md` (0.375rem). Use `on_primary` (#ffffff) for text.
- **Secondary:** `surface_container_highest` background with `primary` text. No border.
- **Tertiary:** Ghost style. `on_surface_variant` text, shifting to a `surface_variant` background on hover.

### Complex Data Tables (The "Fluid Grid")
- **Rule:** Forbid divider lines.
- **Structure:** Use `spacing-4` (0.9rem) for vertical cell padding. Alternate row colors using `surface` and `surface_container_low`.
- **Headers:** Use `label-md` in `secondary` (#545e76) with all-caps styling and 0.05em tracking for an "industrial manifest" look.

### Status Indicators
- **Critical:** `error_container` background with `on_error_container` text.
- **Success:** `primary_fixed` background with `on_primary_fixed_variant` text.
- **Warning:** A custom amber shift (use `tertiary_fixed` as a base).
- **Styling:** Use `round-full` for status chips to contrast against the `md` corners of the rest of the UI.

### Complex Forms
- **Inputs:** Use `surface_container_highest` for the input field background. Upon focus, transition to a `ghost border` using the `primary` color.
- **Grouping:** Group related chemical specs using `spacing-10` (2.25rem) of white space rather than "Fieldsets" or lines.

---

## 6. Do’s and Don’ts

### Do
- **Do** use `spacing-16` and `spacing-20` for major layout breaks to create an editorial, high-end feel.
- **Do** use subtle backdrop blurs on navigation rails to show hints of the underlying data.
- **Do** use `inverse_surface` for dark-mode-style "Safety Alerts" or critical system overrides to demand immediate attention.

### Don't
- **Don't** use 1px lines to separate list items. Use a `0.2rem` (spacing-1) gap and a background color shift.
- **Don't** use pure black (#000000) for text. Always use `on_surface` (#0b1d2b) to maintain the "Navy/Slate" sophisticated tone.
- **Don't** use the `DEFAULT` (0.25rem) radius for everything. Reserve `round-xl` (0.75rem) for large containers and `round-full` for interactive micro-elements like chips.
