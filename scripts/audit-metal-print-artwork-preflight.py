#!/usr/bin/env python3
import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "ops/metal-print-vip/proof-assets/deus-sive-natura-whitewall-3000x3000.tiff"
OUTPUT = ROOT / "ops/metal-print-vip/artwork-preflight-evidence.json"
TARGET_CM = 60
WHITEWALL_HD_METAL_OUTPUT_DPI = 300


def percentile(histogram: list[int], fraction: float) -> int:
    target = sum(histogram) * fraction
    running = 0
    for value, count in enumerate(histogram):
        running += count
        if running >= target:
            return value
    return 255


with Image.open(SOURCE) as image:
    image.load()
    rgb = image.convert("RGB")
    luminance = rgb.convert("L")
    histogram = luminance.histogram()
    pixels = rgb.width * rgb.height
    stats = ImageStat.Stat(rgb)
    ppi = rgb.width / (TARGET_CM / 2.54)
    required_pixels = round((TARGET_CM / 2.54) * WHITEWALL_HD_METAL_OUTPUT_DPI)
    interpolation_multiple = required_pixels / rgb.width

    evidence = {
        "generatedAt": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        "evidenceClass": "DIGITAL_ARTWORK_PREFLIGHT",
        "source": str(SOURCE.relative_to(ROOT)),
        "sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        "fileBytes": SOURCE.stat().st_size,
        "format": image.format,
        "mode": image.mode,
        "iccProfilePresent": bool(image.info.get("icc_profile")),
        "dimensionsPx": {"width": rgb.width, "height": rgb.height},
        "aspectRatio": rgb.width / rgb.height,
        "targetCm": {"width": TARGET_CM, "height": TARGET_CM},
        "effectivePpi": round(ppi, 2),
        "whiteWallHdMetalOutputDpi": WHITEWALL_HD_METAL_OUTPUT_DPI,
        "pixelsPerSideForNativeOutputDpi": required_pixels,
        "linearInterpolationMultiple": round(interpolation_multiple, 3),
        "viewingDistanceRuleOfThumbMeters": round((2 * math.sqrt(2 * TARGET_CM * TARGET_CM)) / 100, 2),
        "channelMean8Bit": {"red": round(stats.mean[0], 3), "green": round(stats.mean[1], 3), "blue": round(stats.mean[2], 3)},
        "luminance8Bit": {
            "p01": percentile(histogram, 0.01),
            "p05": percentile(histogram, 0.05),
            "p50": percentile(histogram, 0.50),
            "p95": percentile(histogram, 0.95),
            "p99": percentile(histogram, 0.99),
            "atOrBelow2Percent": round(sum(histogram[:3]) / pixels * 100, 4),
            "atOrBelow5Percent": round(sum(histogram[:6]) / pixels * 100, 4),
            "atOrAbove250Percent": round(sum(histogram[250:]) / pixels * 100, 4),
        },
        "mechanicalChecks": {
            "square": rgb.width == rgb.height,
            "minimumUploadPixels": rgb.width >= 700 and rgb.height >= 700,
            "noAlpha": image.mode in {"RGB", "CMYK"},
            "targetWithinWhiteWallChromaLuxeSizeRange": 9 <= TARGET_CM <= 120,
        },
        "decision": "DIGITALLY_READY_PHYSICAL_PROOF_REQUIRED",
        "risks": [
            "3000 px at 60 cm is about 127 ppi; WhiteWall's stated HD Metal output is 300 dpi, requiring roughly 2.36x linear interpolation.",
            "The artwork is dark; physical proof must confirm shadow separation and reflected-light behavior on glossy ChromaLuxe.",
            "Digital preflight cannot approve color, gloss, edge finish, mounting hardware, shipping damage or perceived sharpness.",
        ],
    }

assert evidence["mechanicalChecks"]["square"]
assert evidence["mechanicalChecks"]["minimumUploadPixels"]
assert evidence["mechanicalChecks"]["noAlpha"]
assert evidence["mechanicalChecks"]["targetWithinWhiteWallChromaLuxeSizeRange"]
OUTPUT.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(evidence, ensure_ascii=False, indent=2))
