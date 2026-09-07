"""Browser behavior tests. These do not grant visual or historical acceptance."""
from pathlib import Path
import hashlib, http.server, json, os, threading, time
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'workbenches/80-days-v3/qa'
OUT.mkdir(exist_ok=True)
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def log_message(self, *args):
        pass
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_port}/80-days-workbench-v3.html'
report = {'schema': 'b24-workbench-browser-qa@1', 'visualAcceptance': False,
          'productionReady': False, 'tests': [], 'errors': [],
          'modelTransport': 'local route fulfills exact authoritative bytes; public network not tested'}

def record(name, condition, detail=None):
    report['tests'].append({'name': name, 'passed': bool(condition), 'detail': detail})
    if not condition:
        raise AssertionError(name + ': ' + str(detail))

def capture(page, name, full=False):
    path = OUT / (name + '.png')
    page.screenshot(path=str(path), full_page=full)
    return hashlib.sha256(path.read_bytes()).hexdigest()

try:
    with sync_playwright() as p:
        executable = os.environ.get('CHROMIUM_PATH')
        browser = p.chromium.launch(headless=True, executable_path=executable or None,
             args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        ctx = browser.new_context(viewport={'width': 1560, 'height': 1040}, device_scale_factor=1)
        page = ctx.new_page()
        page.on('pageerror', lambda e: report['errors'].append(str(e)))
        failed_requests = []
        page.on('requestfailed', lambda r: failed_requests.append({'url': r.url[:160], 'error': r.failure}))
        page.route('**/public/assets/model/b-24_liberator.glb', lambda route: route.fulfill(
            path=str(ROOT / 'public/assets/model/b-24_liberator.glb'), content_type='model/gltf-binary',
            headers={'Access-Control-Allow-Origin': '*'}))
        page.goto(url, wait_until='load', timeout=90000)
        page.wait_for_function('window.__B24QA?.ready || window.__B24QA?.errors.length', timeout=60000)
        record('desktop initializes', page.evaluate('window.__B24QA.ready'), page.evaluate('window.__B24QA.errors'))
        page.wait_for_timeout(1300)
        capture(page, 'desktop-material')
        record('desktop no horizontal overflow', page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'))
        state = page.evaluate('window.__B24QA')
        report['desktopInitial'] = state
        record('interactive frames render', state['frames'] > 5)
        record('initial load did not fetch plane', state['modelVerified'] is False)
        for name in ['front', 'angle', 'close']:
            page.locator(f'[data-camera="{name}"]').click()
            page.wait_for_timeout(350)
        page.locator('[data-camera="front"]').click()
        hashes = {}
        for channel in ['base', 'roughness', 'normal', 'metalness', 'height', 'decal']:
            page.locator(f'[data-channel="{channel}"]').click()
            page.wait_for_timeout(250)
            hashes[channel] = capture(page, 'channel-' + channel)
            record('channel ' + channel, page.evaluate('window.__B24QA.state.channel') == channel)
        record('channel views differ', len(set(hashes.values())) == len(hashes), hashes)
        page.locator('[data-channel="beauty"]').click()
        for name in ['raking', 'studio', 'neutral']:
            page.locator(f'[data-light="{name}"]').click()
            record('light ' + name, page.evaluate('window.__B24QA.state.light') == name)
        initial_revision = page.evaluate('window.__B24QA.mapRevision')
        page.locator('#rough').evaluate("e => {e.value='0.81'; e.dispatchEvent(new Event('input',{bubbles:true}));}")
        page.wait_for_function(f'window.__B24QA.mapRevision > {initial_revision}', timeout=20000)
        record('roughness control rebuilds', abs(page.evaluate('window.__B24QA.state.rough') - .81) < 1e-6)
        page.locator('#side').select_option('starboard')
        page.wait_for_timeout(700)
        capture(page, 'starboard-material')
        record('independent side switches', page.evaluate('window.__B24QA.state.side') == 'starboard')
        page.locator('[data-mode="photo"]').click()
        page.wait_for_timeout(300)
        capture(page, 'starboard-photo-overlay')
        page.locator('[data-zoom="2"]').click()
        record('200 percent source view', page.locator('#photoStage').evaluate('e=>parseFloat(e.style.width)') == 1280)
        page.locator('[data-zoom="fit"]').click()
        page.locator('[data-mode="knowledge"]').click()
        record('five learning cards', page.locator('.knowledge-card').count() == 5)
        capture(page, 'learning-records')
        with page.expect_download() as download_info:
            page.locator('#exportJson').click()
        downloaded = json.loads(Path(download_info.value.path()).read_text())
        record('settings export retains zero binding and pending review', downloaded['modelBinding'] == 0 and downloaded['visualAcceptance'] is False)
        page.locator('#reset').click()
        record('reset restores state', page.evaluate('window.__B24QA.state.side') == 'port' and page.evaluate('window.__B24QA.state.mode') == 'sample')
        page.locator('[data-mode="aircraft"]').click()
        page.wait_for_function('window.__B24QA.modelVerified || window.__B24QA.modelLoadError', timeout=120000)
        state = page.evaluate('window.__B24QA')
        report['aircraft'] = {k: v for k, v in state.items() if k != 'state'}
        record('exact source model passes hash', state['modelVerified'], state.get('modelLoadError'))
        page.wait_for_timeout(1200)
        capture(page, 'authoritative-aircraft')
        record('model remains unbound', state['modelBinding'] == 0)
        page.locator('[data-mode="sample"]').click()
        page.wait_for_timeout(500)
        record('sample remains after plane view', page.evaluate('window.__B24QA.state.mode') == 'sample')
        record('no desktop page errors', not report['errors'], report['errors'])
        record('no desktop failed requests', not failed_requests, failed_requests)
        mobile = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, is_mobile=True, has_touch=True)
        mp = mobile.new_page()
        mp.on('pageerror', lambda e: report['errors'].append(str(e)))
        mp.goto(url, wait_until='load', timeout=90000)
        mp.wait_for_function('window.__B24QA?.ready || window.__B24QA?.errors.length', timeout=60000)
        record('mobile initializes', mp.evaluate('window.__B24QA.ready'), mp.evaluate('window.__B24QA.errors'))
        mp.wait_for_timeout(900)
        capture(mp, 'mobile-first-screen')
        capture(mp, 'mobile-full-page', True)
        record('mobile no horizontal overflow', mp.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), mp.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})'))
        mp.locator('[data-mode="photo"]').click()
        mp.locator('#side').select_option('starboard')
        mp.locator('[data-mode="sample"]').click()
        mp.wait_for_timeout(500)
        record('mobile controls respond', mp.evaluate('window.__B24QA.state.side') == 'starboard')
        report['mobileFinal'] = mp.evaluate('window.__B24QA')
        record('no browser page errors', not report['errors'], report['errors'])
        report['result'] = 'passed'
        browser.close()
except Exception as e:
    report['result'] = 'failed'
    report['failure'] = repr(e)
    try:
        capture(page, 'failure', True)
        report['failureText'] = page.locator('body').inner_text()[:5000]
    except Exception:
        pass
finally:
    report['htmlSHA256'] = hashlib.sha256((ROOT / '80-days-workbench-v3.html').read_bytes()).hexdigest()
    report['browser'] = 'Chromium, headless software-rendering CI; not physical mobile hardware'
    (ROOT / 'workbenches/80-days-v3/BROWSER_QA.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps(report, ensure_ascii=False, indent=2))
    server.shutdown()
if report['result'] != 'passed':
    raise SystemExit(1)
