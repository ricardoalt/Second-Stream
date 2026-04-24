"""SecondStream brand module — design tokens and reusable reportlab components.

This module is the single source of truth for visual identity across every
SecondStream-generated document. Any skill that produces a PDF should
import from this module rather than define its own styles.

Palette rationale: the current SecondStream logo is rendered in a navy /
lighter-blue system. The brand guide specifies a future-state graphite +
mineral-green palette. This module uses the logo-matched navy system today
and is structured so the palette can be swapped by editing PALETTE alone.
"""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    Image,
    KeepTogether,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

# -----------------------------------------------------------------------------
# Paths
# -----------------------------------------------------------------------------

ASSETS_DIR = Path(__file__).parent / "assets"
LOGO_PNG = ASSETS_DIR / "logo.png"


# -----------------------------------------------------------------------------
# Design tokens
# -----------------------------------------------------------------------------

# Palette — named semantically, not by colour.
# Swap these values to reskin the entire document system.
PALETTE = {
    # Primary brand colour — from the logo wordmark.
    "brand_primary": colors.HexColor("#273B77"),
    # Supporting brand blue — from the logo's lighter-line element.
    "brand_secondary": colors.HexColor("#2F5FA7"),
    # Accent — light, for highlights and subtle fills.
    "brand_accent": colors.HexColor("#63C1E5"),

    # Neutral greys for body text, rules, captions.
    "ink": colors.HexColor("#1A1D24"),        # body text
    "ink_muted": colors.HexColor("#4A5260"),  # captions, meta
    "ink_soft": colors.HexColor("#8892A0"),   # sub-captions, dividers
    "paper": colors.HexColor("#FFFFFF"),
    "paper_tint": colors.HexColor("#F4F6FA"),  # callout backgrounds

    # Semantic colours for gate and safety callouts.
    "gate_open": colors.HexColor("#1E7F4E"),
    "gate_open_bg": colors.HexColor("#E8F5EE"),
    "gate_amber": colors.HexColor("#B8740A"),
    "gate_amber_bg": colors.HexColor("#FDF5E6"),
    "gate_closed": colors.HexColor("#B73A2D"),
    "gate_closed_bg": colors.HexColor("#FBEAE7"),

    "safety_red": colors.HexColor("#B73A2D"),
    "safety_red_bg": colors.HexColor("#FBEAE7"),
    "safety_amber": colors.HexColor("#B8740A"),
    "safety_amber_bg": colors.HexColor("#FDF5E6"),
    "safety_yellow": colors.HexColor("#8A7000"),
    "safety_yellow_bg": colors.HexColor("#FDFAE6"),
    "safety_none": colors.HexColor("#4A5260"),
    "safety_none_bg": colors.HexColor("#F4F6FA"),
}

# Type scale — four levels only. Don't add more without good reason.
TYPE_SCALE = {
    "display": 22,   # cover title
    "heading_1": 14, # section headers (numbered)
    "heading_2": 11, # sub-section headers (A/B/C)
    "body": 10,
    "caption": 8.5,
}

# Spacing scale — use multiples of these. Don't invent new values.
SPACING = {
    "xs": 3,
    "sm": 6,
    "md": 10,
    "lg": 16,
    "xl": 24,
    "xxl": 36,
}

# Page geometry.
PAGE_SIZE = letter
PAGE_MARGIN = 0.75 * inch  # tighter than 1" default, gives more content area

# Font family.
# We use Helvetica because it is always available in reportlab. The brand
# guide calls for Inter/Söhne; switching would require font embedding, which
# is a deliberate future upgrade.
FONT_REGULAR = "Helvetica"
FONT_BOLD = "Helvetica-Bold"
FONT_ITALIC = "Helvetica-Oblique"
FONT_BOLD_ITALIC = "Helvetica-BoldOblique"


# -----------------------------------------------------------------------------
# Marker legend
#
# Coloured squares are used throughout the Ideation Brief to flag emphasis
# types. Their meanings are defined here and rendered in a small legend at
# the foot of the Ideation page when markers appear. Keep these stable.
# -----------------------------------------------------------------------------

MARKERS = {
    "insight": {
        "char": "■",
        "colour": PALETTE["brand_secondary"],
        "meaning": "Commercial insight — the move that changes the deal",
    },
    "caution": {
        "char": "■",
        "colour": PALETTE["gate_amber"],
        "meaning": "Caution — a nuance that changes routing or pricing",
    },
    "gap": {
        "char": "■",
        "colour": PALETTE["ink_muted"],
        "meaning": "Gap — information needed before moving forward",
    },
}


# -----------------------------------------------------------------------------
# Paragraph styles
#
# These are the only paragraph styles that should appear in any
# SecondStream document. If you need a new style, the answer is almost
# always "reuse an existing one" — add to this dict deliberately, not
# ad hoc per document.
# -----------------------------------------------------------------------------

def build_styles():
    """Return a reportlab stylesheet with SecondStream styles registered.

    Call this once per document and pass the returned sheet to all
    Paragraph() calls. Don't modify styles in place — if you need a
    variant, derive a new style with a different name.
    """
    sheet = getSampleStyleSheet()

    # --- Cover block ---
    sheet.add(ParagraphStyle(
        name="SSHeaderLine",
        parent=sheet["Normal"],
        fontName=FONT_BOLD,
        fontSize=TYPE_SCALE["body"],
        textColor=PALETTE["ink"],
        leading=13,
        spaceAfter=2,
    ))
    sheet.add(ParagraphStyle(
        name="SSHeaderMeta",
        parent=sheet["Normal"],
        fontName=FONT_REGULAR,
        fontSize=TYPE_SCALE["caption"],
        textColor=PALETTE["ink_muted"],
        leading=11,
        spaceAfter=SPACING["md"],
    ))
    sheet.add(ParagraphStyle(
        name="SSTitle",
        parent=sheet["Normal"],
        fontName=FONT_BOLD,
        fontSize=TYPE_SCALE["display"],
        textColor=PALETTE["brand_primary"],
        leading=26,
        spaceBefore=SPACING["sm"],
        spaceAfter=SPACING["sm"],  # important — prevents subtitle overlap
    ))
    sheet.add(ParagraphStyle(
        name="SSSubtitle",
        parent=sheet["Normal"],
        fontName=FONT_ITALIC,
        fontSize=TYPE_SCALE["heading_1"],
        textColor=PALETTE["ink_muted"],
        leading=18,
        spaceBefore=0,
        spaceAfter=SPACING["xs"],
    ))
    sheet.add(ParagraphStyle(
        name="SSHandoverTag",
        parent=sheet["Normal"],
        fontName=FONT_REGULAR,
        fontSize=TYPE_SCALE["caption"],
        textColor=PALETTE["ink_soft"],
        leading=11,
        spaceAfter=SPACING["lg"],
    ))

    # --- Section headers ---
    sheet.add(ParagraphStyle(
        name="SSH1",
        parent=sheet["Normal"],
        fontName=FONT_BOLD,
        fontSize=TYPE_SCALE["heading_1"],
        textColor=PALETTE["brand_primary"],
        leading=17,
        spaceBefore=SPACING["lg"],
        spaceAfter=SPACING["sm"],
    ))
    sheet.add(ParagraphStyle(
        name="SSH2",
        parent=sheet["Normal"],
        fontName=FONT_BOLD,
        fontSize=TYPE_SCALE["heading_2"],
        textColor=PALETTE["brand_secondary"],
        leading=14,
        spaceBefore=SPACING["md"],
        spaceAfter=SPACING["xs"],
    ))

    # --- Body and supporting ---
    sheet.add(ParagraphStyle(
        name="SSBody",
        parent=sheet["Normal"],
        fontName=FONT_REGULAR,
        fontSize=TYPE_SCALE["body"],
        textColor=PALETTE["ink"],
        leading=14,
        spaceAfter=SPACING["xs"],
    ))
    sheet.add(ParagraphStyle(
        name="SSBullet",
        parent=sheet["Normal"],
        fontName=FONT_REGULAR,
        fontSize=TYPE_SCALE["body"],
        textColor=PALETTE["ink"],
        leading=14,
        leftIndent=12,
        bulletIndent=0,
        spaceAfter=SPACING["xs"],
    ))
    sheet.add(ParagraphStyle(
        name="SSBulletSub",
        parent=sheet["Normal"],
        fontName=FONT_REGULAR,
        fontSize=TYPE_SCALE["body"],
        textColor=PALETTE["ink_muted"],
        leading=13,
        leftIndent=28,
        bulletIndent=16,
        spaceAfter=SPACING["xs"],
    ))
    sheet.add(ParagraphStyle(
        name="SSLead",
        parent=sheet["Normal"],
        fontName=FONT_BOLD,
        fontSize=TYPE_SCALE["body"],
        textColor=PALETTE["ink"],
        leading=14,
        spaceAfter=SPACING["xs"],
    ))
    sheet.add(ParagraphStyle(
        name="SSCaveat",
        parent=sheet["Normal"],
        fontName=FONT_ITALIC,
        fontSize=TYPE_SCALE["caption"],
        textColor=PALETTE["ink_muted"],
        leading=11,
        spaceAfter=SPACING["sm"],
    ))
    sheet.add(ParagraphStyle(
        name="SSCaption",
        parent=sheet["Normal"],
        fontName=FONT_REGULAR,
        fontSize=TYPE_SCALE["caption"],
        textColor=PALETTE["ink_muted"],
        leading=11,
    ))

    # --- Specialised ---
    sheet.add(ParagraphStyle(
        name="SSCallout",
        parent=sheet["Normal"],
        fontName=FONT_REGULAR,
        fontSize=TYPE_SCALE["body"],
        textColor=PALETTE["ink"],
        leading=14,
        spaceAfter=SPACING["xs"],
    ))
    sheet.add(ParagraphStyle(
        name="SSCalloutLabel",
        parent=sheet["Normal"],
        fontName=FONT_BOLD,
        fontSize=TYPE_SCALE["body"],
        textColor=PALETTE["ink"],
        leading=14,
        spaceAfter=SPACING["xs"],
    ))
    sheet.add(ParagraphStyle(
        name="SSInsight",
        parent=sheet["Normal"],
        fontName=FONT_BOLD_ITALIC,
        fontSize=TYPE_SCALE["heading_2"] + 1,
        textColor=PALETTE["brand_primary"],
        alignment=TA_CENTER,
        leading=18,
    ))
    sheet.add(ParagraphStyle(
        name="SSEvidenceTag",
        parent=sheet["Normal"],
        fontName=FONT_BOLD,
        fontSize=TYPE_SCALE["caption"],
        textColor=PALETTE["ink_soft"],
        leading=11,
    ))
    sheet.add(ParagraphStyle(
        name="SSThemeTitle",
        parent=sheet["Normal"],
        fontName=FONT_BOLD,
        fontSize=TYPE_SCALE["heading_1"],
        textColor=PALETTE["paper"],
        leading=17,
        leftIndent=10,
        spaceBefore=2,
        spaceAfter=2,
    ))

    return sheet


# -----------------------------------------------------------------------------
# Reusable components — flowables you add to your document's story list.
# -----------------------------------------------------------------------------

def logo_image(width_inch=1.6):
    """Return a reportlab Image of the SecondStream logo, sized for headers.

    Default width is 1.6" which looks right alongside a two-line header
    block at the top of a US Letter page.
    """
    if not LOGO_PNG.exists():
        return None
    # Logo aspect ratio from source SVG: 240 x 99 = roughly 2.42:1
    aspect = 99 / 240
    w = width_inch * inch
    h = w * aspect
    return Image(str(LOGO_PNG), width=w, height=h)


def cover_block(story, styles, header_line_1, header_line_2,
                title, subtitle, handover_tag):
    """Append a cover block to the story list.

    The cover block is: logo + header line + meta line, horizontal rule,
    title, subtitle, handover tag. This is the fix for the v3 subtitle
    overlap bug — the title and subtitle are separate Paragraphs with
    enforced spaceAfter/spaceBefore.
    """
    # Two-column top row: logo left, header lines right
    logo = logo_image(width_inch=1.6)
    header_para = Paragraph(header_line_1, styles["SSHeaderLine"])
    meta_para = Paragraph(header_line_2, styles["SSHeaderMeta"])

    if logo is not None:
        header_cell = [header_para, meta_para]
        header_table = Table(
            [[logo, header_cell]],
            colWidths=[1.8 * inch, None],
        )
        header_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]))
        story.append(header_table)
    else:
        story.append(header_para)
        story.append(meta_para)

    story.append(Spacer(1, SPACING["sm"]))
    story.append(HRFlowable(
        width="100%",
        thickness=0.75,
        color=PALETTE["ink_soft"],
        spaceBefore=0,
        spaceAfter=SPACING["md"],
    ))

    story.append(Paragraph(title, styles["SSTitle"]))
    story.append(Paragraph(subtitle, styles["SSSubtitle"]))
    story.append(Paragraph(handover_tag, styles["SSHandoverTag"]))


def gate_callout(status, message):
    """Return a styled gate status callout as a flowable.

    status: one of "open", "amber", "closed"
    message: the one-line status message

    Use this only on Ideation and Analytical PDFs — not on the Playbook,
    which is a tool not a record.
    """
    status = status.lower()
    if status in ("open", "green"):
        bg = PALETTE["gate_open_bg"]
        border = PALETTE["gate_open"]
        label = "QUALIFICATION GATE — OPEN"
    elif status in ("amber", "conditional", "conditionally_open"):
        bg = PALETTE["gate_amber_bg"]
        border = PALETTE["gate_amber"]
        label = "QUALIFICATION GATE — CONDITIONALLY OPEN"
    elif status in ("closed", "red"):
        bg = PALETTE["gate_closed_bg"]
        border = PALETTE["gate_closed"]
        label = "QUALIFICATION GATE — CLOSED"
    else:
        bg = PALETTE["paper_tint"]
        border = PALETTE["ink_soft"]
        label = f"QUALIFICATION GATE — {status.upper()}"

    style = ParagraphStyle(
        name="_gate",
        fontName=FONT_REGULAR,
        fontSize=TYPE_SCALE["body"],
        textColor=PALETTE["ink"],
        leading=14,
    )
    label_style = ParagraphStyle(
        name="_gate_label",
        fontName=FONT_BOLD,
        fontSize=TYPE_SCALE["caption"],
        textColor=border,
        leading=11,
        spaceAfter=3,
    )
    content = [
        Paragraph(label, label_style),
        Paragraph(message, style),
    ]
    t = Table([[content]], colWidths=[None])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("BOX", (0, 0), (-1, -1), 0.75, border),
        ("LINEBEFORE", (0, 0), (0, -1), 3, border),
        ("LEFTPADDING", (0, 0), (-1, -1), SPACING["md"]),
        ("RIGHTPADDING", (0, 0), (-1, -1), SPACING["md"]),
        ("TOPPADDING", (0, 0), (-1, -1), SPACING["sm"]),
        ("BOTTOMPADDING", (0, 0), (-1, -1), SPACING["sm"]),
    ]))
    return t


def safety_callout(level, message):
    """Return a styled safety flag callout as a flowable.

    level: one of "red" (stop), "amber" (specialist), "yellow" (attention),
           "none"
    """
    level = level.lower()
    if level in ("red", "stop"):
        bg = PALETTE["safety_red_bg"]
        border = PALETTE["safety_red"]
        label = "SAFETY FLAG — RED (STOP)"
    elif level == "amber":
        bg = PALETTE["safety_amber_bg"]
        border = PALETTE["safety_amber"]
        label = "SAFETY FLAG — AMBER"
    elif level == "yellow":
        bg = PALETTE["safety_yellow_bg"]
        border = PALETTE["safety_yellow"]
        label = "SAFETY FLAG — YELLOW (ATTENTION)"
    else:
        bg = PALETTE["safety_none_bg"]
        border = PALETTE["safety_none"]
        label = "SAFETY FLAGS"

    style = ParagraphStyle(
        name="_safety",
        fontName=FONT_REGULAR,
        fontSize=TYPE_SCALE["body"],
        textColor=PALETTE["ink"],
        leading=14,
    )
    label_style = ParagraphStyle(
        name="_safety_label",
        fontName=FONT_BOLD,
        fontSize=TYPE_SCALE["caption"],
        textColor=border,
        leading=11,
        spaceAfter=3,
    )
    content = [
        Paragraph(label, label_style),
        Paragraph(message, style),
    ]
    t = Table([[content]], colWidths=[None])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("BOX", (0, 0), (-1, -1), 0.75, border),
        ("LINEBEFORE", (0, 0), (0, -1), 3, border),
        ("LEFTPADDING", (0, 0), (-1, -1), SPACING["md"]),
        ("RIGHTPADDING", (0, 0), (-1, -1), SPACING["md"]),
        ("TOPPADDING", (0, 0), (-1, -1), SPACING["sm"]),
        ("BOTTOMPADDING", (0, 0), (-1, -1), SPACING["sm"]),
    ]))
    return t


def theme_header(number, title):
    """Return a filled rectangular header bar for a Playbook theme.

    The bar is brand-primary with white text. Number shown in larger type
    to aid scanning during a live call.
    """
    num_style = ParagraphStyle(
        name="_theme_num",
        fontName=FONT_BOLD,
        fontSize=20,
        textColor=PALETTE["paper"],
        leading=22,
        alignment=TA_LEFT,
    )
    title_style = ParagraphStyle(
        name="_theme_title",
        fontName=FONT_BOLD,
        fontSize=TYPE_SCALE["heading_1"],
        textColor=PALETTE["paper"],
        leading=17,
        alignment=TA_LEFT,
    )
    # Widen the number column for two-digit theme numbers so they
    # don't wrap to two lines
    num_col_width = 0.75 * inch if number >= 10 else 0.5 * inch
    t = Table(
        [[Paragraph(str(number), num_style),
          Paragraph(title, title_style)]],
        colWidths=[num_col_width, None],
    )
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALETTE["brand_primary"]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), SPACING["md"]),
        ("RIGHTPADDING", (0, 0), (-1, -1), SPACING["md"]),
        ("TOPPADDING", (0, 0), (-1, -1), SPACING["sm"]),
        ("BOTTOMPADDING", (0, 0), (-1, -1), SPACING["sm"]),
    ]))
    return t


def why_it_matters_box(items, styles):
    """Return a 'Why it matters' callout box for Playbook themes.

    items: a list of strings, each a bulleted implication.
    """
    label_style = ParagraphStyle(
        name="_wim_label",
        fontName=FONT_BOLD,
        fontSize=TYPE_SCALE["body"],
        textColor=PALETTE["brand_primary"],
        leading=14,
        spaceAfter=SPACING["xs"],
    )
    bullet_style = ParagraphStyle(
        name="_wim_bullet",
        fontName=FONT_REGULAR,
        fontSize=TYPE_SCALE["body"],
        textColor=PALETTE["ink"],
        leading=14,
        leftIndent=12,
        bulletIndent=0,
        spaceAfter=2,
    )
    content = [Paragraph("Why it matters", label_style)]
    for item in items:
        content.append(Paragraph(f"• {item}", bullet_style))

    t = Table([[content]], colWidths=[None])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALETTE["paper_tint"]),
        ("BOX", (0, 0), (-1, -1), 0.5, PALETTE["brand_secondary"]),
        ("LINEBEFORE", (0, 0), (0, -1), 3, PALETTE["brand_secondary"]),
        ("LEFTPADDING", (0, 0), (-1, -1), SPACING["md"]),
        ("RIGHTPADDING", (0, 0), (-1, -1), SPACING["md"]),
        ("TOPPADDING", (0, 0), (-1, -1), SPACING["sm"]),
        ("BOTTOMPADDING", (0, 0), (-1, -1), SPACING["sm"]),
    ]))
    return t


def insight_callout(text, styles):
    """Return the closing strategic insight as a centred italic callout."""
    t = Table(
        [[Paragraph(text, styles["SSInsight"])]],
        colWidths=[None],
    )
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALETTE["paper_tint"]),
        ("LINEABOVE", (0, 0), (-1, 0), 1.5, PALETTE["brand_primary"]),
        ("LINEBELOW", (0, -1), (-1, -1), 1.5, PALETTE["brand_primary"]),
        ("LEFTPADDING", (0, 0), (-1, -1), SPACING["lg"]),
        ("RIGHTPADDING", (0, 0), (-1, -1), SPACING["lg"]),
        ("TOPPADDING", (0, 0), (-1, -1), SPACING["md"]),
        ("BOTTOMPADDING", (0, 0), (-1, -1), SPACING["md"]),
    ]))
    return t


def marker_legend(styles, which=None):
    """Return a small legend of marker meanings.

    which: optional list of marker keys to include. If None, include all
    markers that appear in the document.
    """
    if which is None:
        which = list(MARKERS.keys())

    legend_style = ParagraphStyle(
        name="_legend",
        fontName=FONT_REGULAR,
        fontSize=TYPE_SCALE["caption"],
        textColor=PALETTE["ink_muted"],
        leading=11,
    )

    rows = []
    for key in which:
        m = MARKERS[key]
        swatch_html = (
            f'<font color="{m["colour"].hexval()}" size="12">■</font>'
        )
        rows.append(Paragraph(
            f'{swatch_html} &nbsp; {m["meaning"]}',
            legend_style,
        ))

    label_style = ParagraphStyle(
        name="_legend_label",
        fontName=FONT_BOLD,
        fontSize=TYPE_SCALE["caption"],
        textColor=PALETTE["ink_soft"],
        leading=11,
        spaceAfter=3,
    )

    content = [Paragraph("Marker legend", label_style)] + rows
    t = Table([[content]], colWidths=[None])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALETTE["paper_tint"]),
        ("LEFTPADDING", (0, 0), (-1, -1), SPACING["md"]),
        ("RIGHTPADDING", (0, 0), (-1, -1), SPACING["md"]),
        ("TOPPADDING", (0, 0), (-1, -1), SPACING["sm"]),
        ("BOTTOMPADDING", (0, 0), (-1, -1), SPACING["sm"]),
    ]))
    return t


def marker(key):
    """Return inline HTML for a marker glyph.

    Use inside Paragraph() text like:
        Paragraph(f"{marker('insight')} Lead with the value story", style)
    """
    if key not in MARKERS:
        return ""
    m = MARKERS[key]
    return f'<font color="{m["colour"].hexval()}">{m["char"]}</font>'


# -----------------------------------------------------------------------------
# Page decoration — footer
# -----------------------------------------------------------------------------

def draw_footer(canvas, doc, version="v3", classification="Internal handover"):
    """Draw a consistent footer on every page.

    Call via SimpleDocTemplate(... onFirstPage=draw_footer, onLaterPages=...).
    Footer shows: SecondStream wordmark (left), classification (centre),
    page number (right).
    """
    canvas.saveState()
    page_w = doc.pagesize[0]
    y = 0.4 * inch

    # Left — brand wordmark as text
    canvas.setFont(FONT_BOLD, 8)
    canvas.setFillColor(PALETTE["brand_primary"])
    canvas.drawString(PAGE_MARGIN, y, "SecondStream")
    canvas.setFont(FONT_REGULAR, 8)
    canvas.setFillColor(PALETTE["ink_soft"])
    canvas.drawString(PAGE_MARGIN + 58, y, f"· Discovery Agent {version}")

    # Centre — classification
    canvas.setFont(FONT_REGULAR, 8)
    canvas.setFillColor(PALETTE["ink_soft"])
    canvas.drawCentredString(page_w / 2, y, classification)

    # Right — page number
    canvas.drawRightString(
        page_w - PAGE_MARGIN, y,
        f"Page {doc.page}",
    )

    # Thin rule above footer
    canvas.setStrokeColor(PALETTE["ink_soft"])
    canvas.setLineWidth(0.3)
    canvas.line(PAGE_MARGIN, y + 12,
                page_w - PAGE_MARGIN, y + 12)

    canvas.restoreState()


# -----------------------------------------------------------------------------
# Table style presets
# -----------------------------------------------------------------------------

def analytical_table_style():
    """The default style for Analytical Read data tables.

    Subtle zebra striping, brand header, compact but readable.
    """
    return TableStyle([
        # Header row
        ("BACKGROUND", (0, 0), (-1, 0), PALETTE["brand_primary"]),
        ("TEXTCOLOR", (0, 0), (-1, 0), PALETTE["paper"]),
        ("FONTNAME", (0, 0), (-1, 0), FONT_BOLD),
        ("FONTSIZE", (0, 0), (-1, 0), TYPE_SCALE["caption"]),
        ("VALIGN", (0, 0), (-1, 0), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, 0), SPACING["xs"]),
        ("BOTTOMPADDING", (0, 0), (-1, 0), SPACING["xs"]),

        # Body rows
        ("FONTNAME", (0, 1), (-1, -1), FONT_REGULAR),
        ("FONTSIZE", (0, 1), (-1, -1), TYPE_SCALE["caption"]),
        ("TEXTCOLOR", (0, 1), (-1, -1), PALETTE["ink"]),
        ("VALIGN", (0, 1), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 1), (-1, -1), "CENTER"),
        ("ALIGN", (0, 1), (0, -1), "LEFT"),  # first column left-aligned
        ("FONTNAME", (0, 1), (0, -1), FONT_BOLD),

        # Zebra striping
        ("ROWBACKGROUNDS", (0, 1), (-1, -1),
         [PALETTE["paper"], PALETTE["paper_tint"]]),

        # Borders
        ("LINEBELOW", (0, 0), (-1, 0), 0.75, PALETTE["brand_primary"]),
        ("TOPPADDING", (0, 1), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ])
