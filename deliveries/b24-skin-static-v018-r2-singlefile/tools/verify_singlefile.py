#!/usr/bin/env python3
from __future__ import annotations
import argparse, functools, hashlib, http.server, json, threading
from pathlib import Path
from playwright.sync_api import sync_playwright

EXPECTED_GEOMETRY = "84d0eaf16e790989145605c3cd70de1fea64e1f62a58acfafb5455c0876e2e44"
EXPECTED_BOUNDS = [33.07705116271973, 5.0038755088246205, 20.85940933227539]

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--html", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    html = args.html.resolve()
    root = html.parent
    args.out.mkdir(parents=True, exist_ok=True)
    raw = html.read_bytes()
    report = {
        "html": html.name,
        "htmlBytes": len(raw),
        "htmlSHA256": hashlib.sha256(raw).hexdigest(),
        "checks": [],
        "viewports": [],
        "visualAcceptance": False,
        "productionReady": False,
    }
    def check(name: str, value: bool, detail=None):
        row = {"name": name, "passed": bool(value)}
        if detail is not None:
            row["detail"] = detail
        report["checks"].append(row)
        if not value:
            print("FAILED", name, detail)
    text = raw.decode("utf-8")
    check("one HTML contains no external URL", "https://" not in text and "http://" not in text)
    check("one HTML contains no relative script or stylesheet", 'src="./' not in text and 'href="./' not in text)
    check("embedded geometry identity is present", EXPECTED_GEOMETRY in text or "GEOMETRY:`" in text)
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(root))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 8765), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True, args=["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
            for width, height in ((1440, 900), (390, 844)):
                page = browser.new_page(viewport={"width": width, "height": height})
                requests = []
                errors = []
                page.on("request", lambda request: requests.append(request.url))
                page.on("pageerror", lambda error: errors.append(str(error)))
                page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
                response = page.goto(f"http://127.0.0.1:8765/{html.name}", wait_until="domcontentloaded", timeout=120000)
                check(f"{width} document HTTP 200", response is not None and response.status == 200)
                page.wait_for_function("window.__B24_SKIN_WORKBENCH__?.ready === true", timeout=180000)
                page.wait_for_timeout(750)
                state = page.evaluate("window.__B24_SKIN_WORKBENCH__.getState()")
                check(f"{width} static part count", state["parts"] == 218, state)
                check(f"{width} skin-only default visibility", state["visible"] == 189, state)
                check(f"{width} geometry SHA-256", state["geometrySHA256"] == EXPECTED_GEOMETRY)
                check(f"{width} closed side doors by default", state["sideDoorPose"] == "closed")
                check(f"{width} metre bounds retained", all(abs(a-b) < 2e-12 for a,b in zip(state["bounds"]["size"], EXPECTED_BOUNDS)))
                if width <= 820:
                    check(f"{width} closed mobile panel does not overflow", page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"))
                    page.locator("#mobilePanel").click()
                    check(f"{width} mobile controls open", page.locator("#panel").evaluate("el => el.classList.contains('open') && getComputedStyle(el).visibility === 'visible'"))
                page.locator("#doorOpen").click()
                check(f"{width} side doors reopen", page.evaluate("__B24_SKIN_WORKBENCH__.getState().sideDoorPose") == "open")
                page.locator("#doorClosed").click()
                check(f"{width} side doors close again", page.evaluate("__B24_SKIN_WORKBENCH__.getState().sideDoorPose") == "closed")
                page.locator("#showFit").check()
                page.locator("#showOpenings").check()
                check(f"{width} all references independently visible", page.evaluate("__B24_SKIN_WORKBENCH__.getState().visible") == 218)
                page.evaluate("__B24_SKIN_WORKBENCH__.selectPart('b24.v018.node.0764')")
                check(f"{width} stable part identity selectable", "b24.v018.node.0764" in page.locator("#selectedCard").inner_text())
                if width <= 820:
                    page.locator("#mobilePanel").click()
                    check(f"{width} mobile controls close", page.locator("#panel").evaluate("el => !el.classList.contains('open') && getComputedStyle(el).visibility === 'hidden'"))
                network = [url for url in requests if not url.startswith("blob:") and not url.endswith("/favicon.ico")]
                check(f"{width} only one network document", len(network) == 1, network)
                check(f"{width} no runtime errors", not errors, errors)
                check(f"{width} no horizontal overflow", page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"))
                page.screenshot(path=str(args.out / f"B24_SKIN_SINGLEFILE_{width}.png"), full_page=True)
                report["viewports"].append({"width": width, "height": height, "requests": requests, "errors": errors, "state": state})
                page.close()
            browser.close()
    finally:
        server.shutdown()
    report["passed"] = all(row["passed"] for row in report["checks"])
    report["passedCount"] = sum(row["passed"] for row in report["checks"])
    report["total"] = len(report["checks"])
    (args.out / "SINGLEFILE_QA.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))
    return 0 if report["passed"] else 1

if __name__ == "__main__":
    raise SystemExit(main())
