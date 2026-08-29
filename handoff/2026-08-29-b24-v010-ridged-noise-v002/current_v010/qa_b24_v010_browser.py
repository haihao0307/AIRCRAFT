from __future__ import annotations

import asyncio
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from PIL import Image, ImageChops, ImageStat
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent
URL = "http://127.0.0.1:8766/B24_V010_RIDGED_LOCAL_DAMAGE_REVIEW.html"
HTML_PATH = ROOT / "B24_V010_RIDGED_LOCAL_DAMAGE_REVIEW.html"
EXPECTED_SOURCE = {
    "bytes": 16647376,
    "sha256": "7ba1b923844f5161911e9aa63b18191e0d08ff8de4b3750204aa544320bd34c2",
}
EXPECTED_GEOMETRY = {
    "components": 1784,
    "meshes": 348,
    "vertices": 307273,
    "triangles": 325358,
    "animationTracks": 2518,
}


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def pixel_diff(a_path: Path, b_path: Path) -> dict[str, Any]:
    a = Image.open(a_path).convert("RGB")
    b = Image.open(b_path).convert("RGB")
    if a.size != b.size:
        raise ValueError(f"Image size mismatch: {a.size} vs {b.size}")
    diff = ImageChops.difference(a, b)
    stat = ImageStat.Stat(diff)
    mean_rgb = [round(v, 6) for v in stat.mean]
    extrema = diff.getextrema()
    px = list(diff.getdata())
    changed_2 = sum(1 for r, g, bl in px if max(r, g, bl) > 2)
    changed_8 = sum(1 for r, g, bl in px if max(r, g, bl) > 8)
    total = len(px)
    bbox = diff.getbbox()
    return {
        "a": a_path.name,
        "b": b_path.name,
        "size": list(a.size),
        "meanAbsoluteRgb": mean_rgb,
        "meanAbsoluteOverall": round(sum(mean_rgb) / 3, 6),
        "changedPixelRatioThreshold2": round(changed_2 / total, 8),
        "changedPixelRatioThreshold8": round(changed_8 / total, 8),
        "differenceBoundingBox": list(bbox) if bbox else None,
        "channelExtrema": [[int(lo), int(hi)] for lo, hi in extrema],
    }


async def main() -> None:
    console: list[dict[str, str]] = []
    page_errors: list[str] = []
    screenshots: dict[str, Path] = {
        "fullService": ROOT / "B24_V010_FULL_AIRCRAFT_SERVICE.png",
        "nacelleOff": ROOT / "B24_V010_NACELLE_RIDGED_OFF.png",
        "nacelleService": ROOT / "B24_V010_NACELLE_RIDGED_SERVICE.png",
        "nacelleDiagnostic": ROOT / "B24_V010_NACELLE_RIDGED_DIAGNOSTIC.png",
        "bombDoorService": ROOT / "B24_V010_BOMB_DOOR_SERVICE.png",
        "gearProtected": ROOT / "B24_V010_GEAR_PROTECTED_DIAGNOSTIC.png",
        "propellerRegression": ROOT / "B24_V010_PROPELLER_LOCAL_Y_REGRESSION.png",
    }

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            executable_path="/usr/bin/chromium",
            args=[
                "--no-sandbox",
                "--disable-gpu-sandbox",
                "--enable-webgl",
                "--ignore-gpu-blocklist",
                "--enable-unsafe-swiftshader",
                "--use-angle=swiftshader",
                "--no-proxy-server",
                "--proxy-bypass-list=*",
            ],
        )
        page = await browser.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
        page.on("console", lambda msg: console.append({"type": msg.type, "text": msg.text}))
        page.on("pageerror", lambda error: page_errors.append(str(error)))

        response = await page.goto(URL, wait_until="domcontentloaded", timeout=120000)
        await page.wait_for_function("window.__B24_V010_QA_STATE__?.ready === true", timeout=120000)
        await page.wait_for_timeout(1000)

        initial_state = await page.evaluate("window.__B24_V010_QA_STATE__")
        source_ok = initial_state.get("sourceLock") == EXPECTED_SOURCE
        geometry_ok = initial_state.get("geometry") == EXPECTED_GEOMETRY
        approvals_false = all(value is False for value in initial_state.get("approvals", {}).values())

        material_checks = await page.evaluate(
            """() => {
              const v=window.__B24_NATIVE_V010__;
              const pathOf=item=>String(item?.node?.semanticPathLower||item?.node?.def?.semanticPath||'').toLowerCase();
              const protectedFamilies=new Set(['glass','propeller','tire','landing-mechanism','propulsion-mechanism','interior-detail','legacy-weapon','legacy-surface-overlay']);
              const gearPath=p=>p.includes('_gear_')||p.includes('/gear')||p.includes('_wheel_')||p.includes('/wheel')||p.includes('landing_gear')||p.includes('tire');
              const rows=v.items.map(item=>{const p=pathOf(item),m=v.materialFor(item);return{family:item.family,path:p,damageZone:m.damageZone||0,triangles:item.mesh?.triangleCount||0};});
              const protectedRows=rows.filter(x=>protectedFamilies.has(x.family)||gearPath(x.path));
              const cowl=rows.filter(x=>x.path.includes('cowl_flaps'));
              const bomb=rows.filter(x=>x.path.includes('bomb_door'));
              const controls=rows.filter(x=>x.path.includes('rudder')||x.path.includes('elevator')||x.path.includes('aileron'));
              return {
                total:rows.length,
                protectedCount:protectedRows.length,
                protectedAllZero:protectedRows.every(x=>x.damageZone===0),
                protectedMaxZone:Math.max(0,...protectedRows.map(x=>x.damageZone)),
                cowlCount:cowl.length,cowlMinZone:Math.min(...cowl.map(x=>x.damageZone)),
                bombDoorCount:bomb.length,bombDoorMinZone:Math.min(...bomb.map(x=>x.damageZone)),
                controlSurfaceCount:controls.length,controlSurfaceMinZone:Math.min(...controls.map(x=>x.damageZone)),
                genericSkinPositive:rows.filter(x=>x.family==='airframe-skin'&&x.damageZone>0&&x.damageZone<.4).length,
                coverage:window.__B24_V010_CAPTURE__.coverage()
              };
            }"""
        )

        await page.evaluate("window.__B24_V010_CAPTURE__.stopMotion(); window.__B24_V010_CAPTURE__.setPreset('service'); window.__B24_V010_CAPTURE__.setView('full')")
        await page.wait_for_timeout(500)
        await page.screenshot(path=str(screenshots["fullService"]), full_page=True)

        await page.evaluate("window.__B24_V010_CAPTURE__.setView('nacelle'); const v=window.__B24_NATIVE_V010__; v.ridgedEnabled=false;")
        await page.wait_for_timeout(450)
        await page.locator("#canvas").screenshot(path=str(screenshots["nacelleOff"]))

        await page.evaluate("const v=window.__B24_NATIVE_V010__; v.ridgedEnabled=true; v.ridgedStrength=.34; v.ridgedScale=.62; v.ridgedThreshold=.64; v.serviceGate=.48;")
        await page.wait_for_timeout(450)
        await page.locator("#canvas").screenshot(path=str(screenshots["nacelleService"]))

        await page.evaluate("const v=window.__B24_NATIVE_V010__; v.ridgedEnabled=true; v.ridgedStrength=.88; v.ridgedScale=.78; v.ridgedThreshold=.48; v.serviceGate=.86;")
        await page.wait_for_timeout(450)
        await page.locator("#canvas").screenshot(path=str(screenshots["nacelleDiagnostic"]))

        await page.evaluate("window.__B24_V010_CAPTURE__.setPreset('service'); window.__B24_V010_CAPTURE__.setView('bombDoor')")
        await page.wait_for_timeout(450)
        await page.locator("#canvas").screenshot(path=str(screenshots["bombDoorService"]))

        await page.evaluate("window.__B24_V010_CAPTURE__.setView('gear'); const v=window.__B24_NATIVE_V010__; v.ridgedEnabled=true; v.ridgedStrength=.95; v.ridgedScale=.82; v.ridgedThreshold=.42; v.serviceGate=.95;")
        await page.wait_for_timeout(450)
        await page.locator("#canvas").screenshot(path=str(screenshots["gearProtected"]))

        prop_before = await page.evaluate(
            """() => { window.__B24_V010_CAPTURE__.setView('propeller'); const v=window.__B24_NATIVE_V010__; return {angle:v.__v009PropAngle,axis:window.__B24_V009_R1_QA_STATE__?.propeller?.axis||null,rootCount:v.__v009PropRoots?.length||0}; }"""
        )
        await page.wait_for_timeout(1200)
        prop_after = await page.evaluate(
            """() => { const v=window.__B24_NATIVE_V010__; return {angle:v.__v009PropAngle,axis:window.__B24_V009_R1_QA_STATE__?.propeller?.axis||null,rootCount:v.__v009PropRoots?.length||0,rpm:v.engineRpm}; }"""
        )
        await page.locator("#canvas").screenshot(path=str(screenshots["propellerRegression"]))

        gl_error = await page.evaluate("window.__B24_NATIVE_V010__.gl.getError()")
        final_state = await page.evaluate("window.__B24_V010_QA_STATE__")
        browser_version = browser.version
        await browser.close()

    diffs = {
        "nacelleServiceVsOff": pixel_diff(screenshots["nacelleOff"], screenshots["nacelleService"]),
        "nacelleDiagnosticVsOff": pixel_diff(screenshots["nacelleOff"], screenshots["nacelleDiagnostic"]),
    }
    pixel_path = ROOT / "B24_V010_PIXEL_DIFF.json"
    pixel_path.write_text(json.dumps(diffs, ensure_ascii=False, indent=2), encoding="utf-8")

    meaningful_service_diff = diffs["nacelleServiceVsOff"]["changedPixelRatioThreshold2"] > 0.0002
    diagnostic_stronger = diffs["nacelleDiagnosticVsOff"]["meanAbsoluteOverall"] > diffs["nacelleServiceVsOff"]["meanAbsoluteOverall"]
    prop_angle_changed = abs(float(prop_after["angle"]) - float(prop_before["angle"])) > 0.001
    prop_axis_ok = prop_after.get("axis") == "local-y" and int(prop_after.get("rootCount", 0)) >= 12
    console_errors = [x for x in console if x["type"] == "error" and "favicon.ico" not in x["text"] and "404" not in x["text"]]

    file_records: dict[str, Any] = {
        "html": {"path": HTML_PATH.name, "bytes": HTML_PATH.stat().st_size, "sha256": sha256(HTML_PATH)},
        "patch": {"path": "B24_V010_RIDGED_PATCH.js", "bytes": (ROOT / "B24_V010_RIDGED_PATCH.js").stat().st_size, "sha256": sha256(ROOT / "B24_V010_RIDGED_PATCH.js")},
        "pixelDiff": {"path": pixel_path.name, "bytes": pixel_path.stat().st_size, "sha256": sha256(pixel_path)},
        "screenshots": {},
    }
    for key, path in screenshots.items():
        file_records["screenshots"][key] = {"path": path.name, "bytes": path.stat().st_size, "sha256": sha256(path)}

    report = {
        "schema": "haihao.aircraft/b24-v010-browser-qa@1.0.0",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "build": final_state["build"],
        "browser": {
            "engine": f"Chromium {browser_version}",
            "viewport": [1440, 900],
            "httpStatus": response.status if response else None,
            "pageErrors": page_errors,
            "consoleErrors": console_errors,
            "consoleMessages": console,
            "webglError": gl_error,
            "runner": "Playwright headed Chromium under Xvfb with ANGLE SwiftShader",
        },
        "locks": {
            "sourceLockMatchesV009R1": source_ok,
            "geometryMatchesV009R1": geometry_ok,
            "sourcePayloadChanged": final_state["sourcePayloadChanged"],
            "geometryChanged": final_state["geometryChanged"],
            "animationChanged": final_state["animationChanged"],
        },
        "ridgedLayer": {
            "state": final_state["surface"],
            "materialMaskChecks": material_checks,
            "meaningfulServicePixelDifference": meaningful_service_diff,
            "diagnosticDifferenceStrongerThanService": diagnostic_stronger,
            "pixelDiffReport": pixel_path.name,
        },
        "regressions": {
            "propeller": {"before": prop_before, "after": prop_after, "angleChanged": prop_angle_changed, "localYAxisPreserved": prop_axis_ok},
            "nacelleSkin": final_state["regressions"]["nacelleSkin"],
            "landingGearMaterial": final_state["regressions"]["landingGearMaterial"],
        },
        "approvals": final_state["approvals"],
        "allApprovalsRemainFalse": approvals_false,
        "files": file_records,
        "gates": {
            "browserLoad": response is not None and response.status == 200,
            "noPageErrors": len(page_errors) == 0,
            "noConsoleErrors": len(console_errors) == 0,
            "webglNoError": gl_error == 0,
            "sourceLock": source_ok,
            "geometryLock": geometry_ok,
            "protectedGroupsZeroZone": bool(material_checks["protectedAllZero"]),
            "ridgedVisibleAtServicePreset": meaningful_service_diff,
            "diagnosticPresetAmplifiesRidged": diagnostic_stronger,
            "propellerLocalYRegression": prop_angle_changed and prop_axis_ok,
            "approvalsClosed": approvals_false,
        },
    }
    report["localBrowserQaPassed"] = all(report["gates"].values())
    out = ROOT / "B24_V010_BROWSER_QA.json"
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
