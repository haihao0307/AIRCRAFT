#!/usr/bin/env python3
"""Read-only GLB accessor audit. Geometry is not reconstructed or exported.
A required, independently supplied hash prevents promoting a different asset by accident.
Supported scope: embedded uncompressed buffer, dense scalar/vector accessors.
Sparse/matrix/compressed cases fail explicitly rather than silently losing data.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct


def sha(data):
    return hashlib.sha256(data).hexdigest()


def audit(path, expected_sha256):
    data = Path(path).read_bytes()
    if sha(data) != expected_sha256:
        raise ValueError('Source SHA-256 mismatch')
    if len(data) < 20:
        raise ValueError('Truncated GLB')
    magic, version, total = struct.unpack_from('<4sII', data)
    if magic != b'glTF' or version != 2 or total != len(data):
        raise ValueError('Invalid GLB header')
    offset, chunks = 12, {}
    while offset < total:
        if offset + 8 > total:
            raise ValueError('Truncated chunk header')
        length, kind = struct.unpack_from('<II', data, offset)
        offset += 8
        if length % 4 or offset + length > total or kind in chunks:
            raise ValueError('Invalid chunk')
        chunks[kind] = data[offset:offset + length]
        offset += length
    doc = json.loads(chunks[0x4E4F534A])
    blob = chunks.get(0x004E4942, b'')
    if doc.get('extensionsRequired'):
        raise ValueError('Required extensions are outside this audit scope')
    buffers = doc.get('buffers', [])
    if len(buffers) != 1 or 'uri' in buffers[0] or buffers[0]['byteLength'] > len(blob):
        raise ValueError('Expected one embedded buffer')
    components = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}
    widths = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}
    roles = {i: [] for i in range(len(doc.get('accessors', [])))}
    for mi, mesh in enumerate(doc.get('meshes', [])):
        for pi, primitive in enumerate(mesh['primitives']):
            for semantic, index in primitive.get('attributes', {}).items():
                roles[index].append({'mesh': mi, 'primitive': pi, 'semantic': semantic})
            if 'indices' in primitive:
                roles[primitive['indices']].append({'mesh': mi, 'primitive': pi, 'semantic': 'INDICES'})
    results = []
    for i, a in enumerate(doc.get('accessors', [])):
        if 'sparse' in a or a['type'] not in widths or 'bufferView' not in a:
            raise ValueError(f'Unsupported accessor layout at {i}')
        view = doc['bufferViews'][a['bufferView']]
        if view.get('buffer', 0) != 0 or view.get('extensions'):
            raise ValueError('Unsupported buffer view')
        scalar = components[a['componentType']]
        element = scalar * widths[a['type']]
        stride = view.get('byteStride', element)
        start = view.get('byteOffset', 0) + a.get('byteOffset', 0)
        count = a['count']
        end = start + (count - 1) * stride + element
        if count <= 0 or stride < element or stride % scalar or start % scalar or a.get('byteOffset', 0) < 0:
            raise ValueError(f'Invalid accessor stride/alignment at {i}')
        if view.get('byteOffset', 0) < 0 or end > view.get('byteOffset', 0) + view['byteLength'] or end > buffers[0]['byteLength']:
            raise ValueError(f'Accessor outside buffer at {i}')
        packed = b''.join(blob[start + j * stride:start + j * stride + element] for j in range(count))
        results.append({'accessor': i, 'componentType': a['componentType'], 'type': a['type'],
                        'count': count, 'normalized': a.get('normalized', False), 'packedBytes': len(packed),
                        'packedSha256': sha(packed), 'roles': roles[i]})
    signature = lambda x: sha(json.dumps(x, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode())
    return {'schema': 'wm.source-audit/1', 'sourceSha256': sha(data), 'sourceBytes': len(data),
            'accessors': results, 'nodeCount': len(doc.get('nodes', [])), 'meshCount': len(doc.get('meshes', [])),
            'nodeGraphSha256': signature({'nodes': doc.get('nodes', []), 'scenes': doc.get('scenes', []), 'scene': doc.get('scene')}),
            'uvSha256': signature([r for r in results if any(x['semantic'].startswith('TEXCOORD_') for x in r['roles'])]),
            'primitiveBindingSha256': signature(doc.get('meshes', [])),
            'materialsSha256': signature(doc.get('materials', [])), 'animationsSha256': signature(doc.get('animations', [])),
            'sourceUnchanged': sha(Path(path).read_bytes()) == sha(data),
            'scope': 'Historical test fixture only. Does not establish R019 parity, procedural understanding or approval.'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--sha256', required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.source.resolve() == args.output.resolve():
        parser.error('Output must not overwrite source')
    result = audit(args.source, args.sha256)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
