# OG 이미지 생성 (1200x630). `python3 tools/og.py`
from PIL import Image, ImageDraw, ImageFont
import glob, os

W, H = 1200, 630
BG, CARD, TEXT, MUTED, ACCENT = (230, 240, 251), (247, 250, 254), (15, 27, 45), (75, 90, 112), (45, 107, 214)
font_dir = [p for p in glob.glob(os.path.expanduser("~/Library/Fonts/Pretendard-*.ttf")) + glob.glob("/Library/Fonts/Pretendard-*.ttf")]
def font(weight, size):
    for p in font_dir:
        if p.endswith(f"Pretendard-{weight}.ttf"): return ImageFont.truetype(p, size)
    return ImageFont.truetype("/System/Library/Fonts/AppleSDGothicNeo.ttc", size)

img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)
# 카드
d.rounded_rectangle((60, 60, W - 60, H - 60), radius=48, fill=CARD, outline=(200, 214, 235), width=2)
# 브랜드 마크
d.rounded_rectangle((120, 120, 184, 184), radius=18, fill=ACCENT)
d.text((152, 152), "날", font=font("ExtraBold", 34), fill="white", anchor="mm")
d.text((204, 152), "날셈", font=font("Bold", 40), fill=TEXT, anchor="lm")
# 헤드라인
d.text((120, 250), "나이도 날짜도 음력도", font=font("Bold", 76), fill=TEXT)
d.text((120, 340), "한 번에 ", font=font("Bold", 76), fill=TEXT)
w = d.textlength("한 번에 ", font=font("Bold", 76))
d.text((120 + w, 340), "셈하기", font=font("Bold", 76), fill=ACCENT)
d.text((120, 470), "만나이 · 디데이 · 양력 음력 변환 · 공휴일 · 띠와 삼재 등 생활계산기 28종", font=font("Medium", 30), fill=MUTED)
os.makedirs("docs/assets", exist_ok=True)
img.save("docs/assets/og.png", optimize=True)
print("docs/assets/og.png", os.path.getsize("docs/assets/og.png"), "bytes")
