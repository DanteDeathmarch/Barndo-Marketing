# One-shot script: generate the Complete Barndo Solutions-branded one-pager.
# Run from repo root:  python docs/build-onepager.py

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepInFrame,
)

# Complete Barndo Solutions palette — restrained, professional, builder
# neutral. Site is charcoal text on white with no flashy accents; we add
# a single barn-rust for emphasis only (echoing "barndo" without being loud).
INK = HexColor("#1A1A1A")       # charcoal (matches site body color)
CHARCOAL = HexColor("#333333")  # secondary body
STEEL = HexColor("#6E6E6E")     # captions
AMBER = HexColor("#8B3A1F")     # barn-rust accent — used sparingly
SAND = HexColor("#EFEAE0")      # subtle bg (warmer than pure gray)
CREAM = HexColor("#FAFAF7")     # near-white

doc = SimpleDocTemplate(
    "docs/groundwork-one-pager.pdf",
    pagesize=letter,
    leftMargin=0.5 * inch, rightMargin=0.5 * inch,
    topMargin=0.45 * inch, bottomMargin=0.45 * inch,
    title="Customer-Owned Conversion Bot — Complete Barndo Solutions",
    author="Complete Barndo Solutions",
)

# Sans throughout to match the site. Single accent (barn-rust) for the tagline + section heads only.
H1 = ParagraphStyle("H1", fontName="Helvetica-Bold", fontSize=22, leading=24, textColor=INK, spaceAfter=4)
TAG = ParagraphStyle("TAG", fontName="Helvetica-Oblique", fontSize=10, leading=12, textColor=AMBER, spaceAfter=10)
H2 = ParagraphStyle("H2", fontName="Helvetica-Bold", fontSize=11, leading=13, textColor=AMBER, spaceBefore=8, spaceAfter=3, alignment=TA_LEFT)
BODY = ParagraphStyle("BODY", fontName="Helvetica", fontSize=8.5, leading=11, textColor=CHARCOAL, spaceAfter=4)
SMALL = ParagraphStyle("SMALL", fontName="Helvetica", fontSize=7.5, leading=9.5, textColor=STEEL, spaceAfter=3)
FOOT = ParagraphStyle("FOOT", fontName="Helvetica-Oblique", fontSize=7.5, leading=10, textColor=STEEL, spaceBefore=6)

story = []

# Header
story.append(Paragraph("Your own qualifying chatbot. On your stack. Forever.", H1))
story.append(Paragraph("COMPLETE BARNDO SOLUTIONS  ·  barndominium builders who handle every step", TAG))

# Intro
story.append(Paragraph(
    "A conversion concierge that lives on completebarndosolutions.com, qualifies "
    "landowners through conversation (not forms), and routes hot leads into your "
    "pipeline. You own every piece of it — your customers' data never touches anyone "
    "else. Honest pricing, clear expectations, transparent communication — the way "
    "you already do business.",
    BODY,
))

# What you get
story.append(Paragraph("What you get", H2))
story.append(Paragraph(
    "A chat widget that drops onto your site with one &lt;script&gt; tag. Behind it: "
    "Claude Sonnet 4.6 configured to <b>your</b> voice, <b>your</b> qualifying criteria, "
    "and <b>your</b> knowledge base (TX/TN/OK/LA coverage, turnkey one-contract model, "
    "barndo-financing realities). It runs a four-phase discovery arc — opens with a "
    "question about the visitor's land, draws out specifics one at a time, reflects the "
    "project back as a vision statement, then bridges to your regional builder. It speaks "
    "like a Complete Barndo Solutions consultant.",
    BODY,
))

# Install + smarter (two-column)
left_col = [
    Paragraph("Install in ~20 minutes", H2),
    Paragraph(
        "1. Open the install artifact in your Claude.ai account<br/>"
        "2. Answer 8 short steps — brand, voice, knowledge, qualifying signals, CRM destination<br/>"
        "3. Deploy — your Claude orchestrates the Vercel deploy via MCP connectors, or you click through the standard import flow<br/>"
        "4. Verify — three probes inside the artifact hit your live /api/chat and confirm the deployment matches the pre-deploy eval<br/>"
        "5. Paste the &lt;script&gt; tag on your site",
        BODY,
    ),
    Paragraph(
        "Bot runs on <b>your</b> Vercel, calls <b>your</b> Anthropic API, writes leads "
        "to <b>your</b> CRM. We have no servers in the loop.",
        SMALL,
    ),
]

right_col = [
    Paragraph("Gets smarter without you doing engineering", H2),
    Paragraph(
        "Five scheduled routines run on your Anthropic account:"
        "<br/>· <b>Daily audit</b> — health check + live conversation probe"
        "<br/>· <b>Daily improvement</b> — clusters failed conversations, mines new test personas, proposes fixes"
        "<br/>· <b>Weekly research</b> — researches your niche, proposes KB additions"
        "<br/>· <b>Weekly A/B evaluator</b> — recommends promote / revert on prompt tests"
        "<br/>· <b>Monthly eval</b> — 18-persona regression suite",
        BODY,
    ),
    Paragraph(
        "All email <i>proposals</i>. None auto-edit your bot. You approve each change "
        "with your Claude Max — diff comes back ready to commit.",
        SMALL,
    ),
]

cols = Table([[left_col, right_col]], colWidths=[3.65 * inch, 3.65 * inch])
cols.setStyle(TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ("TOPPADDING", (0, 0), (-1, -1), 0),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
]))
story.append(cols)

# Cost
story.append(Paragraph("What it costs you", H2))
cost_data = [
    ["Item", "Cost", "Where it lives"],
    ["Vercel hosting", "Free tier covers most builders", "Your Vercel"],
    ["Bot runtime", "~$0.01–0.05 per conversation", "Your Anthropic API"],
    ["5 scheduled routines", "~$18–59 per month", "Your Anthropic API"],
    ["Your maintenance time", "~15 min / week using Claude Max", "You"],
]
cost = Table(cost_data, colWidths=[1.6 * inch, 2.6 * inch, 3.1 * inch])
cost.setStyle(TableStyle([
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 8),
    ("TEXTCOLOR", (0, 0), (-1, 0), AMBER),
    ("TEXTCOLOR", (0, 1), (-1, -1), CHARCOAL),
    ("BACKGROUND", (0, 0), (-1, 0), SAND),
    ("LINEBELOW", (0, 0), (-1, 0), 0.6, AMBER),
    ("LINEBELOW", (0, 1), (-1, -2), 0.3, SAND),
    ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ("TOPPADDING", (0, 0), (-1, -1), 4),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
]))
story.append(cost)
story.append(Paragraph("Nothing flows through us. Cancel us tomorrow — the bot keeps running.", SMALL))

# Comparison
story.append(Paragraph("How this is different", H2))
diff_data = [
    ["Most chatbot products", "This"],
    ["Hosted by the vendor", "Hosted by you"],
    ["Your data on their servers", "Your data on your servers"],
    ["Locked in by infrastructure", "Cancel anytime — keeps running"],
    ["Generic prompt + your FAQ", "Trained on your SOPs, transcripts, qualifying logic"],
    ["Static — gets stale", "Self-improves via routines on your account"],
    ["Test in production", "18-persona eval + live probes before you ship"],
]
diff = Table(diff_data, colWidths=[3.65 * inch, 3.65 * inch])
diff.setStyle(TableStyle([
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 8),
    ("TEXTCOLOR", (0, 0), (0, 0), STEEL),
    ("TEXTCOLOR", (1, 0), (1, 0), AMBER),
    ("TEXTCOLOR", (0, 1), (0, -1), STEEL),
    ("TEXTCOLOR", (1, 1), (1, -1), INK),
    ("LINEBELOW", (0, 0), (-1, 0), 0.4, SAND),
    ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ("TOPPADDING", (0, 0), (-1, -1), 2.5),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
]))
story.append(diff)

# Fit
story.append(Paragraph("Honest about fit", H2))
story.append(Paragraph(
    "<b>Right for you if:</b> your team will use Claude Max to iterate on the bot weekly, "
    "you want the bot to keep getting smarter without hiring an engineer, and data "
    "sovereignty matters to you.",
    BODY,
))
story.append(Paragraph(
    "<b>Not right if:</b> you want a fully hands-off &quot;set and forget&quot; chatbot, "
    "or you don't have anyone on the team who'll use Claude Max regularly.",
    BODY,
))

# Footer
story.append(Paragraph(
    "Built for Complete Barndo Solutions — barndominium builders who handle every step. "
    "·  completebarndosolutions.com  ·  TX  ·  TN  ·  OK  ·  LA",
    FOOT,
))

# Force everything onto a single page — KeepInFrame shrinks if it overflows
frame = KeepInFrame(7.5 * inch, 10.1 * inch, story, mode="shrink")
doc.build([frame])
print("Wrote docs/groundwork-one-pager.pdf")
