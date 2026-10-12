"""Render the checked-in social card; requires Pillow (not a production dependency)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

image = Image.new('RGB', (1200, 630), '#F7FAFC')
draw = ImageDraw.Draw(image)
font_path = 'C:/Windows/Fonts/arialbd.ttf'
try:
    from fontTools.ttLib import TTFont
    Path('work').mkdir(exist_ok=True)
    font = TTFont('apps/web/public/fonts/space-grotesk.woff2')
    font.flavor = None
    font.save('work/social-space-grotesk.ttf')
    font_path = 'work/social-space-grotesk.ttf'
except ImportError:
    pass
bold = ImageFont.truetype(font_path, 72)
body = ImageFont.truetype(font_path, 36)
small = ImageFont.truetype(font_path, 28)
ink, green = '#0F172A', '#76B900'
draw.rounded_rectangle((44, 44, 1156, 586), radius=24, outline='#D9E2EC', width=2)
def polygon(points, color):
    draw.polygon([(80+x*1.25, 100+y*1.25) for x,y in points], fill=color)
polygon([(49,18),(13,46),(49,74),(49,59),(32,46),(49,33)],ink)
polygon([(83,18),(119,46),(83,74),(83,59),(100,46),(83,33)],ink)
polygon([(70,6),(47,86),(63,86),(86,6)],green)
draw.text((260, 116), 'CODE', font=bold, fill=ink)
width = draw.textlength('CODE', font=bold)
draw.text((280+width, 116), 'CLASH', font=bold, fill=green)
draw.rectangle((260,200,260+width,205), fill=green)
draw.text((96,282), 'Live Python coding duels.', font=body, fill=ink)
draw.text((96,338), 'DSA practice at your own pace.', font=body, fill=ink)
draw.text((96,488), 'code-clash.com', font=small, fill='#475569')
target = Path('apps/web/public/social/codeclash.png')
target.parent.mkdir(parents=True, exist_ok=True)
image.save(target, optimize=True)
print(target)
