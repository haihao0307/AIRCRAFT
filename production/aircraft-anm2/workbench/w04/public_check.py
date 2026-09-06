"""Actual URL/offline-file review of the reference-free W04 candidate. No source asset needed."""
import argparse, hashlib, json
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image, ImageChops, ImageStat


def run(url, out, browser_path=None):
    out.mkdir(parents=True, exist_ok=True)
    report = {'scope': 'W04 generated sideplate and provisional material only', 'url': url,
              'sourceReferenceLoaded': False, 'visualAcceptance': False, 'views': []}
    with sync_playwright() as pw:
        opts = {'headless': True, 'args': ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--disable-dev-shm-usage']}
        if browser_path:
            opts['executable_path'] = browser_path
        browser = pw.chromium.launch(**opts)
        report['browser'] = browser.version
        for label, w, h in [('desktop', 1500, 950), ('mobile', 390, 844)]:
            page = browser.new_page(viewport={'width': w, 'height': h}, device_scale_factor=1)
            page.set_default_timeout(30000)
            row = {'label': label, 'viewport': [w, h], 'checks': [], 'errors': [], 'requests': []}
            report['views'].append(row)
            page.on('pageerror', lambda e: row['errors'].append(str(e)))
            page.on('console', lambda m: row['errors'].append(m.text) if m.type == 'error' else None)
            page.on('request', lambda r: row['requests'].append(r.url))
            def check(name, value):
                row['checks'].append({'name': name, 'passed': bool(value)})
                assert value, name
            def frame():
                count = page.evaluate('W04.frame'); page.evaluate('W04.requestRender()')
                page.wait_for_function('(n)=>W04.frame>n', arg=count, timeout=60000)
            try:
                response = page.goto(url, wait_until='load', timeout=90000)
                page.wait_for_function('window.W04?.ready===true&&W04.frame>0', timeout=90000)
                check('actual_navigation_success', response is None or response.status == 200)
                initial = page.evaluate('()=>W04.audit()')
                row['initialAudit'] = initial
                check('native_before_any_source', initial['generationIndependentOfSource'] and not initial['referenceLoaded'])
                check('expected_generated_geometry', initial['nativeStats']['triangles'] == 4904 and initial['nativeStats']['featureGroups'] == 6)
                check('no_horizontal_overflow', page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
                page.screenshot(path=str(out/(label+'-initial.png')))
                check('reference_comparison_initially_disabled', page.locator('[data-display="split"]').is_disabled())
                for mode in ['metal', 'neutral', 'color', 'roughness', 'normal', 'wire', 'facing']:
                    page.evaluate('(mode)=>W04.setChannel(mode)', mode); frame()
                    check('channel_'+mode, page.evaluate('W04.state().channel') == mode)
                for key in ['roughness', 'grain', 'relief', 'film']:
                    page.evaluate('(k)=>{const s=W04.state();W04.setSurface({roughness:s.roughness,grain:s.grain,relief:s.relief,film:s.film,[k]:.6})}', key)
                    check('uniform_'+key, page.evaluate('()=>W04.audit()')['materialUniforms'][key] == .6)
                page.evaluate('W04.setChannel("metal");W04.setSurface({roughness:.15,grain:.42,relief:.28,film:0});W04.fit("oblique")'); frame()
                page.locator('#viewport').screenshot(path=str(out/(label+'-low.png')))
                page.evaluate('W04.setSurface({roughness:.85,grain:.42,relief:.28,film:0})'); frame()
                page.locator('#viewport').screenshot(path=str(out/(label+'-high.png')))
                delta = ImageChops.difference(Image.open(out/(label+'-low.png')).convert('RGB'), Image.open(out/(label+'-high.png')).convert('RGB'))
                row['materialPixelDelta'] = sum(ImageStat.Stat(delta).mean)/3
                check('roughness_changes_rendered_pixels', row['materialPixelDelta'] > .01)
                page.evaluate('W04.setSpread(1)'); frame(); page.screenshot(path=str(out/(label+'-spread.png')))
                check('spread_and_restore', page.evaluate('(()=>{W04.setSpread(0);return W04.state().spread===0})()'))
                check('unchanged_geometry_after_controls', page.evaluate('()=>W04.audit()')['nativeGeometryHash'] == initial['nativeGeometryHash'])
                for view in ['front', 'reverse', 'top', 'edge', 'oblique']:
                    page.evaluate('(v)=>W04.fit(v)', view); frame()
                if label == 'mobile':
                    page.locator('#surface-mobile').click(); frame()
                    check('mobile_keeps_visible_model_area', page.locator('#stage').bounding_box()['height'] > 120)
                    page.screenshot(path=str(out/(label+'-panel.png')))
                    page.locator('.surface [data-close]').click(); frame()
                page.evaluate('W04.setSurface({roughness:.46,grain:.42,relief:.28,film:0});W04.setChannel("metal");W04.fit("oblique")'); frame()
                page.screenshot(path=str(out/(label+'-final.png')))
                row['finalAudit'] = page.evaluate('()=>W04.audit()')
                check('no_script_or_shader_errors', not row['errors'])
                check('no_asset_or_upload_requests', len(row['requests']) == 1)
                row['passed'] = True
            except Exception as exc:
                row['passed'] = False; row['failure'] = str(exc)
                page.screenshot(path=str(out/(label+'-failure.png')))
            finally:
                page.close()
        browser.close()
    report['passed'] = all(v['passed'] for v in report['views'])
    report['passedChecks'] = sum(sum(c['passed'] for c in v['checks']) for v in report['views'])
    (out/'public-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
    if not report['passed']:
        raise SystemExit(1)
    print(json.dumps({'passed': True, 'checks': report['passedChecks']}))

if __name__ == '__main__':
    p = argparse.ArgumentParser(); p.add_argument('url'); p.add_argument('--out', type=Path, required=True); p.add_argument('--browser')
    a = p.parse_args(); run(a.url, a.out, a.browser)
