#!/usr/bin/env python3
"""Build the fixed single-file B24 skin workbench from the verified V018 numeric runtime.

The reference runtime is read-only. This builder selects static skin/reference meshes,
reconstructs an exact deduplicated numeric payload, applies the fixed closed waist-door
matrices, embeds the payload and pinned Three.js modules, and writes one standalone HTML.
"""
from __future__ import annotations
import argparse, base64, gzip, hashlib, json, math, re
from pathlib import Path
from typing import Any

import numpy as np

REFERENCE_COMMIT = "f3a8e9edc3c2dc542d680aee469467e95211a31f"
EXPECTED_GEOMETRY_SHA256 = "84d0eaf16e790989145605c3cd70de1fea64e1f62a58acfafb5455c0876e2e44"
EXPECTED_GEOMETRY_BYTES = 6_809_416
EXPECTED_BOUNDS = {
    "min": [-16.538280487060547, -2.279374790667987, -12.990289449691772],
    "max": [16.53877067565918, 2.7245007181566336, 7.869119882583618],
    "size": [33.07705116271973, 5.0038755088246205, 20.85940933227539],
}
EXCLUDED_TIRE_NODES = {598, 601, 613, 616, 681, 684, 689, 692, 1189, 1192, 1197, 1200, 1203}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def gz_b64(data: bytes) -> str:
    return base64.b64encode(gzip.compress(data, compresslevel=9, mtime=0)).decode("ascii")


def load_reference(runtime: Path) -> tuple[dict[str, Any], bytes]:
    text = (runtime / "asset-layout.js").read_text(encoding="utf-8")
    match = re.search(r"export const LAYOUT = (.*);\s*$", text, re.S)
    if not match:
        raise RuntimeError("Cannot parse the pinned asset layout")
    layout = json.loads(match.group(1))
    decoded: dict[str, bytes] = {}
    for dataset in layout["datasets"]:
        zipped = b"".join((runtime / part["url"][2:]).read_bytes() for part in dataset["parts"])
        if len(zipped) != dataset["bytes"] or sha256(zipped) != dataset["sha256"]:
            raise RuntimeError(f"Pinned {dataset['id']} dataset differs")
        raw = gzip.decompress(zipped)
        if len(raw) != dataset["decodedBytes"] or sha256(raw) != dataset["decodedSha256"]:
            raise RuntimeError(f"Pinned {dataset['id']} decoded data differs")
        decoded[dataset["id"]] = raw
    manifest = json.loads(decoded["json"])
    if manifest["schema"] != "b24-compact-numeric/1":
        raise RuntimeError("Unexpected reference schema")
    return manifest, decoded["bin"]


def local_matrix(component: dict[str, Any]) -> np.ndarray:
    if component.get("matrix") is not None:
        return np.array(component["matrix"], dtype=np.float64).reshape((4, 4), order="F")
    tx, ty, tz = component.get("translation", [0, 0, 0])
    x, y, z, w = component.get("rotation", [0, 0, 0, 1])
    sx, sy, sz = component.get("scale", [1, 1, 1])
    matrix = np.array([
        [1 - 2 * (y*y + z*z), 2 * (x*y - z*w), 2 * (x*z + y*w), tx],
        [2 * (x*y + z*w), 1 - 2 * (x*x + z*z), 2 * (y*z - x*w), ty],
        [2 * (x*z - y*w), 2 * (y*z + x*w), 1 - 2 * (x*x + y*y), tz],
        [0, 0, 0, 1],
    ], dtype=np.float64)
    matrix[:, 0] *= sx
    matrix[:, 1] *= sy
    matrix[:, 2] *= sz
    return matrix


def transformed_bounds(bounds: dict[str, list[float]], matrix: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    lo = np.array(bounds["min"], dtype=np.float64)
    hi = np.array(bounds["max"], dtype=np.float64)
    corners = np.array([[x, y, z, 1.0] for x in (lo[0], hi[0]) for y in (lo[1], hi[1]) for z in (lo[2], hi[2])])
    points = (matrix @ corners.T).T[:, :3]
    return points.min(axis=0), points.max(axis=0)


def reconstruct(runtime: Path, pose_file: Path) -> tuple[dict[str, Any], dict[str, Any], bytes, dict[str, Any]]:
    source, source_payload = load_reference(runtime)
    poses = json.loads(pose_file.read_text(encoding="utf-8"))
    if poses["schema"] != "b24-static-side-door-poses/1.0":
        raise RuntimeError("Unexpected side-door pose schema")
    components = source["components"]
    meshes = source["meshes"]
    blocks = source["blocks"]
    paths: list[str] = []
    world: list[np.ndarray] = []
    for component in components:
        paths.append(component["name"] if component["parent"] is None else paths[component["parent"]] + "/" + component["name"])
        matrix = local_matrix(component)
        if component["parent"] is not None:
            matrix = world[component["parent"]] @ matrix
        world.append(matrix)
    closed = {member["sourceNode"]: member["closed"]["localToAssetColumnMajor"]
              for assembly in poses["assemblies"] for member in assembly["members"]}
    articulation = {member["sourceNode"]: {
        "assemblyId": assembly["assemblyId"], "memberRole": member["memberRole"], "defaultPose": "closed",
        "keepSeparateForFutureOpening": True,
    } for assembly in poses["assemblies"] for member in assembly["members"]}

    selected: list[tuple[dict[str, Any], str]] = []
    for component in components:
        if component.get("mesh") is None:
            continue
        family = component["semanticFamily"]
        if family == "airframe-skin" and component["id"] not in EXCLUDED_TIRE_NODES:
            role = "fit_surface_reference" if re.search(r"(?:[lrc]_gear_|[lrc]_wheel_)", paths[component["id"]], re.I) else "skin_surface"
            selected.append((component, role))
        elif family == "glass":
            selected.append((component, "opening_reference"))
    selected.sort(key=lambda item: item[0]["id"])
    counts = {"skin_surface": 0, "fit_surface_reference": 0, "opening_reference": 0}
    geometry = bytearray()
    new_blocks: list[dict[str, Any]] = []
    dedup: dict[tuple[Any, ...], int] = {}
    parts: list[dict[str, Any]] = []
    global_min = np.array([math.inf, math.inf, math.inf])
    global_max = np.array([-math.inf, -math.inf, -math.inf])

    for component, role in selected:
        counts[role] += 1
        mesh = meshes[component["mesh"]]
        attributes: dict[str, int] = {}
        for semantic, field in (("position", "positionBlock"), ("normal", "normalBlock"), ("index", "indexBlock")):
            block = blocks[mesh[field]]
            key = (semantic, block["dtype"], block["byteLength"], block["sha256"])
            if key not in dedup:
                alignment = {"f32": 4, "u16": 2, "u32": 4}[block["dtype"]]
                while len(geometry) % alignment:
                    geometry.append(0)
                data = source_payload[block["offset"]:block["offset"] + block["byteLength"]]
                if sha256(data) != block["sha256"]:
                    raise RuntimeError("Source geometry block differs")
                block_id = len(new_blocks)
                byte_offset = len(geometry)
                geometry.extend(data)
                new_blocks.append({
                    "id": block_id, "semantic": semantic, "dtype": block["dtype"], "byteOffset": byte_offset,
                    "byteLength": len(data), "componentCount": 1 if semantic == "index" else 3,
                    "scalarCount": len(data) // {"f32": 4, "u16": 2, "u32": 4}[block["dtype"]],
                    "sha256": block["sha256"],
                })
                dedup[key] = block_id
            attributes[semantic] = dedup[key]
        matrix_values = closed.get(component["id"], world[component["id"]].reshape(-1, order="F").tolist())
        matrix = np.array(matrix_values, dtype=np.float64).reshape((4, 4), order="F")
        lo, hi = transformed_bounds(mesh["bounds"], matrix)
        global_min = np.minimum(global_min, lo)
        global_max = np.maximum(global_max, hi)
        if hi[0] < 0:
            side = "starboard_negative_x"
        elif lo[0] > 0:
            side = "port_positive_x"
        else:
            side = "crosses_centerplane"
        part = {
            "id": f"b24.v018.node.{component['id']:04d}", "sourceNode": component["id"], "sourceMesh": component["mesh"],
            "sourceGeometryId": mesh["id"], "sourceFamily": component["semanticFamily"], "sourceNodePath": paths[component["id"]],
            "role": role, "sourceSideRegion": side, "candidatePaintTarget": role == "skin_surface",
            "requiresSurfaceSelectionReview": True, "attributes": attributes, "vertexCount": mesh["vertexCount"],
            "triangleCount": mesh["triangleCount"], "localToAssetColumnMajor": matrix_values,
        }
        if component["id"] in articulation:
            part["articulation"] = articulation[component["id"]]
        parts.append(part)

    geometry_bytes = bytes(geometry)
    if len(geometry_bytes) != EXPECTED_GEOMETRY_BYTES or sha256(geometry_bytes) != EXPECTED_GEOMETRY_SHA256:
        raise RuntimeError("Reconstructed static geometry does not match the frozen R2 package")
    size = (global_max - global_min).tolist()
    for actual, expected in zip(global_min.tolist() + global_max.tolist() + size,
                                EXPECTED_BOUNDS["min"] + EXPECTED_BOUNDS["max"] + EXPECTED_BOUNDS["size"]):
        if abs(actual - expected) > 2e-12:
            raise RuntimeError("Static dimensional bounds differ")
    vertex_count = sum(part["vertexCount"] for part in parts)
    triangle_count = sum(part["triangleCount"] for part in parts)
    if len(parts) != 218 or counts != {"skin_surface": 189, "fit_surface_reference": 26, "opening_reference": 3}:
        raise RuntimeError("Static surface selection differs")
    if vertex_count != 236_929 or triangle_count != 238_898 or len(new_blocks) != 347:
        raise RuntimeError("Static geometry counts differ")

    manifest = {
        "schema": "b24-static-skin-singlefile/1.0", "packageId": "B24_SKIN_STATIC_V018_R2_SIDE_DOORS_CLOSED",
        "date": "2026-09-06", "representation": "lossless source numeric static mesh subset; no animation, image, UV or material assets",
        "coordinateSystem": {"handedness": "right-handed", "assetUnit": "metre", "metresPerAssetUnit": 1,
                             "upAxis": "+Y", "noseAxis": "+Z", "portAxis": "+X", "starboardAxis": "-X",
                             "matrixLayout": "column-major", "sourceScalePreserved": True},
        "payload": {"byteLength": len(geometry_bytes), "sha256": sha256(geometry_bytes), "byteOrder": "little-endian"},
        "counts": {"parts": len(parts), "geometryBuffers": len(new_blocks), "vertices": vertex_count,
                   "triangles": triangle_count, "roles": counts},
        "assetBoundsMetres": {"min": global_min.tolist(), "max": global_max.tolist(), "size": size},
        "calibration": {"sourceScalePreserved": True, "historicalAbsoluteDimensionsValidated": False,
                        "dimensionalWarning": "Source span 33.0770511627 m differs from published B-24J nominal 33.528 m; no corrective scaling applied."},
        "staticPosture": {"waistSideDoors": "closed", "timeVaryingDataIncluded": False, "reopenEndpointDataIncluded": True},
        "excludedPayloadTypes": ["GLB", "source image bytes", "UV arrays", "source materials", "animation curves", "skeleton", "audio", "weather", "flight task"],
        "buffers": new_blocks, "parts": parts,
    }
    report = {
        "referenceCommit": REFERENCE_COMMIT, "geometryBytes": len(geometry_bytes), "geometrySHA256": sha256(geometry_bytes),
        "parts": len(parts), "vertices": vertex_count, "triangles": triangle_count, "bufferCount": len(new_blocks),
        "roles": counts, "boundsMetres": manifest["assetBoundsMetres"], "sourceScalePreserved": True,
        "sideDoorsDefault": "closed", "sideDoorsReopenable": True, "animationIncluded": False,
        "imagesIncluded": False, "uvIncluded": False, "externalRuntimeDependencies": 0,
    }
    return manifest, poses, geometry_bytes, report


HTML_TEMPLATE = r'''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="dark"><title>B24 蒙皮静态纯数据工作台 · V018 R2</title><style>
:root{--bg:#09110d;--panel:#111b16;--line:rgba(211,226,202,.15);--text:#e8efe5;--muted:#91a193;--accent:#cedca9;--warn:#e4c98b}*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:var(--bg);color:var(--text);font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif}button,input{font:inherit}.app{display:grid;grid-template-columns:minmax(0,1fr) 350px;height:100%}.stage{position:relative;min-width:0;background:radial-gradient(circle at 50% 38%,#18251d 0,#09110d 66%)}canvas{display:block;width:100%;height:100%;touch-action:none}.top{position:absolute;left:22px;top:18px;right:22px;display:flex;justify-content:space-between;pointer-events:none}.brand{display:flex;gap:12px;align-items:center;text-shadow:0 2px 18px #000}.mark{width:44px;height:44px;border:1px solid rgba(221,232,190,.28);display:grid;place-items:center;font-weight:800;color:var(--accent);background:rgba(6,12,9,.55);backdrop-filter:blur(12px)}.brand small{display:block;color:#8fa18d;font-size:9px;letter-spacing:.18em}.brand h1{font-size:17px;margin:5px 0 0}.badges{display:flex;gap:7px}.badge{padding:7px 9px;border:1px solid var(--line);border-radius:4px;background:rgba(9,17,13,.72);font-size:10px;color:#b9c7b5}.badge.good{color:var(--accent)}.viewbar{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);display:flex;gap:5px;padding:6px;border:1px solid var(--line);border-radius:6px;background:rgba(7,13,10,.82);backdrop-filter:blur(12px)}button{border:1px solid rgba(213,226,202,.13);background:#17221b;color:#cfd9cc;border-radius:4px;padding:8px 10px;cursor:pointer}button:hover,button.active{border-color:rgba(214,228,175,.4);color:#eff5df;background:#243126}.hint{position:absolute;left:20px;bottom:20px;color:#738477;font-size:10px}.selection{position:absolute;left:20px;top:92px;max-width:min(390px,calc(100% - 40px));padding:10px 12px;border-left:2px solid var(--accent);background:rgba(7,13,10,.72);font-size:11px;display:none}.selection b{display:block;color:#eff5df}.panel{overflow:auto;background:linear-gradient(180deg,#111b16,#0d1612);border-left:1px solid var(--line);padding:20px}.panel header{padding-bottom:17px;border-bottom:1px solid var(--line)}.panel header small{font-size:9px;letter-spacing:.18em;color:#80917f}.panel header h2{font-size:20px;margin:8px 0 6px}.panel header p{font-size:11px;line-height:1.6;color:var(--muted);margin:0}.section{padding:17px 0;border-bottom:1px solid var(--line)}.section h3{font-size:12px;margin:0 0 12px}.metrics{display:grid;grid-template-columns:1fr 1fr;gap:7px}.metric{padding:10px;border:1px solid rgba(213,226,202,.09);background:rgba(255,255,255,.018)}.metric small{display:block;color:#77887b;font-size:9px}.metric b{display:block;margin-top:5px;font-size:14px}.row,.toggle{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:9px 0;font-size:11px;color:#a7b5a7}.toggle{padding:5px 0}.toggle input{accent-color:#aabd7d}.row input[type=range]{width:145px}.row input[type=color]{width:46px;height:28px;padding:1px;background:transparent;border:1px solid var(--line)}.segments{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}.segments button{font-size:10px}.warn{padding:11px;border:1px solid rgba(228,201,139,.22);color:#cbb88d;font-size:10px;line-height:1.55;background:rgba(114,85,36,.08)}.selectedCard{font-size:10px;line-height:1.65;color:#9bac9c;word-break:break-all}.selectedCard b{color:#dce7d9}.selectedCard button{margin-top:8px;width:100%}.loading{position:absolute;inset:0;display:grid;place-items:center;background:#09110d;z-index:20}.loadcard{width:min(470px,calc(100% - 42px))}.loadcard small{letter-spacing:.2em;color:#93a88d;font-size:9px}.loadcard h2{font-size:22px;margin:14px 0 8px}.loadcard p{color:#8fa08f;font-size:11px}.bar{height:3px;background:#263329;margin-top:18px;overflow:hidden}.bar i{display:block;height:100%;width:0;background:#d5dfa9;transition:width .25s}.error{color:#e7b0a5;white-space:pre-wrap}.footer{padding-top:14px;color:#6d7d70;font-size:9px;line-height:1.55}.mobilePanel{display:none;position:absolute;right:14px;top:14px;z-index:4}@media(max-width:820px){.app{grid-template-columns:1fr}.panel{position:absolute;right:0;top:0;bottom:0;width:min(350px,88vw);z-index:10;transform:translateX(100%);transition:transform .22s;box-shadow:-10px 0 40px #0008}.panel.open{transform:none}.mobilePanel{display:block}.badges{display:none}.top{right:90px}.viewbar{max-width:calc(100% - 28px);overflow-x:auto;left:14px;right:14px;transform:none}.viewbar button{white-space:nowrap}.hint{display:none}}
</style></head><body><div class="app"><main class="stage" id="stage"><canvas id="scene"></canvas><div class="loading" id="loading"><div class="loadcard"><small>SELF-CONTAINED STATIC DATA</small><h2>正在展开 B24 蒙皮纯数据</h2><p id="loadText">验证单文件中的固定数据</p><div class="bar"><i id="loadBar"></i></div><p id="loadDetail">无外部模型、无贴图、无动画</p></div></div><button class="mobilePanel" id="mobilePanel">控制</button><div class="top"><div class="brand"><div class="mark">B24</div><div><small>STATIC SKIN DATA / V018 R2 / CLOSED SIDE DOORS</small><h1>B24 蒙皮静态纯数据工作台</h1></div></div><div class="badges"><span class="badge good">单文件</span><span class="badge">无动画</span><span class="badge">无贴图</span></div></div><div class="selection" id="selection"></div><div class="viewbar"><button data-view="iso" class="active">三分之四</button><button data-view="port">左舷</button><button data-view="starboard">右舷</button><button data-view="nose">机头</button><button data-view="tail">机尾</button><button data-view="top">俯视</button><button data-view="fit">适配画面</button></div><div class="hint">拖动旋转 · 滚轮缩放 · 点击部件查看身份</div></main><aside class="panel" id="panel"><header><small>B24 SKIN HANDOFF</small><h2>静态蒙皮检查</h2><p>左右腰部侧门默认关闭并保持独立。可切换到开启端点，包内不含连续动画。</p></header><section class="section"><h3>数据身份</h3><div class="metrics"><div class="metric"><small>静态部件</small><b id="partCount">218</b></div><div class="metric"><small>三角形</small><b id="triangleCount">238,898</b></div><div class="metric"><small>翼展 X</small><b id="span">33.077 m</b></div><div class="metric"><small>几何数据</small><b id="dataSize">6.49 MB</b></div></div></section><section class="section"><h3>侧门</h3><div class="segments"><button id="doorClosed" class="active">双门关闭</button><button id="doorOpen">双门打开</button></div><div class="row"><span>当前状态</span><b id="doorState">关闭</b></div></section><section class="section"><h3>表面显示</h3><label class="toggle"><span>蒙皮主体</span><input id="showSkin" type="checkbox" checked></label><label class="toggle"><span>配合定位参考</span><input id="showFit" type="checkbox"></label><label class="toggle"><span>开口参考</span><input id="showOpenings" type="checkbox"></label><label class="toggle"><span>线框</span><input id="wireframe" type="checkbox"></label><div class="row"><span>蒙皮颜色</span><input id="skinColor" type="color" value="#aeb7b5"></div><div class="row"><span>粗糙度</span><input id="roughness" type="range" min="0.18" max="1" step="0.01" value="0.48"></div></section><section class="section"><h3>当前部件</h3><div class="selectedCard" id="selectedCard">点击飞机表面读取稳定部件身份。</div></section><section class="section"><div class="warn">尺寸按 V018 源坐标原样保留，1 单位等于 1 米。源翼展 33.077051 m，与公开 B-24J 33.528 m 标称值存在约 1.345% 差异，未擅自缩放。</div></section><div class="footer">几何 SHA-256<br><span id="geometryHash"></span><br><br>固定静态数据，不含 GLB、图片、UV、材质贴图、骨架、动画、声音、天气与飞行任务。</div></aside></div><script>
const EMBED={CORE:`__CORE__`,MODULE:`__MODULE__`,MANIFEST:`__MANIFEST__`,POSES:`__POSES__`,GEOMETRY:`__GEOMETRY__`};const $=id=>document.getElementById(id);function setLoad(p,t,d=''){loadBar.style.width=p+'%';loadText.textContent=t;if(d)loadDetail.textContent=d}function b64bytes(v){const s=atob(v),a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return a}async function gunzip(v,text=false){const ab=await new Response(new Blob([b64bytes(v)]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();return text?new TextDecoder().decode(ab):ab}async function hash(ab){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',ab)),x=>x.toString(16).padStart(2,'0')).join('')}async function loadThree(){const[c,m]=await Promise.all([gunzip(EMBED.CORE,true),gunzip(EMBED.MODULE,true)]),cu=URL.createObjectURL(new Blob([c],{type:'text/javascript'})),mu=URL.createObjectURL(new Blob([m.replaceAll("'./three.core.js'",JSON.stringify(cu)).replaceAll('"./three.core.js"',JSON.stringify(cu))],{type:'text/javascript'}));return import(mu)}function poseMap(p,n){const r=new Map;for(const a of p.assemblies)for(const m of a.members)r.set(m.partId,m[n].localToAssetColumnMajor);return r}
(async()=>{try{if(typeof DecompressionStream!=='function'||!crypto?.subtle)throw Error('请通过 HTTPS 使用新版浏览器打开。');setLoad(8,'展开内置渲染核心');const T=await loadThree();setLoad(25,'读取静态蒙皮清单');const[mt,pt,geometry]=await Promise.all([gunzip(EMBED.MANIFEST,true),gunzip(EMBED.POSES,true),gunzip(EMBED.GEOMETRY)]),manifest=JSON.parse(mt),poses=JSON.parse(pt),digest=await hash(geometry);if(digest!==manifest.payload.sha256)throw Error('内置几何校验失败');setLoad(48,'建立 218 个静态部件');const canvas=scene,renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;const world=new T.Scene;world.background=new T.Color(0x09110d);const camera=new T.PerspectiveCamera(35,1,.05,500);world.add(new T.HemisphereLight(0xe4f0e6,0x273229,2.1));const key=new T.DirectionalLight(0xfff1da,4.2);key.position.set(25,32,28);world.add(key);const fill=new T.DirectionalLight(0x9cc8d7,1.5);fill.position.set(-28,10,-25);world.add(fill);const b=manifest.assetBoundsMetres,grid=new T.GridHelper(54,54,0x415246,0x1d2a22);grid.position.y=b.min[1]-.08;grid.material.transparent=true;grid.material.opacity=.42;world.add(grid);const skinMat=new T.MeshStandardMaterial({color:0xaeb7b5,metalness:.72,roughness:.48,side:T.DoubleSide}),fitMat=new T.MeshStandardMaterial({color:0x65755f,metalness:.25,roughness:.72,transparent:true,opacity:.38,side:T.DoubleSide,depthWrite:false}),openingMat=new T.MeshStandardMaterial({color:0x6fa5b8,metalness:.05,roughness:.35,transparent:true,opacity:.42,side:T.DoubleSide,depthWrite:false}),root=new T.Group;world.add(root);const C={f32:Float32Array,u16:Uint16Array,u32:Uint32Array},cache=new Map,partById=new Map;function attr(id){if(!cache.has(id)){const x=manifest.buffers[id],Type=C[x.dtype];cache.set(id,new Type(geometry,x.byteOffset,x.byteLength/Type.BYTES_PER_ELEMENT))}return cache.get(id)}for(const p of manifest.parts){const g=new T.BufferGeometry;g.setAttribute('position',new T.BufferAttribute(attr(p.attributes.position),3));g.setAttribute('normal',new T.BufferAttribute(attr(p.attributes.normal),3));g.setIndex(new T.BufferAttribute(attr(p.attributes.index),1));g.computeBoundingBox();g.computeBoundingSphere();const mesh=new T.Mesh(g,p.role==='skin_surface'?skinMat:p.role==='fit_surface_reference'?fitMat:openingMat);mesh.name=p.id;mesh.matrix.fromArray(p.localToAssetColumnMajor);mesh.matrixAutoUpdate=false;mesh.userData=p;mesh.visible=p.role==='skin_surface';root.add(mesh);partById.set(p.id,mesh)}root.updateMatrixWorld(true);const center=new T.Vector3((b.min[0]+b.max[0])/2,(b.min[1]+b.max[1])/2,(b.min[2]+b.max[2])/2),size=new T.Vector3(...b.size),baseRadius=size.length()*.52;let theta=.72,phi=1.16,radius=baseRadius*1.48,target=center.clone(),drag=false,lastX=0,lastY=0,moved=0;function updateCamera(){phi=Math.max(.06,Math.min(Math.PI-.06,phi));radius=Math.max(baseRadius*.38,Math.min(baseRadius*7,radius));camera.position.set(target.x+radius*Math.sin(phi)*Math.sin(theta),target.y+radius*Math.cos(phi),target.z+radius*Math.sin(phi)*Math.cos(theta));camera.lookAt(target)}function setView(v){document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===v));if(v==='port'){theta=Math.PI/2;phi=Math.PI/2}else if(v==='starboard'){theta=-Math.PI/2;phi=Math.PI/2}else if(v==='nose'){theta=0;phi=Math.PI/2}else if(v==='tail'){theta=Math.PI;phi=Math.PI/2}else if(v==='top'){theta=0;phi=.06}else if(v==='iso'){theta=.72;phi=1.16}radius=baseRadius*1.48;target.copy(center);updateCamera()}document.querySelectorAll('[data-view]').forEach(x=>x.onclick=()=>setView(x.dataset.view));canvas.addEventListener('pointerdown',e=>{drag=true;lastX=e.clientX;lastY=e.clientY;moved=0;canvas.setPointerCapture(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;moved+=Math.abs(dx)+Math.abs(dy);theta-=dx*.006;phi-=dy*.006;updateCamera()});canvas.addEventListener('pointerup',e=>{drag=false;if(moved<7)pick(e)});canvas.addEventListener('wheel',e=>{e.preventDefault();radius*=Math.exp(e.deltaY*.001);updateCamera()},{passive:false});const ray=new T.Raycaster,mouse=new T.Vector2,helper=new T.Box3Helper(new T.Box3,0xdde9a7);helper.visible=false;world.add(helper);let selected=null;function pick(e){const r=canvas.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height*2-1));ray.setFromCamera(mouse,camera);select(ray.intersectObjects(root.children,false)[0]?.object||null)}function select(mesh){selected=mesh;helper.visible=!!mesh;if(mesh){helper.box.setFromObject(mesh);const p=mesh.userData;selection.style.display='block';selection.innerHTML=`<b>${p.id}</b>${p.role} · source node ${p.sourceNode}`;selectedCard.innerHTML=`<b>${p.id}</b><br>角色：${p.role}<br>源节点：${p.sourceNode}<br>源网格：${p.sourceMesh}<br>侧区：${p.sourceSideRegion}<br>顶点：${p.vertexCount.toLocaleString()} · 三角形：${p.triangleCount.toLocaleString()}<button id="copyPart">复制部件身份</button>`;setTimeout(()=>copyPart.onclick=()=>navigator.clipboard.writeText(p.id))}else{selection.style.display='none';selectedCard.textContent='点击飞机表面读取稳定部件身份。'}}function applyDoor(name){for(const[id,matrix]of poseMap(poses,name)){const mesh=partById.get(id);if(mesh){mesh.matrix.fromArray(matrix);mesh.matrixAutoUpdate=false}}root.updateMatrixWorld(true);if(selected)helper.box.setFromObject(selected);doorState.textContent=name==='closed'?'关闭':'打开';doorClosed.classList.toggle('active',name==='closed');doorOpen.classList.toggle('active',name==='open');api.sideDoorPose=name}doorClosed.onclick=()=>applyDoor('closed');doorOpen.onclick=()=>applyDoor('open');function visible(){for(const m of root.children)m.visible=m.userData.role==='skin_surface'?showSkin.checked:m.userData.role==='fit_surface_reference'?showFit.checked:showOpenings.checked}showSkin.onchange=showFit.onchange=showOpenings.onchange=visible;wireframe.onchange=e=>skinMat.wireframe=fitMat.wireframe=openingMat.wireframe=e.target.checked;skinColor.oninput=e=>skinMat.color.set(e.target.value);roughness.oninput=e=>skinMat.roughness=+e.target.value;mobilePanel.onclick=()=>panel.classList.toggle('open');function resize(){const r=stage.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix()}new ResizeObserver(resize).observe(stage);resize();updateCamera();const api={ready:true,manifest,poses,root,sideDoorPose:'closed',setDoorPose:applyDoor,setView,selectPart:id=>select(partById.get(id)||null),getState:()=>({parts:root.children.length,visible:root.children.filter(x=>x.visible).length,sideDoorPose:api.sideDoorPose,bounds:b,geometrySHA256:digest,externalAssetRequests:0})};window.__B24_SKIN_WORKBENCH__=api;partCount.textContent=manifest.counts.parts.toLocaleString();triangleCount.textContent=manifest.counts.triangles.toLocaleString();span.textContent=b.size[0].toFixed(3)+' m';dataSize.textContent=(geometry.byteLength/1048576).toFixed(2)+' MB';geometryHash.textContent=digest;setLoad(100,'静态蒙皮数据已就绪','关闭双侧门 · 无动画 · 无外部资产');setTimeout(()=>loading.remove(),250);function frame(){requestAnimationFrame(frame);renderer.render(world,camera)}frame()}catch(e){console.error(e);loadText.textContent='工作台启动失败';loadDetail.className='error';loadDetail.textContent=String(e.stack||e);window.__B24_SKIN_WORKBENCH__={ready:false,error:String(e)}}})();
</script></body></html>'''


def build_html(runtime: Path, manifest: dict[str, Any], poses: dict[str, Any], geometry: bytes) -> str:
    values = {
        "__CORE__": gz_b64((runtime / "vendor/three.core.js").read_bytes()),
        "__MODULE__": gz_b64((runtime / "vendor/three.module.js").read_bytes()),
        "__MANIFEST__": gz_b64(json.dumps(manifest, separators=(",", ":"), ensure_ascii=False).encode()),
        "__POSES__": gz_b64(json.dumps(poses, separators=(",", ":"), ensure_ascii=False).encode()),
        "__GEOMETRY__": gz_b64(geometry),
    }
    html = HTML_TEMPLATE
    for key, value in values.items():
        html = html.replace(key, value)
    if "https://" in html or "http://" in html or "src=\"./" in html or "href=\"./" in html:
        raise RuntimeError("Generated single-file workbench contains a network dependency")
    return html


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--reference-runtime", type=Path, required=True)
    parser.add_argument("--pose-file", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    manifest, poses, geometry, report = reconstruct(args.reference_runtime, args.pose_file)
    html = build_html(args.reference_runtime, manifest, poses, geometry)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(html, encoding="utf-8")
    report.update({"htmlBytes": args.out.stat().st_size, "htmlSHA256": sha256(args.out.read_bytes()),
                   "singleHTML": True, "embeddedThreeRevision": "180"})
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
