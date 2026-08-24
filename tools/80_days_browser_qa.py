#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import threading
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, _format: str, *args: object) -> None:
        pass


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument('--site', default='dist')
    parser.add_argument('--report', default='reports/80-days-browser-qa.json')
    parser.add_argument('--screenshots', default='qa/80-days')
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    site = Path(args.site).resolve()
    report_path = Path(args.report).resolve()
    screenshot_dir = Path(args.screenshots).resolve()
    report_path.parent.mkdir(parents=True, exist_ok=True)
    screenshot_dir.mkdir(parents=True, exist_ok=True)

    handler = partial(QuietHandler, directory=str(site))
    server = ThreadingHTTPServer(('127.0.0.1', 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base_url = f'http://127.0.0.1:{server.server_address[1]}/'

    console_errors: list[str] = []
    page_errors: list[str] = []
    failed_requests: list[dict[str, str]] = []
    checks: list[dict[str, object]] = []
    screenshots: list[dict[str, object]] = []

    def check(name: str, ok: bool, detail: object) -> None:
        checks.append({'name': name, 'ok': bool(ok), 'detail': detail})

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                headless=True,
                args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
            )
            page = browser.new_page(viewport={'width': 1440, 'height': 900}, device_scale_factor=1)
            page.on('console', lambda message: console_errors.append(message.text) if message.type == 'error' else None)
            page.on('pageerror', lambda error: page_errors.append(str(error)))
            page.on('requestfailed', lambda request: failed_requests.append({
                'url': request.url,
                'failure': request.failure or 'unknown',
            }))

            page.goto(base_url + '80-days-livery-workbench.html', wait_until='domcontentloaded', timeout=120_000)
            page.wait_for_function(
                "document.querySelector('#modelPill')?.textContent === '真实模型已验证'",
                timeout=180_000,
            )
            page.wait_for_function("document.querySelector('#meshCount')?.textContent === '348'", timeout=30_000)

            model_pill = page.locator('#modelPill').inner_text()
            mesh_count = int(page.locator('#meshCount').inner_text())
            candidate_count = int(page.locator('#candidateCount').inner_text())
            animation_count = int(page.locator('#animationCount').inner_text())
            decal_count = int(page.locator('#decalCount').inner_text())
            asset_state = page.locator('#assetState').inner_text()

            check('authoritative-model-verified', model_pill == '真实模型已验证', model_pill)
            check('mesh-inventory', mesh_count == 348, mesh_count)
            check('paint-candidate-count', candidate_count == 8, candidate_count)
            check('animation-inventory', animation_count == 1, animation_count)
            check('review-marking-layer-count', decal_count == 9, decal_count)
            check('source-sha-visible', '541c3dcf' in asset_state and 'efe8be0d' in asset_state, asset_state)

            interaction_plan = [
                ('port', "button[data-view='port']"),
                ('starboard', "button[data-view='starboard']"),
                ('port-nose', "button[data-view='portNose']"),
                ('stam', "button[data-view='stam']"),
                ('fins', "button[data-view='fins']"),
            ]
            for label, selector in interaction_plan:
                page.locator(selector).first.click()
                page.wait_for_timeout(350)
                path = screenshot_dir / f'80-days-{label}.png'
                page.screenshot(path=str(path), full_page=False)
                payload = path.read_bytes()
                screenshots.append({
                    'name': path.name,
                    'bytes': len(payload),
                    'sha256': hashlib.sha256(payload).hexdigest(),
                })

            for mode in ('source', 'livery', 'uv', 'normal', 'roughness', 'height', 'mask'):
                page.locator(f"button[data-mode='{mode}']").click()
                page.wait_for_timeout(180)
                check(f'mode-{mode}', page.locator(f"button[data-mode='{mode}']").get_attribute('class') and 'active' in (page.locator(f"button[data-mode='{mode}']").get_attribute('class') or ''), mode)

            page.locator("button[data-mode='livery']").click()
            page.locator("button[data-view='perspective']").first.click()
            page.wait_for_timeout(500)
            final_path = screenshot_dir / '80-days-perspective.png'
            page.screenshot(path=str(final_path), full_page=False)
            payload = final_path.read_bytes()
            screenshots.append({'name': final_path.name, 'bytes': len(payload), 'sha256': hashlib.sha256(payload).hexdigest()})

            check('console-errors', not console_errors, console_errors)
            check('page-errors', not page_errors, page_errors)
            check('failed-requests', not failed_requests, failed_requests)
            check('screenshots-nonempty', all(item['bytes'] > 10_000 for item in screenshots), screenshots)
            browser.close()
    except Exception as exc:
        checks.append({'name': 'uncaught-exception', 'ok': False, 'detail': f'{type(exc).__name__}: {exc}'})
    finally:
        server.shutdown()
        server.server_close()

    passed = sum(item['ok'] is True for item in checks)
    failed = len(checks) - passed
    report = {
        'schema': 'haihao.aircraft/80-days-browser-qa@1.0',
        'generatedAtEpoch': time.time(),
        'baseUrl': base_url,
        'sourceModel': {
            'releaseTag': '80-days-source-v1',
            'bytes': 23085972,
            'sha256': '541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d',
        },
        'summary': {'passed': passed, 'failed': failed, 'total': len(checks)},
        'checks': checks,
        'diagnostics': {
            'consoleErrors': console_errors,
            'pageErrors': page_errors,
            'failedRequests': failed_requests,
        },
        'screenshots': screenshots,
    }
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(report['summary'], indent=2))
    return 0 if failed == 0 else 1


if __name__ == '__main__':
    raise SystemExit(main())
