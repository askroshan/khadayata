#!/usr/bin/env python3
"""
Monthly Matrimonial PDF Generator & Email Dispatcher for KhadayataOnline.

Generates 4 A4 PDFs on the 1st of every month:
  - nri-boys-YYYYMMDD.pdf    (Male, current location outside India)
  - nri-girls-YYYYMMDD.pdf   (Female, current location outside India)
  - india-boys-YYYYMMDD.pdf  (Male, current location in India)
  - india-girls-YYYYMMDD.pdf (Female, current location in India)

Privacy:
  - Candidate email addresses are NEVER included in any generated PDF.

Ad Pages:
  - Pulls active A4-sized PDFs from the `matrimonial_ad_pdfs` table (managed in Admin)
    ordered by `display_order ASC, created_at ASC` and appends them to each PDF.

Delivery:
  - Emails all generated PDFs as attachments via Emailit API to:
    roshan@khadayataonline.com, rinashah075@gmail.com
"""

from __future__ import annotations

import base64
import os
import sys
import tempfile
import time
from datetime import datetime, timezone
from io import BytesIO
from typing import Any

import pypdf
import qrcode
import requests
from PIL import Image as PilImage
from PIL.Image import Resampling
from reportlab.lib.colors import black, blue, white
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas as pdf_canvas
from reportlab.platypus import (
    Frame,
    Image,
    PageBreak,
    PageTemplate,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# ── Configuration ─────────────────────────────────────────────────────────────

RECIPIENTS = [
    "roshan@khadayataonline.com",
    "rinashah075@gmail.com",
]
EMAILIT_API_URL = "https://api.emailit.com/v2/emails"
FROM_EMAIL = "KhadayataOnline <noreply@khadayataonline.com>"
SITE_BASE_URL = os.environ.get("SITE_BASE_URL", "https://khadayataonline.com").rstrip("/")
CONTACT_INFO = "For corrections/updates please contact: +1-682-432-9400 or write to roshan@khadayataonline.com"

MAX_IMAGE_WIDTH = 2.5 * inch
MAX_IMAGE_HEIGHT = 3.0 * inch
JPEG_QUALITY = 82
CONTENT_INNER_PADDING = 20
FOOTER_HORIZONTAL_MARGIN = 0.5 * inch
FOOTER_VERTICAL_POSITION = 20


# ── Classification & Sorting ──────────────────────────────────────────────────

def is_india_location(country: str | None) -> bool:
    """Return True if the profile's current country is India."""
    if not country:
        return False
    normalized = country.strip().lower()
    return normalized in {"india", "in", "ind", "bharat"}


def normalize_gender(gender: str | None) -> str | None:
    """Normalize gender to 'male' or 'female', or None if unknown."""
    if not gender:
        return None
    g = gender.strip().lower()
    if g in {"male", "m", "boy", "groom"}:
        return "male"
    if g in {"female", "f", "girl", "bride"}:
        return "female"
    return None


def compute_age(dob: str | None) -> int | None:
    if not dob:
        return None
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y"):
        try:
            dt = datetime.strptime(dob[:10], fmt)
            today = datetime.now(timezone.utc)
            age = today.year - dt.year - ((today.month, today.day) < (dt.month, dt.day))
            return age if 15 <= age <= 100 else None
        except ValueError:
            continue
    return None


def categorize_profiles(profiles: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    """
    Split active matrimonial profiles into the 4 monthly PDF buckets:
      - nri-boys
      - nri-girls
      - india-boys
      - india-girls
    Each bucket is sorted by age ascending, then first_name ascending.
    """
    buckets: dict[str, list[dict[str, Any]]] = {
        "nri-boys": [],
        "nri-girls": [],
        "india-boys": [],
        "india-girls": [],
    }

    for p in profiles:
        if p.get("is_deleted"):
            continue
        member = p.get("member") or {}
        gender = normalize_gender(member.get("gender"))
        if not gender:
            continue

        country = p.get("country") or member.get("current_country")
        in_india = is_india_location(country)

        if in_india and gender == "male":
            buckets["india-boys"].append(p)
        elif in_india and gender == "female":
            buckets["india-girls"].append(p)
        elif not in_india and gender == "male":
            buckets["nri-boys"].append(p)
        elif not in_india and gender == "female":
            buckets["nri-girls"].append(p)

    for key in buckets:
        buckets[key].sort(
            key=lambda item: (
                compute_age((item.get("member") or {}).get("dob")) or 999,
                ((item.get("member") or {}).get("first_name") or "").strip().lower(),
            )
        )

    return buckets


# ── Supabase Data Fetching ────────────────────────────────────────────────────

def fetch_supabase_data(supabase_url: str, service_role_key: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Accept": "application/json",
    }

    # Fetch active matrimonial profiles with member details
    profiles_url = (
        f"{supabase_url.rstrip('/')}/rest/v1/matrimonial_profiles"
        "?select=*,member:members!matrimonial_profiles_member_id_fkey("
        "id,global_id,first_name,last_name,gender,dob,photo_url,social_links,chapters(name))"
        "&is_deleted=eq.false"
        "&limit=5000"
    )
    resp = requests.get(profiles_url, headers=headers, timeout=30)
    resp.raise_for_status()
    profiles = resp.json()

    # Fetch active A4 ad PDFs in display order
    ads_url = (
        f"{supabase_url.rstrip('/')}/rest/v1/matrimonial_ad_pdfs"
        "?select=id,title,file_url,display_order"
        "&is_active=eq.true"
        "&order=display_order.asc,created_at.asc"
    )
    ads_resp = requests.get(ads_url, headers=headers, timeout=30)
    ads_resp.raise_for_status()
    ad_pdfs = ads_resp.json()

    return profiles, ad_pdfs


# ── Image & QR Helpers ────────────────────────────────────────────────────────

def fetch_optimized_photo(photo_url: str | None) -> BytesIO | None:
    if not photo_url or not photo_url.startswith("http"):
        return None
    for attempt in range(2):
        try:
            res = requests.get(photo_url, timeout=10)
            if res.status_code != 200:
                continue
            pil_img = PilImage.open(BytesIO(res.content))
            if pil_img.mode in ("RGBA", "P"):
                bg = PilImage.new("RGB", pil_img.size, (255, 255, 255))
                bg.paste(pil_img, (0, 0), pil_img if pil_img.mode == "RGBA" else None)
                pil_img = bg
            elif pil_img.mode != "RGB":
                pil_img = pil_img.convert("RGB")

            w, h = pil_img.size
            scale = min(int(MAX_IMAGE_WIDTH) / w, int(MAX_IMAGE_HEIGHT) / h)
            if scale < 1:
                pil_img = pil_img.resize((int(w * scale), int(h * scale)), Resampling.LANCZOS)

            buf = BytesIO()
            pil_img.save(buf, format="JPEG", quality=JPEG_QUALITY)
            buf.seek(0)
            return buf
        except Exception:
            if attempt == 0:
                time.sleep(1)
    return None


def make_qr_image(profile_id: str) -> BytesIO | None:
    try:
        url = f"{SITE_BASE_URL}/matrimonial/{profile_id}"
        qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=6, border=2)
        qr.add_data(url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buf = BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        return buf
    except Exception:
        return None


def esc(val: Any) -> str:
    return (
        str(val)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def format_field(label: str, value: Any) -> str | None:
    if value is None:
        return None
    text = ", ".join(str(v) for v in value if v) if isinstance(value, list) else str(value).strip()
    if not text or text.lower() in {"none", "nan", "null"}:
        return None
    return f"<b>{esc(label)}:</b> {esc(text)}"


# ── PDF Builder ───────────────────────────────────────────────────────────────

def build_category_pdf(
    title: str,
    profiles: list[dict[str, Any]],
    output_path: str,
    ad_pdf_paths: list[str],
) -> None:
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("TitleHeader", parent=styles["h1"], alignment=TA_CENTER, fontSize=24, spaceAfter=14, fontName="Helvetica-Bold")
    sub_style = ParagraphStyle("TitleSub", parent=styles["Normal"], alignment=TA_CENTER, fontSize=12, spaceAfter=8, fontName="Helvetica")
    count_style = ParagraphStyle("Count", parent=styles["Normal"], alignment=TA_CENTER, fontSize=14, spaceAfter=10, fontName="Helvetica-Bold")
    name_style = ParagraphStyle("ProfileName", parent=styles["h1"], alignment=TA_LEFT, fontSize=16, spaceAfter=4, fontName="Helvetica-Bold")
    id_style = ParagraphStyle("ProfileId", parent=styles["Normal"], alignment=TA_LEFT, fontSize=11, spaceAfter=4, fontName="Helvetica-Bold", textColor=blue)
    sec_style = ParagraphStyle("Section", parent=styles["h2"], alignment=TA_LEFT, fontSize=11, spaceBefore=6, spaceAfter=2, fontName="Helvetica-Bold")
    data_style = ParagraphStyle("Data", parent=styles["Normal"], fontSize=9, spaceAfter=1, leading=11, fontName="Helvetica")

    doc = SimpleDocTemplate(output_path, pagesize=A4)
    frame = Frame(
        doc.leftMargin + CONTENT_INNER_PADDING,
        doc.bottomMargin + 30,
        doc.width - (2 * CONTENT_INNER_PADDING),
        doc.height - 40,
        id="normal",
    )
    doc.addPageTemplates([PageTemplate(id="Main", frames=[frame])])

    story: list[Any] = [
        Spacer(1, 1.2 * inch),
        Paragraph(esc(title), title_style),
        Spacer(1, 0.25 * inch),
        Paragraph(f"Generated on {datetime.now(timezone.utc).strftime('%d-%b-%Y')}", sub_style),
        Paragraph(f"Total Profiles: {len(profiles)}", count_style),
        Spacer(1, 0.2 * inch),
        Paragraph(esc(CONTACT_INFO), sub_style),
        Paragraph(f"Browse live profiles at {SITE_BASE_URL}/matrimonial", sub_style),
        Paragraph("Note: Candidate email addresses are intentionally omitted for privacy. Use KhadayataOnline to message candidates privately.", sub_style),
        PageBreak(),
    ]

    for idx, p in enumerate(profiles, start=1):
        m = p.get("member") or {}
        full_name = f"{m.get('first_name') or ''} {m.get('last_name') or ''}".strip() or "Community Member"
        age = compute_age(m.get("dob"))
        photo_url = (p.get("photos") or [None])[0] or m.get("photo_url")
        photo_buf = fetch_optimized_photo(photo_url)

        if photo_buf:
            pil_img = PilImage.open(photo_buf)
            ow, oh = pil_img.size
            ratio = oh / ow if ow else 1.0
            nw = MAX_IMAGE_WIDTH
            nh = nw * ratio
            if nh > MAX_IMAGE_HEIGHT:
                nh = MAX_IMAGE_HEIGHT
                nw = nh / ratio
            photo_buf.seek(0)
            img_flowable: Any = Image(photo_buf, width=nw, height=nh)
        else:
            img_flowable = Paragraph("Photo not available", data_style)

        right_col: list[Any] = [img_flowable, Spacer(1, 0.2 * inch)]
        qr_buf = make_qr_image(str(p.get("id", "")))
        if qr_buf:
            right_col.append(Paragraph("<b>Scan for Live Profile</b>", data_style))
            right_col.append(Image(qr_buf, width=1.4 * inch, height=1.4 * inch))

        left_col: list[Any] = [
            Paragraph(f"Profile #{idx} | {esc(m.get('global_id') or p.get('external_profile_id') or '')}", id_style),
            Paragraph(esc(full_name), name_style),
            Paragraph("Personal & Location", sec_style),
        ]

        # NOTE: Candidate email is intentionally NEVER included here.
        personal_fields = [
            format_field("Age", f"{age} yrs" if age else None),
            format_field("Gender", m.get("gender")),
            format_field("Date of Birth", m.get("dob")),
            format_field("Marital Status", p.get("marital_status")),
            format_field("Current City", p.get("current_city")),
            format_field("Current State", p.get("current_state")),
            format_field("Current Country", p.get("country")),
            format_field("Birth Country", p.get("birth_country")),
            format_field("Visa / Citizenship", p.get("visa_status") or p.get("citizenship")),
            format_field("Phone", p.get("contact_number")),
            format_field("WhatsApp", p.get("whatsapp_number")),
        ]
        for line in personal_fields:
            if line:
                left_col.append(Paragraph(line, data_style))

        left_col.append(Paragraph("Education, Career & Lifestyle", sec_style))
        career_fields = [
            format_field("Education", p.get("education_level") or p.get("education")),
            format_field("Job Title", p.get("position_title") or p.get("occupation")),
            format_field("Company", p.get("company")),
            format_field("Employment Type", p.get("employment_type")),
            format_field("Height", f"{p.get('height_cm')} cm" if p.get("height_cm") else None),
            format_field("Diet", p.get("diet")),
            format_field("Smoking", p.get("smoking_habits")),
            format_field("Drinking", p.get("drinking_habits")),
            format_field("Ekda", p.get("ekda")),
            format_field("Gotra", p.get("gotra")),
            format_field("Manglik", p.get("manglik")),
        ]
        for line in career_fields:
            if line:
                left_col.append(Paragraph(line, data_style))

        left_col.append(Paragraph("Family & Partner Preferences", sec_style))
        family_fields = [
            format_field("Father", " - ".join(filter(None, [p.get("father_name"), p.get("father_occupation")]))),
            format_field("Mother", " - ".join(filter(None, [p.get("mother_name"), p.get("mother_occupation")]))),
            format_field("Brothers", p.get("brothers_count")),
            format_field("Sisters", p.get("sisters_count")),
            format_field("Partner Preferences", p.get("partner_preferences_summary")),
            format_field("About", p.get("about")),
        ]
        for line in family_fields:
            if line:
                left_col.append(Paragraph(line, data_style))

        table = Table([[left_col, right_col]], colWidths=[4.5 * inch, 2.5 * inch])
        table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("ALIGN", (0, 0), (-1, -1), "LEFT")]))
        story.append(table)

        if idx < len(profiles):
            story.append(PageBreak())

    doc.build(story)

    # Append Admin-configured A4 ad PDFs (`ad_pages`)
    if ad_pdf_paths:
        merge_ad_pdfs(output_path, ad_pdf_paths)

    # Add Page X of Y footer
    add_pagination(output_path)


def merge_ad_pdfs(main_pdf_path: str, ad_pdf_paths: list[str]) -> None:
    writer = pypdf.PdfWriter()
    main_reader = pypdf.PdfReader(main_pdf_path)
    for page in main_reader.pages:
        writer.add_page(page)

    for ad_path in ad_pdf_paths:
        try:
            ad_reader = pypdf.PdfReader(ad_path)
            for page in ad_reader.pages:
                writer.add_page(page)
        except Exception as exc:
            print(f"Warning: skipping unreadable ad PDF {ad_path}: {exc}")

    tmp_path = f"{main_pdf_path}.merged.tmp"
    with open(tmp_path, "wb") as f:
        writer.write(f)
    os.replace(tmp_path, main_pdf_path)


def add_pagination(pdf_path: str) -> None:
    reader = pypdf.PdfReader(pdf_path)
    writer = pypdf.PdfWriter()
    total_pages = len(reader.pages)
    created = datetime.now(timezone.utc).strftime("%d-%b-%Y")
    page_width, _ = A4

    for idx, page in enumerate(reader.pages, start=1):
        packet = BytesIO()
        can = pdf_canvas.Canvas(packet, pagesize=A4)
        can.setFont("Helvetica", 9)
        can.setFillColor(black)
        can.drawString(FOOTER_HORIZONTAL_MARGIN, FOOTER_VERTICAL_POSITION, f"Generated on: {created}")
        right_text = f"Page {idx} of {total_pages}"
        rw = can.stringWidth(right_text, "Helvetica", 9)
        can.drawString(page_width - FOOTER_HORIZONTAL_MARGIN - rw, FOOTER_VERTICAL_POSITION, right_text)
        can.save()
        footer_page = pypdf.PdfReader(packet).pages[0]
        page.merge_page(footer_page)
        writer.add_page(page)

    tmp_path = f"{pdf_path}.paged.tmp"
    with open(tmp_path, "wb") as f:
        writer.write(f)
    os.replace(tmp_path, pdf_path)


def send_pdfs_via_emailit(emailit_api_key: str, pdf_files: list[tuple[str, str]], counts: dict[str, int]) -> None:
    attachments = []
    for filename, path in pdf_files:
        with open(path, "rb") as f:
            encoded = base64.b64encode(f.read()).decode("ascii")
        attachments.append({
            "filename": filename,
            "content": encoded,
            "content_type": "application/pdf",
        })

    date_human = datetime.now(timezone.utc).strftime("%B %Y")
    html = (
        f"<h2>KhadayataOnline Monthly Matrimonial PDFs — {date_human}</h2>"
        "<p>Please find attached the auto-generated monthly matrimonial directories (candidate emails excluded):</p>"
        "<ul>"
        f"<li><strong>NRI Boys</strong>: {counts['nri-boys']} profiles</li>"
        f"<li><strong>NRI Girls</strong>: {counts['nri-girls']} profiles</li>"
        f"<li><strong>India Boys</strong>: {counts['india-boys']} profiles</li>"
        f"<li><strong>India Girls</strong>: {counts['india-girls']} profiles</li>"
        "</ul>"
    )

    payload = {
        "from": FROM_EMAIL,
        "to": RECIPIENTS,
        "subject": f"KhadayataOnline Monthly Matrimonial PDFs — {date_human}",
        "html": html,
        "attachments": attachments,
    }

    res = requests.post(
        EMAILIT_API_URL,
        headers={
            "Authorization": f"Bearer {emailit_api_key}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=60,
    )
    if not res.ok:
        raise RuntimeError(f"Emailit API error ({res.status_code}): {res.text}")
    print(f"Sent {len(attachments)} PDFs to {', '.join(RECIPIENTS)}")


def main() -> int:
    supabase_url = os.environ.get("SUPABASE_URL", "").strip()
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    emailit_key = os.environ.get("EMAILIT_API_KEY", "").strip()
    dry_run = os.environ.get("DRY_RUN", "").lower() in {"1", "true", "yes"}

    if not supabase_url or not service_role_key:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.", file=sys.stderr)
        return 1

    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    profiles, ad_pdf_rows = fetch_supabase_data(supabase_url, service_role_key)
    buckets = categorize_profiles(profiles)

    with tempfile.TemporaryDirectory() as tmpdir:
        # Download active A4 ad PDFs
        ad_pdf_paths: list[str] = []
        for idx, ad in enumerate(ad_pdf_rows):
            url = ad.get("file_url")
            if not url:
                continue
            try:
                r = requests.get(url, timeout=20)
                r.raise_for_status()
                ad_file = os.path.join(tmpdir, f"ad_{idx:03d}.pdf")
                with open(ad_file, "wb") as f:
                    f.write(r.content)
                ad_pdf_paths.append(ad_file)
            except Exception as exc:
                print(f"Warning: could not download ad PDF {ad.get('title')}: {exc}")

        specs = [
            ("nri-boys", f"nri-boys-{date_str}.pdf", "Khadayata NRI Matrimony — Boys"),
            ("nri-girls", f"nri-girls-{date_str}.pdf", "Khadayata NRI Matrimony — Girls"),
            ("india-boys", f"india-boys-{date_str}.pdf", "Khadayata India Matrimony — Boys"),
            ("india-girls", f"india-girls-{date_str}.pdf", "Khadayata India Matrimony — Girls"),
        ]

        generated: list[tuple[str, str]] = []
        for key, filename, title in specs:
            out_path = os.path.join(tmpdir, filename)
            build_category_pdf(title, buckets[key], out_path, ad_pdf_paths)
            generated.append((filename, out_path))
            print(f"Generated {filename} ({len(buckets[key])} profiles, {len(ad_pdf_paths)} ad PDFs)")

        counts = {k: len(v) for k, v in buckets.items()}
        if dry_run:
            print("DRY_RUN enabled — skipping email dispatch.")
            return 0

        if not emailit_key:
            print("Error: EMAILIT_API_KEY is required to send emails.", file=sys.stderr)
            return 1

        send_pdfs_via_emailit(emailit_key, generated, counts)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
