"""Read-only identity/inventory intake; does not export geometry or grant approval."""
import argparse
import hashlib
import json
from pathlib import Path
import struct

ROOT = Path(__file__).resolve().parents[1]


def verify(path):
    expected = json.loads((ROOT / 'CURRENT.json').read_text(encoding='utf-8'))['referenceInput']
    if not path.is_file():
        raise ValueError('Reference file not found')
    if path.name not in [expected['fileName'], *expected.get('acceptedFileNames', [])]:
        raise ValueError('Reference filename mismatch')
    if path.stat().st_size != expected['bytes']:
        raise ValueError('Reference byte count mismatch')
    data = path.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    if digest != expected['sha256']:
        raise ValueError('Reference SHA-256 mismatch')
    magic, version, total = struct.unpack_from('<4sII', data)
    if magic != b'glTF' or version != 2 or total != len(data):
        raise ValueError('Invalid GLB header')
    length, kind = struct.unpack_from('<II', data, 12)
    if kind != 0x4E4F534A or 20 + length > total:
        raise ValueError('Invalid GLB JSON chunk')
    doc = json.loads(data[20:20 + length])
    counts = {key: len(doc.get(key, [])) for key in
              ('nodes', 'meshes', 'accessors', 'images', 'animations')}
    if counts != dict(nodes=28, meshes=13, accessors=51, images=0, animations=0):
        raise ValueError('Reference inventory mismatch')
    return dict(identityVerified=True, sha256=digest, bytes=len(data), inventory=counts,
                actualReferenceVisualReview=False, geometryParityAccepted=False,
                productionReady=False)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('reference', type=Path)
    args = parser.parse_args()
    try:
        result = verify(args.reference)
    except (ValueError, OSError, struct.error) as exc:
        print(json.dumps(dict(identityVerified=False, reason=str(exc))))
        return 2
    print(json.dumps(result, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
