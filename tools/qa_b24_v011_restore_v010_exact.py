#!/usr/bin/env python3
"""Independent recovery QA for the frozen B24 V010 review HTML.

The script reads the exact repository HTML, exercises the aircraft and local
Ridged tool through its public capture API, and writes evidence outside the
frozen V010 source directory. It grants no visual or production approval.
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from PIL import Image
from playwright.async_api import Page, async_playwright

EXPECTED_HTML_BYTES = 12_550_988
EXPECTED_HTML_SHA256 = "1b5b860ca78a7d55ea25d0d972a1d323125a57982d09452e7f7e0cb55d64a949"
EXPECTED_BUILD = "B24_NATIVE_REVIEW_V010_RIDGED_LOCAL_DAMAGE_EXPERIMENT_2026-08-29"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def image_difference(left: Path, right: Path) -> dict[str, float | int]:
    a = Image.open(left).convert("RGB")
    b = Image.open(right).convert("RGB")
    if a.size != b.size:
        raise RuntimeError(f"Image size mismatch: {a.size} != {b.size}")
    total_pixels = a.width * a.height
    changed = 0
    absolute_sum = 0
    maximum = 0
    for pa, pb in zip(a.getdata(), b.getdata(), strict=True):
        delta = abs(pa[0] - pb[0]) + abs(pa[1] - pb[1]) + abs(pa[2] - pb[2])
        if delta:
            changed += 1
        absolute_sum += delta
        maximum = max(maximum, delta)
    return {
        "width": a.width,
        "height": a.height,
        "changedPixels": changed,
        "changedRatio": changed / max(total_pixels, 1),
        "meanAbsoluteChannelDelta": absolute_sum / max(total_pixels * 3, 1),
        "maxSummedChannelDelta": maximum,
    }


async def capture_canvas(page: Page, path: Path) -> None:
    box = await page.locator("#canvas").bounding_box()
    if not box:
        raise RuntimeError("B24 canvas has no bounding box")
    await page.screenshot(path=str(path), clip=box, animations="disabled")


def wrapped_angle_delta(a: float, b: float) -> float:
    return abs((b - a + math.pi) % (2 * math.pi) - math.pi)


async def run(args: argparse.Namespace) -> int:
    root = args.root.resolve()
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    html_path = root / "B24_V010_RIDGED_LOCAL_DAMAGE_REVIEW.html"

    checks: list[dict[str, Any]] = []

    def check(identifier: str, passed: bool, detail: Any) -> None:
        checks.append({"id": identifier, "pass": bool(passed), "detail": detail})

    check("html-exists", html_path.is_file(), str(html_path))
    if not html_path.is_file():
        raise FileNotFoundError(html_path)
    check("html-byte-lock", html_path.stat().st_size == EXPECTED_HTML_BYTES, html_path.stat().st_size)
    html_sha256 = sha256_file(html_path)
    check("html-sha256-lock", html_sha256 == EXPECTED_HTML_SHA256, html_sha256)

    screenshots = {
        "fullServicePage": output / "B24_V010_RECOVERY_FULL_SERVICE_PAGE.png",
        "off": output / "B24_V010_RECOVERY_FULL_OFF.png",
        "service": output / "B24_V010_RECOVERY_FULL_SERVICE.png",
        "diagnostic": output / "B24_V010_RECOVERY_FULL_DIAGNOSTIC.png",
        "propeller": output / "B24_V010_RECOVERY_PROPELLER_LIVE.png",
    }
    console_messages: list[dict[str, str]] = []
    page_errors: list[str] = []

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(
            headless=False,
            args=["--disable-dev-shm-usage", "--use-angle=swiftshader"],
        )
        page = await browser.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
        page.set_default_timeout(120_000)
        page.on("console", lambda message: console_messages.append({"type": message.type, "text": message.text}))
        page.on("pageerror", lambda error: page_errors.append(str(error)))

        response = await page.goto(args.url, wait_until="domcontentloaded")
        check("http-status", response is not None and response.status == 200, response.status if response else None)
        await page.wait_for_function(
            "window.__B24_V010_CAPTURE__ && window.__B24_NATIVE_V010__ && window.__B24_V010_QA_STATE__?.ready === true"
        )
        check("capture-api-ready", True, "ready")

        await page.evaluate("window.__B24_V010_CAPTURE__.stopMotion()")
        runtime = await page.evaluate(
            """() => {
                const v = window.__B24_NATIVE_V010__;
                const q = window.__B24_V010_CAPTURE__.state();
                return {
                    build: q.build,
                    ready: q.ready,
                    sourcePayloadChanged: q.sourcePayloadChanged,
                    geometryChanged: q.geometryChanged,
                    animationChanged: q.animationChanged,
                    approvals: q.approvals,
                    limitations: q.limitations,
                    coverage: window.__B24_V010_CAPTURE__.coverage(),
                    itemCount: v.items?.length ?? 0,
                    nodeCount: v.nodes?.length ?? 0,
                    propellerRootCount: v.__v009PropRoots?.length ?? 0,
                    webglError: v.gl?.getError?.() ?? -1,
                };
            }"""
        )
        check("build-lock", runtime["build"] == EXPECTED_BUILD, runtime["build"])
        check("qa-ready", runtime["ready"] is True, runtime["ready"])
        check("source-payload-unchanged", runtime["sourcePayloadChanged"] is False, runtime["sourcePayloadChanged"])
        check("geometry-unchanged", runtime["geometryChanged"] is False, runtime["geometryChanged"])
        check("animation-unchanged", runtime["animationChanged"] is False, runtime["animationChanged"])
        check("webgl-no-error", runtime["webglError"] == 0, runtime["webglError"])
        check("aircraft-items-present", runtime["itemCount"] >= 300, runtime["itemCount"])
        check("propeller-roots-present", runtime["propellerRootCount"] >= 4, runtime["propellerRootCount"])
        approvals_closed = all(value is False for value in runtime["approvals"].values())
        check("all-approvals-closed", approvals_closed, runtime["approvals"])
        coverage = runtime["coverage"]
        check("protected-items-present", coverage["counts"]["protected"] > 0, coverage["counts"])
        check("protected-triangles-present", coverage["triangles"]["protected"] > 0, coverage["triangles"])

        await page.evaluate(
            """() => {
                window.__B24_V010_CAPTURE__.stopMotion();
                window.__B24_V010_CAPTURE__.setView('full');
                window.__B24_V010_CAPTURE__.setPreset('off');
            }"""
        )
        await page.wait_for_timeout(500)
        await capture_canvas(page, screenshots["off"])

        await page.evaluate("window.__B24_V010_CAPTURE__.setPreset('service')")
        await page.wait_for_timeout(500)
        await capture_canvas(page, screenshots["service"])
        await page.screenshot(path=str(screenshots["fullServicePage"]), full_page=True, animations="disabled")
        service_state = await page.evaluate("window.__B24_V010_CAPTURE__.state()")

        await page.evaluate("window.__B24_V010_CAPTURE__.setPreset('diagnostic')")
        await page.wait_for_timeout(500)
        await capture_canvas(page, screenshots["diagnostic"])
        diagnostic_state = await page.evaluate("window.__B24_V010_CAPTURE__.state()")

        off_service = image_difference(screenshots["off"], screenshots["service"])
        service_diagnostic = image_difference(screenshots["service"], screenshots["diagnostic"])
        check(
            "service-layer-visible",
            off_service["changedRatio"] > 0.002 and off_service["meanAbsoluteChannelDelta"] > 0.02,
            off_service,
        )
        check(
            "diagnostic-amplifies-layer",
            service_diagnostic["changedRatio"] > 0.002 and service_diagnostic["meanAbsoluteChannelDelta"] > 0.02,
            service_diagnostic,
        )
        check(
            "service-preset-state",
            service_state["surface"]["preset"] == "service",
            service_state["surface"],
        )
        check(
            "diagnostic-preset-state",
            diagnostic_state["surface"]["preset"] == "diagnostic",
            diagnostic_state["surface"],
        )

        propeller_before = await page.evaluate(
            """() => {
                window.__B24_V010_CAPTURE__.setPreset('service');
                window.__B24_V010_CAPTURE__.setView('propeller');
                const v = window.__B24_NATIVE_V010__;
                const duration = v.m.animations?.[0]?.duration || 16.666;
                v.animTime = duration * 0.08;
                v.applyAnimation(v.animTime);
                v.playing = true;
                v.setFlightState?.('startup', true);
                return {
                    angle: v.__v009PropAngle || 0,
                    rpm: v.engineRpm || 0,
                    updateCount: v.__v009PropUpdateCount || 0,
                    state: v.flightState,
                    animTime: v.animTime,
                    duration,
                    axis: window.__B24_V010_QA_STATE__?.regressions?.propellerAxis || '',
                    rootCount: v.__v009PropRoots?.length || 0,
                };
            }"""
        )
        await page.wait_for_timeout(3_500)
        propeller_after = await page.evaluate(
            """() => {
                const v = window.__B24_NATIVE_V010__;
                return {
                    angle: v.__v009PropAngle || 0,
                    rpm: v.engineRpm || 0,
                    updateCount: v.__v009PropUpdateCount || 0,
                    state: v.flightState,
                    animTime: v.animTime,
                    axis: window.__B24_V010_QA_STATE__?.regressions?.propellerAxis || '',
                    rootCount: v.__v009PropRoots?.length || 0,
                };
            }"""
        )
        await capture_canvas(page, screenshots["propeller"])
        angle_delta = wrapped_angle_delta(float(propeller_before["angle"]), float(propeller_after["angle"]))
        propeller_live = (
            angle_delta > 1e-4
            and float(propeller_after["rpm"]) > 0.02
            and int(propeller_after["updateCount"]) > int(propeller_before["updateCount"])
        )
        local_y = "local-y" in str(propeller_after["axis"])
        check(
            "propeller-live-motion",
            propeller_live,
            {"before": propeller_before, "after": propeller_after, "wrappedAngleDelta": angle_delta},
        )
        check("propeller-local-y", local_y, propeller_after["axis"])
        await page.evaluate("window.__B24_V010_CAPTURE__.stopMotion()")
        await browser.close()

    serious_console_errors = [
        message
        for message in console_messages
        if message["type"] == "error" and "404 (File not found)" not in message["text"]
    ]
    check("zero-page-errors", not page_errors, page_errors)
    check("zero-serious-console-errors", not serious_console_errors, serious_console_errors)

    failed = [item for item in checks if not item["pass"]]
    report = {
        "schema": "haihao.aircraft/b24-v011-restore-v010-exact-qa@1.0.0",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "status": "PASS_RECOVERY_PREVIEW_ONLY" if not failed else "FAIL",
        "source": {
            "html": html_path.name,
            "bytes": html_path.stat().st_size,
            "sha256": html_sha256,
            "integrationCommit": "6587e02d9b91d2e5ed82ceb6c84ca14573488ff8",
        },
        "runtime": runtime,
        "surfaceLayer": {
            "offToService": off_service,
            "serviceToDiagnostic": service_diagnostic,
            "serviceState": service_state.get("surface", {}),
            "diagnosticState": diagnostic_state.get("surface", {}),
        },
        "propeller": {
            "before": propeller_before,
            "after": propeller_after,
            "wrappedAngleDelta": angle_delta,
        },
        "browser": {
            "url": args.url,
            "pageErrors": page_errors,
            "consoleMessages": console_messages,
            "seriousConsoleErrors": serious_console_errors,
        },
        "screenshots": {
            name: {
                "path": path.name,
                "bytes": path.stat().st_size,
                "sha256": sha256_file(path),
            }
            for name, path in screenshots.items()
        },
        "checks": checks,
        "totals": {"checks": len(checks), "passed": len(checks) - len(failed), "failed": len(failed)},
        "approvalBoundary": {
            "visualApproved": False,
            "surfaceSystemApproved": False,
            "historicalApproved": False,
            "engineeringApproved": False,
            "wholeAircraftApproved": False,
            "productionFrozen": False,
        },
    }
    (output / "B24_V011_RESTORE_V010_EXACT_QA.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if failed else 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument(
        "--url",
        default="http://127.0.0.1:8766/B24_V010_RIDGED_LOCAL_DAMAGE_REVIEW.html",
    )
    return parser.parse_args()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(run(parse_args())))
