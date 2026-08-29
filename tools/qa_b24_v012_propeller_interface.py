#!/usr/bin/env python3
"""Real-browser QA for the B24 V012 propeller interface recovery.

The generated V012 page reuses the byte-locked V010 aircraft and injects only
B24_V012_PROPELLER_INTERFACE_PATCH.js. Evidence is written outside the frozen
V010 source directory. No visual or production approval is granted.
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

from playwright.async_api import Page, async_playwright

EXPECTED_SOURCE_BYTES = 12_550_988
EXPECTED_SOURCE_SHA256 = "1b5b860ca78a7d55ea25d0d972a1d323125a57982d09452e7f7e0cb55d64a949"
EXPECTED_BUILD = "B24_V012_PROPELLER_INTERFACE_SKIN_AUDIT_2026-08-29"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def wrapped_angle_delta(before: float, after: float) -> float:
    return abs((after - before + math.pi) % (2 * math.pi) - math.pi)


async def capture_canvas(page: Page, path: Path) -> None:
    box = await page.locator("#canvas").bounding_box()
    if not box:
        raise RuntimeError("B24 canvas has no bounding box")
    await page.screenshot(path=str(path), clip=box, animations="disabled")


async def run(args: argparse.Namespace) -> int:
    source_html = args.source_html.resolve()
    generated_html = args.generated_html.resolve()
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)

    checks: list[dict[str, Any]] = []

    def check(identifier: str, passed: bool, detail: Any) -> None:
        checks.append({"id": identifier, "pass": bool(passed), "detail": detail})

    check("source-html-exists", source_html.is_file(), str(source_html))
    check("generated-html-exists", generated_html.is_file(), str(generated_html))
    if not source_html.is_file() or not generated_html.is_file():
        raise FileNotFoundError(source_html if not source_html.is_file() else generated_html)

    source_bytes = source_html.stat().st_size
    source_sha256 = sha256_file(source_html)
    check("source-html-byte-lock", source_bytes == EXPECTED_SOURCE_BYTES, source_bytes)
    check("source-html-sha256-lock", source_sha256 == EXPECTED_SOURCE_SHA256, source_sha256)
    generated_text = generated_html.read_text(encoding="utf-8")
    check("generated-html-has-v012-patch", EXPECTED_BUILD in generated_text, EXPECTED_BUILD)
    check("generated-html-retains-v010-build", "B24_NATIVE_REVIEW_V010_RIDGED_LOCAL_DAMAGE_EXPERIMENT_2026-08-29" in generated_text, True)

    screenshots = {
        "fullOff": output / "B24_V012_FULL_AIRCRAFT_NOISE_OFF.png",
        "fullService": output / "B24_V012_FULL_AIRCRAFT_SERVICE.png",
        "fullPage": output / "B24_V012_FULL_PAGE.png",
        "prop0": output / "B24_V012_PROP0_HUB_CONNECTOR.png",
        "prop1": output / "B24_V012_PROP1_HUB_CONNECTOR.png",
        "prop2": output / "B24_V012_PROP2_HUB_CONNECTOR.png",
        "prop3": output / "B24_V012_PROP3_HUB_CONNECTOR.png",
        "propellerLive": output / "B24_V012_PROPELLER_LIVE.png",
    }

    console_messages: list[dict[str, str]] = []
    page_errors: list[str] = []

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(
            headless=False,
            args=[
                "--disable-dev-shm-usage",
                "--use-angle=swiftshader",
                "--enable-unsafe-swiftshader",
            ],
        )
        page = await browser.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
        page.set_default_timeout(120_000)
        page.on("console", lambda message: console_messages.append({"type": message.type, "text": message.text}))
        page.on("pageerror", lambda error: page_errors.append(str(error)))

        response = await page.goto(args.url, wait_until="domcontentloaded")
        check("http-status", response is not None and response.status == 200, response.status if response else None)
        await page.wait_for_function(
            "window.__B24_V012_CAPTURE__ && window.__B24_V012_QA_STATE__?.ready === true"
        )
        check("v012-capture-api-ready", True, "ready")

        state = await page.evaluate("window.__B24_V012_CAPTURE__.state()")
        connectors = await page.evaluate("window.__B24_V012_CAPTURE__.connectors()")
        v010_state = await page.evaluate("window.__B24_V010_CAPTURE__.state()")
        runtime = await page.evaluate(
            """() => {
                const v = window.__B24_NATIVE_V010__;
                return {
                    itemCount: v.items?.length ?? 0,
                    nodeCount: v.nodes?.length ?? 0,
                    propellerRootCount: v.__v009PropRoots?.length ?? 0,
                    webglError: v.gl?.getError?.() ?? -1,
                    radius: v.radius,
                };
            }"""
        )

        check("v012-build-lock", state["build"] == EXPECTED_BUILD, state["build"])
        check("source-payload-unchanged", state["sourcePayloadChanged"] is False, state["sourcePayloadChanged"])
        check("geometry-unchanged", state["geometryChanged"] is False, state["geometryChanged"])
        check("animation-unchanged", state["animationChanged"] is False, state["animationChanged"])
        check("livery-identity-unchanged", state["liveryIdentityChanged"] is False, state["liveryIdentityChanged"])
        check("runway-flight-sequence-unchanged", state["runwayFlightSequenceChanged"] is False, state["runwayFlightSequenceChanged"])
        check("aircraft-primary", state["aircraftPrimary"] is True, state["aircraftPrimary"])
        check("noise-tool-local-overlay", state["noiseToolLocalOverlay"] is True, state["noiseToolLocalOverlay"])
        check("aircraft-items-present", runtime["itemCount"] >= 300, runtime["itemCount"])
        check("aircraft-nodes-present", runtime["nodeCount"] >= 1700, runtime["nodeCount"])
        check("propeller-roots-preserved", runtime["propellerRootCount"] >= 15, runtime["propellerRootCount"])
        check("webgl-no-error", runtime["webglError"] == 0, runtime["webglError"])

        check("four-hub-connectors", len(connectors) == 4, len(connectors))
        connector_details = []
        for index, connector in enumerate(connectors):
            material = connector.get("material", {})
            detail = {
                "index": index,
                "semanticPath": connector.get("semanticPath"),
                "triangleCount": connector.get("triangleCount"),
                "alpha": material.get("alpha"),
                "role": material.get("v012Role"),
                "protectedFromRidged": material.get("protectedFromRidged"),
                "damageZone": material.get("damageZone"),
            }
            connector_details.append(detail)
            check(f"connector-{index}-triangles", connector.get("triangleCount") == 1128, detail)
            check(f"connector-{index}-visible", float(material.get("alpha", 0)) == 1.0, detail)
            check(f"connector-{index}-role", material.get("v012Role") == "propeller-hub-connector", detail)
            check(f"connector-{index}-protected", material.get("protectedFromRidged") is True and material.get("damageZone") == 0, detail)

        approvals = state.get("approvals", {})
        check("all-v012-approvals-closed", approvals and all(value is False for value in approvals.values()), approvals)
        v010_approvals = v010_state.get("approvals", {})
        check("all-v010-approvals-closed", v010_approvals and all(value is False for value in v010_approvals.values()), v010_approvals)

        await page.evaluate(
            """() => {
                window.__B24_V012_CAPTURE__.stopMotion();
                window.__B24_V012_CAPTURE__.setView('full');
                window.__B24_V012_CAPTURE__.setPreset('off');
            }"""
        )
        await page.wait_for_timeout(500)
        await capture_canvas(page, screenshots["fullOff"])

        await page.evaluate("window.__B24_V012_CAPTURE__.setPreset('service')")
        await page.wait_for_timeout(500)
        await capture_canvas(page, screenshots["fullService"])
        await page.screenshot(path=str(screenshots["fullPage"]), full_page=True, animations="disabled")

        for index in range(4):
            view_name = f"prop{index}"
            accepted = await page.evaluate(
                "(name) => window.__B24_V012_CAPTURE__.setView(name)", view_name
            )
            check(f"{view_name}-view-accepted", accepted is True, accepted)
            await page.wait_for_timeout(500)
            await capture_canvas(page, screenshots[view_name])

        propeller_before = await page.evaluate(
            """() => {
                window.__B24_V012_CAPTURE__.setView('prop0');
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
                    axis: window.__B24_V010_QA_STATE__?.regressions?.propellerAxis || '',
                    rootCount: v.__v009PropRoots?.length || 0,
                };
            }"""
        )
        await capture_canvas(page, screenshots["propellerLive"])
        angle_delta = wrapped_angle_delta(float(propeller_before["angle"]), float(propeller_after["angle"]))
        motion_pass = (
            angle_delta > 1e-4
            and float(propeller_after["rpm"]) > 0.02
            and int(propeller_after["updateCount"]) > int(propeller_before["updateCount"])
        )
        check(
            "propeller-motion-preserved",
            motion_pass,
            {"before": propeller_before, "after": propeller_after, "wrappedAngleDelta": angle_delta},
        )
        check("propeller-local-y-preserved", "local-y" in str(propeller_after["axis"]), propeller_after["axis"])
        await page.evaluate("window.__B24_V012_CAPTURE__.stopMotion()")
        await browser.close()

    serious_console_errors = [
        message
        for message in console_messages
        if message["type"] == "error" and "404 (File not found)" not in message["text"]
    ]
    check("zero-page-errors", not page_errors, page_errors)
    check("zero-serious-console-errors", not serious_console_errors, serious_console_errors)

    failed = [entry for entry in checks if not entry["pass"]]
    report = {
        "schema": "haihao.aircraft/b24-v012-propeller-interface-browser-qa@1.0.0",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "status": "PASS_PREVIEW_ONLY" if not failed else "FAIL",
        "source": {
            "html": source_html.name,
            "bytes": source_bytes,
            "sha256": source_sha256,
            "integrationCommit": "6587e02d9b91d2e5ed82ceb6c84ca14573488ff8",
        },
        "generatedPreview": {
            "html": generated_html.name,
            "bytes": generated_html.stat().st_size,
            "sha256": sha256_file(generated_html),
            "patchBuild": EXPECTED_BUILD,
        },
        "runtime": runtime,
        "v012State": state,
        "connectorDetails": connector_details,
        "propellerMotion": {
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
        "totals": {
            "checks": len(checks),
            "passed": len(checks) - len(failed),
            "failed": len(failed),
        },
        "approvalBoundary": {
            "visualApproved": False,
            "surfaceSystemApproved": False,
            "historicalApproved": False,
            "engineeringApproved": False,
            "wholeAircraftApproved": False,
            "productionFrozen": False,
        },
    }
    (output / "B24_V012_PROPELLER_INTERFACE_BROWSER_QA.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if failed else 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-html", type=Path, required=True)
    parser.add_argument("--generated-html", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument(
        "--url",
        default="http://127.0.0.1:8772/B24_V012_PROPELLER_INTERFACE_REVIEW.html",
    )
    return parser.parse_args()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(run(parse_args())))
