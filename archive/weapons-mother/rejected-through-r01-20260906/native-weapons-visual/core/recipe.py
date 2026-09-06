"""Rule-only visual fixture. No source asset imports, stored mesh, or real weapon dimensions."""
from dataclasses import dataclass
from math import cos, sin, pi, isfinite
from hashlib import sha256
import json


def finite(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not isfinite(value):
        raise ValueError('Expected a finite number')
    return float(value)


@dataclass(frozen=True)
class Coupon:
    """Neutral rounded material coupon in arbitrary scene units; never a gun substitute."""
    width: float = 3.0
    height: float = 2.0
    depth: float = 0.2
    radius: float = 0.18
    corner_steps: int = 6

    def validate(self):
        w, h, d, r = (finite(v) for v in (self.width, self.height, self.depth, self.radius))
        if min(w, h, d, r) <= 0 or r >= min(w, h) / 2:
            raise ValueError('Invalid coupon proportions')
        if type(self.corner_steps) is not int or not 2 <= self.corner_steps <= 64:
            raise ValueError('Corner sampling out of bounds')
        return self


def evaluate(recipe):
    """Transient generated coordinates; never serialize the return value as an asset."""
    recipe.validate()
    w, h, r = recipe.width / 2, recipe.height / 2, recipe.radius
    ring = []
    for k, (x, y) in enumerate(((w-r, h-r), (-w+r, h-r), (-w+r, -h+r), (w-r, -h+r))):
        for i in range(recipe.corner_steps + 1):
            a = (k + i / recipe.corner_steps) * pi / 2
            ring.append((x + r*cos(a), y + r*sin(a)))
    n = len(ring)
    points = [(x, y, z) for z in (-recipe.depth/2, recipe.depth/2) for x, y in ring]
    faces = [tuple(reversed(range(n))), tuple(range(n, 2*n))]
    faces += [(i, (i+1) % n, (i+1) % n+n, i+n) for i in range(n)]
    return points, faces


def signature(recipe):
    # Hash-only evidence, no persisted generated coordinates.
    pts, faces = evaluate(recipe)
    quantized = [[round(v, 12) for v in p] for p in pts]
    return sha256(json.dumps([quantized, faces], separators=(',', ':')).encode()).hexdigest()


def presentation_pose(rest, offset, amount):
    """Absolute presentation spread; no accumulating deltas, no disassembly instructions."""
    if len(rest) != 3 or len(offset) != 3:
        raise ValueError('Expected three components')
    t = finite(amount)
    if not 0 <= t <= 1:
        raise ValueError('Presentation amount out of range')
    r, o = tuple(map(finite, rest)), tuple(map(finite, offset))
    if t == 0:
        return r
    s = t*t*(3-2*t)
    return tuple(a+b*s for a, b in zip(r, o))


def roughness(local_position, base=0.45, amplitude=0.04, frequency=32.0):
    """Deterministic analytic field in per-part rest coordinates; no image lookup."""
    if len(local_position) != 3:
        raise ValueError('Expected three components')
    x, _, _ = tuple(map(finite, local_position))
    b, a, f = map(finite, (base, amplitude, frequency))
    if not 0 <= b <= 1 or not 0 <= a <= 0.2 or not 0 < f <= 1000:
        raise ValueError('Material parameters out of range')
    return min(1.0, max(0.0, b+a*sin(x*f)))
