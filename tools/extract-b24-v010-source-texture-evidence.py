#!/usr/bin/env python3
"""Extract and audit the exact source textures embedded in frozen B24 V010.

The frozen V010 HTML contains a gzip-compressed native manifest and payload.
This tool verifies the locked HTML, decompresses both structures, validates all
source-image block hashes, writes the 18 original images and generates visual
evidence boards from a versioned review contract.

It never modifies the source HTML, source GLB, geometry, animation or livery.
"""
from __future__ import annotations

import argparse
import base64
import gzip
import hashlib
import json
import math
import re
import shutil
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont

EXPECTED_HTML_BYTES = 12_550_988
EXPECTED_HTML_SHA256 = "1b5b860ca78a7d55ea25d0d972a1d323125a57982d09452e7f7e0cb55d64a949"
EXPECTED_SOURCE_GLB_BYTES = 23_085_972
EXPECTED_SOURCE_GLB_SHA256 = "541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d"
EXPECTED_MANIFEST_SHA256 = "8934b65ef1b29fc8b64da5e339815a39f8d03254c0b31638781bc16016a6d307"
EXPECTED_PAYLOAD_BYTES = 16_647_376
EXPECTED_PAYLOAD_SHA256 = "7ba1b923844f5161911e9aa63b18191e0d08ff8de4b3750204aa544320bd34c2"


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def extract_embedded_blob(html: str, key: str) -> bytes:
    match = re.search(rf'{re.escape(key)}:"([A-Za-z0-9+/=]+)"', html)
    if not match:
        raise RuntimeError(f"Missing embedded field: {key}")
    return gzip.decompress(base64.b64decode(match.group(1)))


def extension_for_mime(mime_type: str) -> str:
    if mime_type == "image/png":
        return ".png"
    if mime_type == "image/jpeg":
        return ".jpg"
    raise RuntimeError(f"Unsupported source image MIME type: {mime_type}")


def font(size: int) -> ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size=size)
    return ImageFont.load_default()


def wrapped_text(draw: ImageDraw.ImageDraw, text: str, max_width: int, text_font: ImageFont.ImageFont) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        trial = word if not current else f"{current} {word}"
        if draw.textlength(trial, font=text_font) <= max_width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def material_image_usage(manifest: dict[str, Any]) -> dict[int, list[dict[str, Any]]]:
    usage: dict[int, list[dict[str, Any]]] = {image["id"]: [] for image in manifest["images"]}
    textures = manifest["textures"]
    for material in manifest["materials"]:
        slots = [
            ("baseColorTexture", material.get("baseColorTexture")),
            ("metallicRoughnessTexture", material.get("metallicRoughnessTexture")),
            ("occlusionTexture", material.get("occlusionTexture")),
        ]
        for slot_name, texture_id in slots:
            if texture_id is None:
                continue
            image_id = textures[texture_id]["image"]
            usage[image_id].append(
                {
                    "materialId": material["id"],
                    "materialName": material["name"],
                    "surfaceFamily": material.get("surfaceFamily"),
                    "slot": slot_name,
                }
            )
    return usage


def extract_images(
    manifest: dict[str, Any],
    payload: bytes,
    image_dir: Path,
) -> list[dict[str, Any]]:
    image_dir.mkdir(parents=True, exist_ok=True)
    usage = material_image_usage(manifest)
    records: list[dict[str, Any]] = []
    for image in manifest["images"]:
        block = manifest["blocks"][image["block"]]
        if block["kind"] != "source-image":
            raise RuntimeError(f"Image {image['id']} points to a non-image block")
        start = int(block["offset"])
        end = start + int(block["byteLength"])
        data = payload[start:end]
        digest = sha256_bytes(data)
        if len(data) != block["byteLength"]:
            raise RuntimeError(f"Image {image['id']} byte count mismatch")
        if digest != block["sha256"]:
            raise RuntimeError(f"Image {image['id']} SHA256 mismatch")
        extension = extension_for_mime(image["mimeType"])
        filename = f"image_{image['id']:02d}{extension}"
        destination = image_dir / filename
        destination.write_bytes(data)
        with Image.open(destination) as decoded:
            dimensions = [decoded.width, decoded.height]
        if dimensions != image["dimensions"]:
            raise RuntimeError(f"Image {image['id']} dimensions mismatch: {dimensions}")
        records.append(
            {
                "imageId": image["id"],
                "file": filename,
                "mimeType": image["mimeType"],
                "dimensions": dimensions,
                "bytes": len(data),
                "sha256": digest,
                "sourceBlock": image["block"],
                "materialUsage": usage[image["id"]],
            }
        )
    return records


def make_contact_sheet(records: list[dict[str, Any]], image_dir: Path, output: Path) -> None:
    columns = 4
    cell_width = 520
    cell_height = 570
    margin = 20
    header_height = 90
    rows = math.ceil(len(records) / columns)
    canvas = Image.new(
        "RGB",
        (columns * cell_width + margin * 2, header_height + rows * cell_height + margin),
        "white",
    )
    draw = ImageDraw.Draw(canvas)
    title_font = font(32)
    label_font = font(18)
    small_font = font(14)
    draw.text((margin, 16), "B24 locked source texture atlas", font=title_font, fill="black")
    draw.text(
        (margin, 56),
        "All 18 source images extracted from the byte-locked V010 embedded payload.",
        font=small_font,
        fill="black",
    )
    for index, record in enumerate(records):
        row = index // columns
        column = index % columns
        x = margin + column * cell_width
        y = header_height + row * cell_height
        draw.rectangle((x, y, x + cell_width - 12, y + cell_height - 12), outline="black", width=2)
        with Image.open(image_dir / record["file"]) as source_image:
            thumbnail = source_image.convert("RGB")
        thumbnail.thumbnail((cell_width - 36, cell_height - 130), Image.Resampling.LANCZOS)
        paste_x = x + (cell_width - 12 - thumbnail.width) // 2
        paste_y = y + 56
        canvas.paste(thumbnail, (paste_x, paste_y))
        draw.text(
            (x + 12, y + 10),
            f"Image {record['imageId']:02d}  {record['dimensions'][0]} x {record['dimensions'][1]}",
            font=label_font,
            fill="black",
        )
        material_labels = [
            f"{entry['materialName']}:{entry['slot']}" for entry in record["materialUsage"]
        ]
        material_text = ", ".join(material_labels) if material_labels else "unused by material slots"
        lines = wrapped_text(draw, material_text, cell_width - 36, small_font)[:2]
        for line_index, line in enumerate(lines):
            draw.text(
                (x + 12, y + cell_height - 54 + line_index * 17),
                line,
                font=small_font,
                fill="black",
            )
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output, optimize=True)


def make_evidence_board(
    evidence: dict[str, Any],
    image_dir: Path,
    output: Path,
    crop_dir: Path,
) -> list[dict[str, Any]]:
    regions: list[dict[str, Any]] = []
    for entry in evidence["visualEvidence"]:
        image_path = image_dir / entry["sourceImage"]
        with Image.open(image_path) as source_image:
            source_rgb = source_image.convert("RGB")
        for region_index, region in enumerate(entry["regions"]):
            box = tuple(int(value) for value in region["box"])
            if not (0 <= box[0] < box[2] <= source_rgb.width and 0 <= box[1] < box[3] <= source_rgb.height):
                raise RuntimeError(f"Evidence crop outside image bounds: {entry['id']} {box}")
            crop = source_rgb.crop(box)
            crop_dir.mkdir(parents=True, exist_ok=True)
            crop_file = f"{entry['imageId']:02d}_{region_index:02d}_{entry['id']}.png"
            crop_path = crop_dir / crop_file
            crop.save(crop_path, optimize=True)
            regions.append(
                {
                    "evidenceId": entry["id"],
                    "imageId": entry["imageId"],
                    "sourceImage": entry["sourceImage"],
                    "label": region["label"],
                    "box": list(box),
                    "file": crop_file,
                    "observedFeatures": entry["observedFeatures"],
                    "visualEvidenceStrength": entry["visualEvidenceStrength"],
                    "engineeringAuthority": entry["engineeringAuthority"],
                }
            )

    columns = 2
    cell_width = 980
    image_height = 430
    caption_height = 150
    cell_height = image_height + caption_height
    margin = 28
    header_height = 130
    rows = math.ceil(len(regions) / columns)
    canvas = Image.new(
        "RGB",
        (columns * cell_width + margin * (columns + 1), header_height + rows * cell_height + margin),
        "white",
    )
    draw = ImageDraw.Draw(canvas)
    title_font = font(34)
    label_font = font(22)
    small_font = font(16)
    draw.text((margin, 18), "B24 source texture rivet and panel evidence", font=title_font, fill="black")
    draw.text(
        (margin, 66),
        "Visible texture evidence only. Engineering rivet spacing and aircraft-specific weathering remain unapproved.",
        font=small_font,
        fill="black",
    )
    draw.text(
        (margin, 92),
        "The current V010 no-UV preview does not display these source texture details.",
        font=small_font,
        fill="black",
    )

    for index, region in enumerate(regions):
        row = index // columns
        column = index % columns
        x = margin + column * (cell_width + margin)
        y = header_height + row * cell_height
        draw.rectangle((x, y, x + cell_width, y + cell_height - margin), outline="black", width=2)
        with Image.open(crop_dir / region["file"]) as crop_source:
            crop = crop_source.convert("RGB")
        crop.thumbnail((cell_width - 28, image_height - 24), Image.Resampling.LANCZOS)
        paste_x = x + (cell_width - crop.width) // 2
        paste_y = y + 12
        canvas.paste(crop, (paste_x, paste_y))
        caption_y = y + image_height
        draw.text(
            (x + 14, caption_y + 8),
            f"Image {region['imageId']:02d}: {region['label']}",
            font=label_font,
            fill="black",
        )
        feature_text = ", ".join(region["observedFeatures"])
        feature_lines = wrapped_text(draw, feature_text, cell_width - 28, small_font)[:3]
        for line_index, line in enumerate(feature_lines):
            draw.text(
                (x + 14, caption_y + 44 + line_index * 20),
                line,
                font=small_font,
                fill="black",
            )
        draw.text(
            (x + 14, caption_y + 112),
            f"Evidence strength: {region['visualEvidenceStrength']} | engineering authority: false",
            font=small_font,
            fill="black",
        )
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output, optimize=True)
    return regions


def main(args: argparse.Namespace) -> int:
    html_path = args.html.resolve()
    evidence_path = args.evidence.resolve()
    output = args.output.resolve()
    if output.exists():
        shutil.rmtree(output)
    image_dir = output / "source-images"
    crop_dir = output / "evidence-crops"
    output.mkdir(parents=True, exist_ok=True)

    html_bytes = html_path.read_bytes()
    html_sha256 = sha256_bytes(html_bytes)
    if len(html_bytes) != EXPECTED_HTML_BYTES:
        raise RuntimeError(f"Frozen V010 HTML byte mismatch: {len(html_bytes)}")
    if html_sha256 != EXPECTED_HTML_SHA256:
        raise RuntimeError(f"Frozen V010 HTML hash mismatch: {html_sha256}")
    html = html_bytes.decode("utf-8")

    manifest_bytes = extract_embedded_blob(html, "manifestGzipBase64")
    payload = extract_embedded_blob(html, "payloadGzipBase64")
    manifest_sha256 = sha256_bytes(manifest_bytes)
    payload_sha256 = sha256_bytes(payload)
    if manifest_sha256 != EXPECTED_MANIFEST_SHA256:
        raise RuntimeError(f"Embedded manifest hash mismatch: {manifest_sha256}")
    if len(payload) != EXPECTED_PAYLOAD_BYTES:
        raise RuntimeError(f"Embedded payload byte mismatch: {len(payload)}")
    if payload_sha256 != EXPECTED_PAYLOAD_SHA256:
        raise RuntimeError(f"Embedded payload hash mismatch: {payload_sha256}")

    manifest = json.loads(manifest_bytes)
    if manifest["sourceLock"]["bytes"] != EXPECTED_SOURCE_GLB_BYTES:
        raise RuntimeError("Source GLB byte lock mismatch in embedded manifest")
    if manifest["sourceLock"]["sha256"] != EXPECTED_SOURCE_GLB_SHA256:
        raise RuntimeError("Source GLB SHA256 lock mismatch in embedded manifest")
    if manifest["payload"]["bytes"] != EXPECTED_PAYLOAD_BYTES:
        raise RuntimeError("Payload byte count mismatch in embedded manifest")
    if manifest["payload"]["sha256"] != EXPECTED_PAYLOAD_SHA256:
        raise RuntimeError("Payload SHA256 mismatch in embedded manifest")

    evidence = read_json(evidence_path)
    source_contract = evidence["source"]
    contract_checks = {
        "htmlBytes": source_contract["htmlBytes"] == len(html_bytes),
        "htmlSha256": source_contract["htmlSha256"] == html_sha256,
        "sourceGlbBytes": source_contract["sourceGlbBytes"] == manifest["sourceLock"]["bytes"],
        "sourceGlbSha256": source_contract["sourceGlbSha256"] == manifest["sourceLock"]["sha256"],
        "embeddedManifestSha256": source_contract["embeddedManifestSha256"] == manifest_sha256,
        "embeddedPayloadBytes": source_contract["embeddedPayloadBytes"] == len(payload),
        "embeddedPayloadSha256": source_contract["embeddedPayloadSha256"] == payload_sha256,
    }
    if not all(contract_checks.values()):
        raise RuntimeError(f"Source texture evidence contract mismatch: {contract_checks}")

    records = extract_images(manifest, payload, image_dir)
    if len(records) != 18:
        raise RuntimeError(f"Expected 18 source images, extracted {len(records)}")
    inventory_path = output / "B24_SOURCE_TEXTURE_INVENTORY.json"
    inventory_path.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    manifest_path = output / "B24_EMBEDDED_NATIVE_MANIFEST.json"
    manifest_path.write_bytes(manifest_bytes)

    contact_sheet = output / "B24_SOURCE_TEXTURES_CONTACT_SHEET.png"
    evidence_board = output / "B24_SOURCE_TEXTURE_RIVET_PANEL_EVIDENCE_BOARD.png"
    make_contact_sheet(records, image_dir, contact_sheet)
    crop_records = make_evidence_board(evidence, image_dir, evidence_board, crop_dir)

    texture_counts = {
        "baseColorTexture": sum(material.get("baseColorTexture") is not None for material in manifest["materials"]),
        "metallicRoughnessTexture": sum(material.get("metallicRoughnessTexture") is not None for material in manifest["materials"]),
        "normalTexture": sum(material.get("normalTexture") is not None for material in manifest["materials"]),
        "occlusionTexture": sum(material.get("occlusionTexture") is not None for material in manifest["materials"]),
        "emissiveTexture": sum(material.get("emissiveTexture") is not None for material in manifest["materials"]),
    }
    runtime_markers = {
        "solidExteriorNoUv": "dataset.surface='solid-exterior-no-uv'" in html,
        "noUvCopy": "机身采用无 UV 数字蒙皮" in html,
        "v010BuildPresent": "B24_NATIVE_REVIEW_V010_RIDGED_LOCAL_DAMAGE_EXPERIMENT_2026-08-29" in html,
    }
    report = {
        "schema": "haihao.aircraft/b24-source-texture-extraction-audit@1.0.0",
        "status": "PASS_SOURCE_TEXTURE_EVIDENCE_ONLY",
        "source": {
            "html": html_path.name,
            "htmlBytes": len(html_bytes),
            "htmlSha256": html_sha256,
            "sourceGlbBytes": manifest["sourceLock"]["bytes"],
            "sourceGlbSha256": manifest["sourceLock"]["sha256"],
            "embeddedManifestBytes": len(manifest_bytes),
            "embeddedManifestSha256": manifest_sha256,
            "embeddedPayloadBytes": len(payload),
            "embeddedPayloadSha256": payload_sha256,
        },
        "contractChecks": contract_checks,
        "inventory": {
            "sourceImageCount": len(records),
            "materialCount": len(manifest["materials"]),
            "textureCount": len(manifest["textures"]),
            "textureSlotCounts": texture_counts,
            "allSourceImageBlocksVerified": True,
        },
        "confirmedSourceFacts": evidence["confirmedSourceFacts"],
        "runtimeFinding": {
            **evidence["runtimeFinding"],
            "runtimeMarkers": runtime_markers,
        },
        "visualEvidence": crop_records,
        "files": {
            "inventory": {
                "path": inventory_path.name,
                "bytes": inventory_path.stat().st_size,
                "sha256": sha256_file(inventory_path),
            },
            "contactSheet": {
                "path": contact_sheet.name,
                "bytes": contact_sheet.stat().st_size,
                "sha256": sha256_file(contact_sheet),
            },
            "evidenceBoard": {
                "path": evidence_board.name,
                "bytes": evidence_board.stat().st_size,
                "sha256": sha256_file(evidence_board),
            },
        },
        "protectedSystems": {
            "sourceHtmlChanged": False,
            "sourcePayloadChanged": False,
            "sourceGlbChanged": False,
            "geometryChanged": False,
            "animationChanged": False,
            "liveryIdentityChanged": False,
            "runwayFlightSequenceChanged": False,
        },
        "approvalBoundary": evidence["approvalBoundary"],
    }
    report_path = output / "B24_SOURCE_TEXTURE_EXTRACTION_AUDIT.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(
        json.dumps(
            {
                "status": report["status"],
                "sourceImages": len(records),
                "visualEvidenceCrops": len(crop_records),
                "normalTextureCount": texture_counts["normalTexture"],
                "panelSeamInformationPresent": evidence["confirmedSourceFacts"]["bakedPanelSeamInformationPresent"],
                "rivetLikeInformationPresent": evidence["confirmedSourceFacts"]["bakedRivetLikeInformationPresent"],
                "output": str(output),
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--html", type=Path, required=True)
    parser.add_argument("--evidence", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    return parser.parse_args()


if __name__ == "__main__":
    raise SystemExit(main(parse_args()))
