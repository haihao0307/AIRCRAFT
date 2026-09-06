"""Independent analytic surface study, with no model or image lookup.

All lengths are fractions of one declared reference span in part-rest coordinates.
Parameters below are authored study values, not measurements of a historic finish.
This sparse spectral field is our new approximation, not Blender/Adobe Perlin parity.
"""
from dataclasses import dataclass
from hashlib import sha256
from math import sin, cos, pi, sqrt, exp, isfinite
import json

VERSION = 'aircraft.surface-study/1'
SEED_VERSION = 'sha256-labels-v1'


def finite(x):
    if type(x) not in (int, float) or not isfinite(x):
        raise ValueError('Expected finite numeric value')
    return float(x)


def unit(x):
    x = finite(x)
    if not 0 <= x <= 1:
        raise ValueError('Expected [0,1]')
    return x


def vec(x):
    if not isinstance(x, (tuple, list)) or len(x) != 3:
        raise ValueError('Expected three rest-space coordinates')
    return tuple(finite(v) for v in x)


@dataclass(frozen=True)
class Field:
    process: str
    wavelength_ratio: float
    bands: int = 5
    anisotropy: tuple = (1., 1., 1.)

    def __post_init__(self):
        if not self.process or len(self.process) > 100:
            raise ValueError('Stable process label required')
        if not 0 < finite(self.wavelength_ratio) <= 1:
            raise ValueError('Wavelength is a fraction of reference span')
        if type(self.bands) is not int or not 1 <= self.bands <= 12:
            raise ValueError('Finite spectral budget required')
        a = vec(self.anisotropy)
        if not all(0 < x <= 1 for x in a):
            raise ValueError('Invalid axis frequency multipliers')
        object.__setattr__(self, 'anisotropy', a)


FIELDS = (
    Field('finish_tint', .23, 5),
    Field('surface_grain', .027, 6),
    Field('micro_relief', .0045, 6),
    Field('film_variation', .16, 4),
)


@dataclass(frozen=True)
class Recipe:
    entity: str
    master_seed: int = 20260906
    base_linear: tuple = (.10, .12, .14)
    base_roughness: float = .46
    grain_amplitude: float = .055
    relief_ratio: float = .000018
    film_coverage: float = 0.
    film_weight: float = .35

    def __post_init__(self):
        if not isinstance(self.entity, str) or not self.entity or len(self.entity) > 160:
            raise ValueError('Stable entity label required')
        if type(self.master_seed) is not int or not 0 <= self.master_seed < 2**32:
            raise ValueError('Unsigned 32-bit seed required')
        color = vec(self.base_linear)
        for x in color: unit(x)
        object.__setattr__(self, 'base_linear', color)
        for key in ('base_roughness', 'grain_amplitude', 'film_coverage', 'film_weight'):
            unit(getattr(self, key))
        if not 0 <= finite(self.relief_ratio) <= .001:
            raise ValueError('This study only permits shallow surface relief')


def modes(recipe, field):
    """Generate compact wave coefficients from labelled seeds, never from a source map."""
    result = []
    for i in range(field.bands):
        key = json.dumps([VERSION, SEED_VERSION, recipe.master_seed, recipe.entity,
                          field.process, i], ensure_ascii=False, separators=(',', ':'))
        b = sha256(key.encode()).digest()
        v = [2*int.from_bytes(b[j:j+4], 'big')/(2**32-1)-1 for j in (0,4,8)]
        length = sqrt(sum(x*x for x in v))
        if length < 1e-12: raise ValueError('Degenerate derived direction')
        frequency = (.82 + .36*int.from_bytes(b[12:16], 'big')/(2**32-1))/field.wavelength_ratio
        k = tuple(v[j]/length*frequency*field.anisotropy[j] for j in range(3))
        phase = 2*pi*int.from_bytes(b[16:20], 'big')/(2**32-1)
        result.append((k, phase, 1/field.bands))
    return tuple(result)


def sampled_field(recipe, field, p, footprint_sigma=0.):
    """Gaussian footprint filtering is exact for each linear sinusoidal component.
    It is not a proof that the nonlinear PBR response is alias-free.
    """
    p = vec(p); sigma = finite(footprint_sigma)
    if sigma < 0 or sigma > 1: raise ValueError('Invalid footprint ratio')
    value = 0.; gradient = [0.,0.,0.]
    for k, phase, weight in modes(recipe, field):
        filt = exp(-2*pi*pi*sigma*sigma*sum(v*v for v in k))
        a = 2*pi*sum(x*y for x,y in zip(k,p)) + phase
        value += weight*filt*sin(a)
        for j in range(3): gradient[j] += weight*filt*cos(a)*2*pi*k[j]
    return value, tuple(gradient)


def evaluate(recipe, p, footprint_sigma=0.):
    values = {f.process: sampled_field(recipe, f, p, footprint_sigma) for f in FIELDS}
    tint = values['finish_tint'][0]
    grain = values['surface_grain'][0]
    height, gradient = values['micro_relief']
    film = recipe.film_coverage*(.7+.3*values['film_variation'][0])
    return {
        'base_linear': tuple(min(1.,max(0.,c*(1+.04*tint))) for c in recipe.base_linear),
        'roughness': min(.98,max(.08,recipe.base_roughness+recipe.grain_amplitude*grain-.10*film)),
        'coat_weight': recipe.film_weight*film,
        'height_ratio': recipe.relief_ratio*height,
        'height_gradient': tuple(recipe.relief_ratio*v for v in gradient),
        'film_mask': film,
    }


def compile_blender(recipe, local_reference_span, footprint_sigma=0., micro_enabled=True):
    """Compile the same analytic fields into Blender nodes. No raster bake or export.
    The footprint is explicit/fixed for this study, not a live camera derivative.
    """
    import bpy
    span = finite(local_reference_span)
    sigma = finite(footprint_sigma)
    if span <= 0 or not 0 <= sigma <= 1: raise ValueError('Bad scale/filter input')
    mat = bpy.data.materials.new('study.'+recipe.entity)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes; links = mat.node_tree.links; nodes.clear()
    def math(op, a, b=None):
        n = nodes.new('ShaderNodeMath'); n.operation = op
        for i,v in enumerate((a,b)):
            if v is None: continue
            if isinstance(v,(int,float)): n.inputs[i].default_value = v
            else: links.new(v,n.inputs[i])
        return n.outputs[0]
    coord = nodes.new('ShaderNodeTexCoord')
    normalize = nodes.new('ShaderNodeVectorMath'); normalize.operation='SCALE'
    links.new(coord.outputs['Object'],normalize.inputs[0]);normalize.inputs['Scale'].default_value=1/span
    def field_socket(field):
        total = None
        for k,phase,weight in modes(recipe,field):
            dot = nodes.new('ShaderNodeVectorMath');dot.operation='DOT_PRODUCT'
            links.new(normalize.outputs[0],dot.inputs[0]);dot.inputs[1].default_value=k
            a = math('ADD',math('MULTIPLY',dot.outputs['Value'],2*pi),phase)
            filt=exp(-2*pi*pi*sigma*sigma*sum(v*v for v in k))
            w=math('MULTIPLY',math('SINE',a),weight*filt)
            total=w if total is None else math('ADD',total,w)
        return total
    fields={f.process:field_socket(f) for f in FIELDS}
    output=nodes.new('ShaderNodeOutputMaterial');bsdf=nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Metallic'].default_value=1.
    bsdf.inputs['Coat Roughness'].default_value=.20
    tint=math('ADD',1.,math('MULTIPLY',fields['finish_tint'],.04))
    color=nodes.new('ShaderNodeCombineXYZ')
    for i,c in enumerate(recipe.base_linear):links.new(math('MINIMUM',1.,math('MAXIMUM',0.,math('MULTIPLY',tint,c))),color.inputs[i])
    links.new(color.outputs[0],bsdf.inputs['Base Color'])
    film=math('MULTIPLY',math('ADD',.7,math('MULTIPLY',fields['film_variation'],.3)),recipe.film_coverage)
    rough=math('SUBTRACT',math('ADD',recipe.base_roughness,math('MULTIPLY',fields['surface_grain'],recipe.grain_amplitude)),math('MULTIPLY',film,.10))
    rough=math('MINIMUM',.98,math('MAXIMUM',.08,rough));links.new(rough,bsdf.inputs['Roughness'])
    links.new(math('MULTIPLY',film,recipe.film_weight),bsdf.inputs['Coat Weight'])
    bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=1 if micro_enabled else 0
    bump.inputs['Distance'].default_value=span*recipe.relief_ratio
    links.new(fields['micro_relief'],bump.inputs['Height']);links.new(bump.outputs['Normal'],bsdf.inputs['Normal'])
    links.new(bsdf.outputs[0],output.inputs['Surface'])
    mat['study_only']=True;mat['generator_version']=VERSION;mat['rest_span_is_physical_measurement']=False
    mat['node_budget']=len(nodes);mat['footprint_is_fixed_study_input']=True
    return mat
