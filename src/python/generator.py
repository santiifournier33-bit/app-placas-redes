import sys
import json
import argparse
import os
import urllib.request
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ═══════════════════════════════════════
# CONSTANTS
# ═══════════════════════════════════════
NAVY = (0, 37, 72)
NAVY_DARK = (0, 20, 45)
GOLD = (200, 164, 90)
WHITE = (255, 255, 255)
LIGHT_GRAY = (220, 224, 232)
BADGE_VENTA = (0, 37, 72)
BADGE_ALQUILER = (0, 102, 137)

def download_image(url, local_path):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as response:
            with open(local_path, 'wb') as f:
                f.write(response.read())
        return True
    except Exception as e:
        print(f"Error downloading image: {e}", file=sys.stderr)
        return False

def get_font(bold=False, size=48):
    try:
        name = "arialbd.ttf" if bold else "arial.ttf"
        return ImageFont.truetype(name, size)
    except IOError:
        try:
            name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
            return ImageFont.truetype(name, size)
        except IOError:
            return ImageFont.load_default()

def draw_rounded_rect(draw, xy, radius, fill):
    x0, y0, x1, y1 = xy
    draw.rectangle([x0 + radius, y0, x1 - radius, y1], fill=fill)
    draw.rectangle([x0, y0 + radius, x1, y1 - radius], fill=fill)
    draw.pieslice([x0, y0, x0 + 2*radius, y0 + 2*radius], 180, 270, fill=fill)
    draw.pieslice([x1 - 2*radius, y0, x1, y0 + 2*radius], 270, 360, fill=fill)
    draw.pieslice([x0, y1 - 2*radius, x0 + 2*radius, y1], 90, 180, fill=fill)
    draw.pieslice([x1 - 2*radius, y1 - 2*radius, x1, y1], 0, 90, fill=fill)

def draw_gradient_overlay(img, start_y, height, color=(0, 20, 45), max_alpha=220):
    """Draw a smooth gradient from transparent to opaque."""
    overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for i in range(height):
        progress = i / height
        alpha = int(max_alpha * (progress ** 1.5))
        y = start_y + i
        if y < img.size[1]:
            draw.line([(0, y), (img.size[0], y)], fill=(*color, alpha))
    img_rgba = img.convert('RGBA')
    return Image.alpha_composite(img_rgba, overlay).convert('RGB')

# ═══════════════════════════════════════
# FEATURE ICONS (text-based since we can't load SVGs)
# ═══════════════════════════════════════
FEATURE_ICONS = {
    "ambientes": "◻",
    "dormitorios": "◼",
    "baños": "◆",
    "m² total": "▣",
    "m² cubierto": "▥",
}

def draw_feature_pill(draw, x, y, icon_char, label, value, font_val, font_label, width=180):
    """Draw a feature pill with icon, value and label."""
    h = 60
    draw_rounded_rect(draw, (x, y, x + width, y + h), 8, fill=(255, 255, 255, 25))
    # Semi-transparent background
    for yy in range(y, y + h):
        draw.line([(x, yy), (x + width, yy)], fill=(*WHITE, 20))

    draw.text((x + 12, y + 8), str(value), fill=WHITE, font=font_val)
    draw.text((x + 12, y + 36), label, fill=(*LIGHT_GRAY,), font=font_label)
    return width

# ═══════════════════════════════════════
# GENERATE PLACA (IMAGE)
# ═══════════════════════════════════════
def generate_placa(data, format_type="story"):
    try:
        if format_type == "post":
            width, height = 1080, 1080
        else:  # story
            width, height = 1080, 1920

        temp_dir = "public/generated"
        os.makedirs(temp_dir, exist_ok=True)
        temp_img_path = os.path.join(temp_dir, f"temp_{data.get('id', 'prop')}.jpg")
        output_path = os.path.join(temp_dir, f"placa_{data.get('id', 'temp')}_{format_type}.png")

        # Create base image
        img = Image.new('RGB', (width, height), color=NAVY_DARK)

        # Download and place photo as full background
        photos = data.get("photos", [])
        if photos and len(photos) > 0:
            if download_image(photos[0], temp_img_path):
                try:
                    photo = Image.open(temp_img_path)
                    # Resize to cover the entire canvas
                    img_ratio = width / height
                    photo_ratio = photo.width / photo.height
                    if photo_ratio > img_ratio:
                        new_h = height
                        new_w = int(height * photo_ratio)
                    else:
                        new_w = width
                        new_h = int(width / photo_ratio)
                    photo = photo.resize((new_w, new_h), Image.Resampling.LANCZOS)
                    # Center crop
                    left = (new_w - width) // 2
                    top = (new_h - height) // 2
                    photo = photo.crop((left, top, left + width, top + height))
                    img.paste(photo, (0, 0))
                except Exception as ex:
                    print(f"Error processing photo: {ex}", file=sys.stderr)

        # Apply gradient overlay on bottom half
        gradient_start = int(height * 0.35)
        gradient_height = height - gradient_start
        img = draw_gradient_overlay(img, gradient_start, gradient_height, NAVY_DARK, 240)

        draw = ImageDraw.Draw(img)

        # Fonts
        font_badge = get_font(bold=True, size=24)
        font_type = get_font(bold=False, size=28)
        font_price = get_font(bold=True, size=64)
        font_address = get_font(bold=True, size=42)
        font_location = get_font(bold=False, size=28)
        font_feat_val = get_font(bold=True, size=28)
        font_feat_label = get_font(bold=False, size=16)

        # ── Badge (Venta/Alquiler) ──
        op_type = str(data.get('operation_type', 'Venta')).upper()
        is_alquiler = 'alquiler' in op_type.lower()
        badge_color = BADGE_ALQUILER if is_alquiler else BADGE_VENTA
        badge_text = "EN ALQUILER" if is_alquiler else "EN VENTA"
        badge_w = 200
        badge_h = 40
        badge_x = 60
        badge_y = int(height * 0.55) if format_type == "story" else int(height * 0.42)
        draw_rounded_rect(draw, (badge_x, badge_y, badge_x + badge_w, badge_y + badge_h), 6, fill=badge_color)
        draw.text((badge_x + 16, badge_y + 8), badge_text, fill=WHITE, font=font_badge)

        # ── Property Type ──
        prop_type = str(data.get('type', 'Propiedad')).upper()
        y_cursor = badge_y + badge_h + 16
        draw.text((60, y_cursor), prop_type, fill=GOLD, font=font_type)

        # ── Price ──
        y_cursor += 44
        price = data.get('price', 'Consultar')
        draw.text((60, y_cursor), str(price), fill=WHITE, font=font_price)

        # ── Address ──
        y_cursor += 80
        address = data.get('address', 'Dirección a confirmar')
        # Truncate if too long
        if len(address) > 35:
            address = address[:33] + "..."
        draw.text((60, y_cursor), address, fill=WHITE, font=font_address)

        # ── Location ──
        y_cursor += 56
        location = data.get('location', '')
        draw.text((60, y_cursor), location, fill=LIGHT_GRAY, font=font_location)

        # ── Feature Icons Grid ──
        y_cursor += 56
        features = []
        if data.get('rooms'):
            features.append(("Ambientes", str(data['rooms'])))
        if data.get('bedrooms'):
            features.append(("Dormitorios", str(data['bedrooms'])))
        if data.get('bathrooms'):
            features.append(("Baños", str(data['bathrooms'])))
        if data.get('surface_total'):
            features.append(("m² Total", str(data['surface_total'])))
        if data.get('surface_covered'):
            features.append(("m² Cubierto", str(data['surface_covered'])))

        # Max 5 features
        features = features[:5]

        if features:
            # Draw a subtle separator line
            draw.line([(60, y_cursor), (width - 60, y_cursor)], fill=(*WHITE, 40), width=1)
            y_cursor += 20

            # Calculate pill width based on number of features
            total_width = width - 120  # 60px margin each side
            gap = 12
            pill_w = (total_width - (len(features) - 1) * gap) // len(features)

            for i, (label, val) in enumerate(features):
                px = 60 + i * (pill_w + gap)
                # Value
                draw.text((px, y_cursor), val, fill=WHITE, font=font_feat_val)
                # Label
                draw.text((px, y_cursor + 32), label.upper(), fill=LIGHT_GRAY, font=font_feat_label)

        # Save output
        img.save(output_path, quality=95)

        # Clean up temp
        if os.path.exists(temp_img_path):
            os.remove(temp_img_path)

        return {"status": "success", "file": output_path.replace("public", "")}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# ═══════════════════════════════════════
# GENERATE PDF
# ═══════════════════════════════════════
def generate_pdf(data):
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm, cm
        from reportlab.lib.colors import HexColor
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, PageBreak
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
        from io import BytesIO

        temp_dir = "public/generated"
        os.makedirs(temp_dir, exist_ok=True)
        output_path = os.path.join(temp_dir, f"ficha_{data.get('id', 'temp')}.pdf")

        # Colors
        navy_hex = HexColor('#002548')
        gold_hex = HexColor('#C8A45A')
        gray_hex = HexColor('#475569')
        light_bg = HexColor('#f4f6fb')

        # Document setup
        doc = SimpleDocTemplate(
            output_path,
            pagesize=A4,
            leftMargin=20*mm,
            rightMargin=20*mm,
            topMargin=15*mm,
            bottomMargin=15*mm
        )

        styles = getSampleStyleSheet()

        # Custom styles
        style_title = ParagraphStyle(
            'FreireTitle', parent=styles['Normal'],
            fontSize=22, fontName='Helvetica-Bold',
            textColor=navy_hex, leading=26, spaceAfter=4*mm
        )
        style_subtitle = ParagraphStyle(
            'FreireSubtitle', parent=styles['Normal'],
            fontSize=11, fontName='Helvetica',
            textColor=gray_hex, leading=14, spaceAfter=2*mm
        )
        style_price = ParagraphStyle(
            'FreirePrice', parent=styles['Normal'],
            fontSize=18, fontName='Helvetica-Bold',
            textColor=gold_hex, leading=22, spaceAfter=6*mm
        )
        style_heading = ParagraphStyle(
            'FreireHeading', parent=styles['Normal'],
            fontSize=14, fontName='Helvetica-Bold',
            textColor=navy_hex, leading=18, spaceBefore=6*mm, spaceAfter=3*mm
        )
        style_body = ParagraphStyle(
            'FreireBody', parent=styles['Normal'],
            fontSize=10, fontName='Helvetica',
            textColor=gray_hex, leading=14, spaceAfter=2*mm
        )
        style_label = ParagraphStyle(
            'FreireLabel', parent=styles['Normal'],
            fontSize=8, fontName='Helvetica-Bold',
            textColor=navy_hex, leading=10
        )
        style_value = ParagraphStyle(
            'FreireValue', parent=styles['Normal'],
            fontSize=10, fontName='Helvetica',
            textColor=gray_hex, leading=12
        )

        elements = []
        page_w = A4[0] - 40*mm  # Usable width

        # ─── HEADER: Logo + Agent Info ───
        # Logo placeholder (left) + Agent info (right)
        header_data = [
            [
                Paragraph('<b>FREIRE</b><br/><font size="8" color="#475569">PROPIEDADES</font>', style_title),
                Paragraph(
                    '<font size="8" color="#475569">Agente Inmobiliario<br/>'
                    'info@freirepropiedades.com<br/>'
                    'Tel: +54 11 XXXX-XXXX</font>',
                    ParagraphStyle('right', parent=styles['Normal'], alignment=TA_RIGHT, fontSize=8, textColor=gray_hex)
                )
            ]
        ]
        header_table = Table(header_data, colWidths=[page_w * 0.5, page_w * 0.5])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8*mm),
        ]))
        elements.append(header_table)

        # ─── PROPERTY INFO ───
        op_type = str(data.get('operation_type', 'Venta')).upper()
        elements.append(Paragraph(f'<font size="9" color="#006689">{op_type}</font>', style_subtitle))
        elements.append(Paragraph(data.get('address', 'Dirección'), style_title))
        elements.append(Paragraph(data.get('location', ''), style_subtitle))

        price = data.get('price', 'Consultar')
        elements.append(Paragraph(str(price), style_price))

        prop_type = data.get('type', 'Propiedad')
        elements.append(Paragraph(f'Tipo: {prop_type}', style_body))

        # ─── COVER PHOTO ───
        photos = data.get("photos", [])
        temp_photos = []

        if photos:
            cover_path = os.path.join(temp_dir, f"pdf_cover_{data.get('id')}.jpg")
            if download_image(photos[0], cover_path):
                temp_photos.append(cover_path)
                try:
                    cover_img = RLImage(cover_path, width=page_w, height=page_w * 0.56)
                    cover_img.hAlign = 'CENTER'
                    elements.append(cover_img)
                    elements.append(Spacer(1, 4*mm))
                except:
                    pass

        # ─── MOSAIC (up to 4 secondary photos) ───
        secondary_photos = photos[1:5] if len(photos) > 1 else []
        if secondary_photos:
            mosaic_imgs = []
            for i, photo_url in enumerate(secondary_photos):
                p_path = os.path.join(temp_dir, f"pdf_mosaic_{data.get('id')}_{i}.jpg")
                if download_image(photo_url, p_path):
                    temp_photos.append(p_path)
                    try:
                        cell_w = (page_w - 4*mm) / 2
                        mosaic_imgs.append(RLImage(p_path, width=cell_w, height=cell_w * 0.65))
                    except:
                        mosaic_imgs.append("")
                else:
                    mosaic_imgs.append("")

            # Create 2x2 table
            while len(mosaic_imgs) < 4:
                mosaic_imgs.append("")
            mosaic_data = [mosaic_imgs[:2], mosaic_imgs[2:4]]
            cell_w = (page_w - 4*mm) / 2
            mosaic = Table(mosaic_data, colWidths=[cell_w, cell_w])
            mosaic.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('TOPPADDING', (0, 0), (-1, -1), 1*mm),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 1*mm),
                ('LEFTPADDING', (0, 0), (-1, -1), 1*mm),
                ('RIGHTPADDING', (0, 0), (-1, -1), 1*mm),
            ]))
            elements.append(mosaic)
            elements.append(Spacer(1, 6*mm))

        # ─── CHARACTERISTICS TABLE ───
        elements.append(Paragraph('Información General', style_heading))

        chars = []
        field_map = [
            ("Operación", data.get('operation_type', '-')),
            ("Tipo", data.get('type', '-')),
            ("Ambientes", data.get('rooms', '-')),
            ("Dormitorios", data.get('bedrooms', '-')),
            ("Baños", data.get('bathrooms', '-')),
            ("Sup. Total", f"{data.get('surface_total', '-')} m²"),
            ("Sup. Cubierta", f"{data.get('surface_covered', '-')} m²"),
            ("Cochera", data.get('parking', '-')),
            ("Orientación", data.get('orientation', '-') or '-'),
        ]
        # Build 3 column layout
        rows = []
        for i in range(0, len(field_map), 3):
            row = []
            for j in range(3):
                if i + j < len(field_map):
                    label, value = field_map[i + j]
                    cell = Paragraph(
                        f'<font size="7" color="#002548"><b>{label}</b></font><br/>'
                        f'<font size="9" color="#475569">{value}</font>',
                        style_value
                    )
                    row.append(cell)
                else:
                    row.append("")
            rows.append(row)

        col_w = page_w / 3
        char_table = Table(rows, colWidths=[col_w] * 3)
        char_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 3*mm),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3*mm),
            ('LINEBELOW', (0, 0), (-1, -2), 0.5, HexColor('#e0e0e0')),
        ]))
        elements.append(char_table)

        # ─── DESCRIPTION ───
        desc = data.get('description', '')
        if desc:
            elements.append(Paragraph('Descripción', style_heading))
            # Clean HTML tags
            import re
            clean_desc = re.sub('<[^<]+?>', '', desc)
            elements.append(Paragraph(clean_desc[:2000], style_body))

        # ─── ADDITIONAL PHOTOS (3 columns) ───
        extra_photos = photos[5:] if len(photos) > 5 else []
        if extra_photos:
            elements.append(PageBreak())
            elements.append(Paragraph('Galería de Fotos', style_heading))

            gallery_imgs = []
            for i, photo_url in enumerate(extra_photos[:12]):  # Max 12 extra photos
                p_path = os.path.join(temp_dir, f"pdf_gallery_{data.get('id')}_{i}.jpg")
                if download_image(photo_url, p_path):
                    temp_photos.append(p_path)
                    try:
                        cell_w = (page_w - 8*mm) / 3
                        gallery_imgs.append(RLImage(p_path, width=cell_w, height=cell_w * 0.7))
                    except:
                        gallery_imgs.append("")
                else:
                    gallery_imgs.append("")

            # Build rows of 3
            gallery_rows = []
            for i in range(0, len(gallery_imgs), 3):
                row = gallery_imgs[i:i+3]
                while len(row) < 3:
                    row.append("")
                gallery_rows.append(row)

            if gallery_rows:
                cell_w = (page_w - 8*mm) / 3
                gallery = Table(gallery_rows, colWidths=[cell_w] * 3)
                gallery.setStyle(TableStyle([
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('TOPPADDING', (0, 0), (-1, -1), 2*mm),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 2*mm),
                    ('LEFTPADDING', (0, 0), (-1, -1), 1*mm),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 1*mm),
                ]))
                elements.append(gallery)

        # ─── FOOTER: Location ───
        elements.append(Spacer(1, 8*mm))
        elements.append(Paragraph('Ubicación', style_heading))
        full_loc = data.get('full_location', data.get('location', ''))
        address = data.get('address', '')
        elements.append(Paragraph(f'{address}<br/>{full_loc}', style_body))

        # ─── BUILD PDF ───
        doc.build(elements)

        # Clean temp photos
        for p in temp_photos:
            try:
                os.remove(p)
            except:
                pass

        return {"status": "success", "file": output_path.replace("public", "")}

    except ImportError:
        return {"status": "error", "message": "ReportLab no está instalado. Ejecutá: pip install reportlab"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# ═══════════════════════════════════════
# MAIN
# ═══════════════════════════════════════
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Freire Generator")
    parser.add_argument("--type", type=str, required=True, choices=["placa", "pdf"])
    parser.add_argument("--datafile", type=str, required=True, help="Path to JSON file with property data")
    parser.add_argument("--format", type=str, default="story", choices=["story", "post"], help="Image format")

    args = parser.parse_args()

    with open(args.datafile, 'r', encoding='utf-8') as f:
        property_data = json.load(f)

    if args.type == "placa":
        result = generate_placa(property_data, args.format)
    else:
        result = generate_pdf(property_data)

    print(json.dumps(result))
