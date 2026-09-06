"""Renderer-independent visual inspection state, not a functional weapon simulator.

Coordinates and event parameters have presentation semantics only. No mesh, UV,
image, fabrication dimensions or real-world ballistic/operating data is stored.
"""
from dataclasses import dataclass
from math import floor, isfinite, sqrt
from hashlib import sha256
from copy import deepcopy
import json
import re

SCHEMA = 'wm.native.inspection/1'
AXIS_CONVENTION = 'native: X forward, Y up, Z right-handed; Blender: (x,-z,y)'


def number(value):
    if type(value) not in (float, int) or not isfinite(value):
        raise ValueError('Expected a finite number, not bool or coercible text')
    return float(value)


def vector(value, size=3):
    if type(value) not in (list, tuple) or len(value) != size:
        raise ValueError(f'Expected {size} explicit components')
    return tuple(number(v) for v in value)


def identifier(value):
    if not isinstance(value, str) or not re.fullmatch(r'[a-z][a-z0-9_.-]{0,79}', value):
        raise ValueError('Invalid semantic identifier')
    return value


def ratio(value):
    v = number(value)
    if not 0 <= v <= 1:
        raise ValueError('Expected ratio in [0,1]')
    return v


def native_to_blender(value):
    """The sole display-coordinate adapter. Proper rotation, not a reflection."""
    x, y, z = vector(value)
    return (x, -z, y)


def blender_to_native(value):
    x, y, z = vector(value)
    return (x, z, -y)


def _rotation(q):
    x, y, z, w = vector(q, 4)
    if abs(sqrt(x*x+y*y+z*z+w*w)-1) > 1e-9:
        raise ValueError('Rest quaternion must be normalized; no hidden repair')
    return (
        (1-2*y*y-2*z*z, 2*x*y-2*z*w, 2*x*z+2*y*w),
        (2*x*y+2*z*w, 1-2*x*x-2*z*z, 2*y*z-2*x*w),
        (2*x*z-2*y*w, 2*y*z+2*x*w, 1-2*x*x-2*y*y),
    )


def _matrix(position, quaternion):
    r = _rotation(quaternion)
    return tuple(tuple(r[i][j] for j in range(3))+(position[i],) for i in range(3))+((0.,0.,0.,1.),)


def _multiply(a,b):
    return tuple(tuple(sum(a[i][k]*b[k][j] for k in range(4)) for j in range(4)) for i in range(4))


def transform_point(matrix, point):
    p = vector(point)+(1.,)
    return tuple(sum(matrix[i][k]*p[k] for k in range(4)) for i in range(3))


@dataclass(frozen=True)
class Part:
    """Presentation group, not an instruction for physically disassembling a device."""
    id: str
    parent: str | None
    surface: str
    rest: tuple = (0.,0.,0.)
    rotation: tuple = (0.,0.,0.,1.)
    spread: tuple = (0.,0.,0.)

    def __post_init__(self):
        identifier(self.id); identifier(self.surface)
        if self.parent is not None:
            identifier(self.parent)
        for key, n in [('rest',3),('spread',3),('rotation',4)]:
            object.__setattr__(self, key, vector(getattr(self,key),n))
        _rotation(self.rotation)


@dataclass(frozen=True, init=False)
class Assembly:
    """Frozen part relations. Every pose is evaluated from rest, never last frame."""
    root: str
    parts: tuple
    ids: tuple
    surfaces: tuple
    signature: str

    def __init__(self, parts):
        supplied = tuple(parts)
        if not supplied or len(supplied)>2048 or not all(isinstance(p, Part) for p in supplied):
            raise ValueError('Expected 1 to 2048 Part definitions')
        by_id = {p.id:p for p in supplied}
        if len(by_id)!=len(supplied):
            raise ValueError('Duplicate part identifier')
        roots = [p for p in supplied if p.parent is None]
        if len(roots)!=1:
            raise ValueError('Exactly one semantic root required')
        object.__setattr__(self, 'root', roots[0].id)
        r=roots[0]
        if r.rest!=(0.,0.,0.) or r.rotation!=(0.,0.,0.,1.) or r.spread!=(0.,0.,0.):
            raise ValueError('Native root stays identity; use the one display adapter')
        for p in supplied:
            if p.parent is not None and p.parent not in by_id:
                raise ValueError('Missing parent: '+p.parent)
        pending=dict(by_id);ordered=[]
        while pending:
            resolved={p.id for p in ordered}
            step=sorted((p for p in pending.values() if p.parent is None or p.parent in resolved),key=lambda p:p.id)
            if not step:
                raise ValueError('Cyclic part graph')
            for p in step:
                ordered.append(p);del pending[p.id]
        object.__setattr__(self, 'parts', tuple(ordered))
        object.__setattr__(self, 'ids', tuple(p.id for p in self.parts))
        object.__setattr__(self, 'surfaces', tuple(sorted({p.surface for p in self.parts})))
        payload=[{'id':p.id,'parent':p.parent,'surface':p.surface,'rest':p.rest,'rotation':p.rotation,'spread':p.spread} for p in self.parts]
        object.__setattr__(self, 'signature', sha256(json.dumps(payload,sort_keys=True,separators=(',',':')).encode()).hexdigest())

    def evaluate(self, amount):
        t=ratio(amount);s=t*t*(3-2*t)
        result={}
        for p in self.parts:
            position=p.rest if t==0 else tuple(v+s*d for v,d in zip(p.rest,p.spread))
            local=_matrix(position,p.rotation)
            world=local if p.parent is None else _multiply(result[p.parent]['world'],local)
            result[p.id]={'local':local,'world':world}
        return result

    def effective_visibility(self, hidden, solo=None):
        h=set(hidden)
        if not h.issubset(self.ids) or solo is not None and solo not in self.ids:
            raise ValueError('Unknown visual part')
        solo_family=set()
        if solo is not None:
            for p in self.parts:
                if p.id==solo or p.parent in solo_family:solo_family.add(p.id)
        ancestry={};result={}
        for p in self.parts:
            ancestry[p.id]=p.id not in h and (p.parent is None or ancestry[p.parent])
            # Ancestor coordinate groups remain traversable for a solo descendant.
            result[p.id]=ancestry[p.id] and (solo is None or p.id in solo_family)
        return result


MATERIAL_KEYS=('roughness','metallic','coat','detail')
DEFAULT_MATERIAL={'roughness':.5,'metallic':.8,'coat':0.,'detail':.4}

def _material(value):
    if type(value) is not dict or set(value)!=set(MATERIAL_KEYS):
        raise ValueError('Explicit material control schema required')
    return {k:ratio(value[k]) for k in MATERIAL_KEYS}


@dataclass(frozen=True)
class Demo:
    """Bounded decorative event track. Period and life are authored UI values."""
    duration: float=6.
    period: float=.4
    life: float=.7
    accent_every: int=5
    capacity: int=8

    def __post_init__(self):
        for key in ('duration','period','life'):
            object.__setattr__(self,key,number(getattr(self,key)))
        if not 0<self.duration<=3600 or not .01<=self.period<=60 or not .01<=self.life<=60:
            raise ValueError('Demo time limits exceeded')
        if type(self.accent_every) is not int or not 1<=self.accent_every<=100:
            raise ValueError('Invalid accent interval')
        if type(self.capacity) is not int or not 1<=self.capacity<=64:
            raise ValueError('Invalid visual event capacity')

    def events(self, time):
        t=number(time)
        if not 0<=t<=self.duration:raise ValueError('Time outside demo')
        if t==self.duration:return ()  # complete playback never freezes leftover effects
        # Event indices begin at 1; interval i begins exactly at i*period.
        last=floor(min(t,self.duration-1e-10)/self.period+1e-10)
        first=max(1,last-self.capacity+1)
        result=[]
        for i in range(first,last+1):
            age=t-i*self.period
            if -1e-10<=age<self.life-1e-10:
                result.append({'index':i,'age':max(0.,age),'accent':i%self.accent_every==0})
        return tuple(result)


class Session:
    """Single-writer view state. Restore is fully checked before any state changes."""
    def __init__(self, assembly, recipe_hash, demo=Demo(), materials=None, locked_surfaces=()):
        if not isinstance(assembly,Assembly) or not isinstance(demo,Demo):
            raise ValueError('Expected Assembly and Demo')
        if not isinstance(recipe_hash,str) or not re.fullmatch('[0-9a-f]{64}',recipe_hash):
            raise ValueError('Recipe identity is required')
        locks=frozenset(locked_surfaces)
        if not locks.issubset(assembly.surfaces):raise ValueError('Unknown locked surface')
        profiles={k:dict(DEFAULT_MATERIAL) for k in assembly.surfaces} if materials is None else materials
        if type(profiles) is not dict or set(profiles)!=set(assembly.surfaces):
            raise ValueError('Surface set mismatch')
        self.assembly=assembly;self.recipe_hash=recipe_hash;self.demo=demo;self.locked=locks
        self._initial={k:_material(v) for k,v in profiles.items()}
        self._state=self._fresh()

    def _fresh(self):
        return {'spread':0.,'time':0.,'speed':1.,'hidden':[], 'solo':None,'selected':None,'materials':deepcopy(self._initial)}

    @property
    def playing(self):return getattr(self,'_playing',False)

    def state(self):return deepcopy(self._state)

    def select(self,part):
        if part is not None and part not in self.assembly.ids:raise ValueError('Unknown part')
        self._state['selected']=part

    def set_hidden(self,part,hidden):
        if part not in self.assembly.ids or type(hidden) is not bool:raise ValueError('Invalid visibility edit')
        new=set(self._state['hidden'])
        if hidden:new.add(part)
        else:new.discard(part)
        self._state['hidden']=sorted(new)

    def solo(self,part):
        if part is not None and part not in self.assembly.ids:raise ValueError('Unknown part')
        self._state['solo']=part

    def set_spread(self,value):
        v=ratio(value)
        if v>0:self._playing=False
        self._state['spread']=v

    def play(self):
        if self._state['spread']>0:raise ValueError('Close visual spread before starting demonstration')
        if self._state['time']>=self.demo.duration:self._state['time']=0.
        self._playing=True

    def pause(self):self._playing=False

    def seek(self,value):
        t=number(value)
        if not 0<=t<=self.demo.duration:raise ValueError('Seek outside demo')
        self._state['time']=t;self._playing=False

    def set_speed(self,value):
        speed=number(value)
        if not .1<=speed<=2:raise ValueError('Invalid presentation speed')
        self._state['speed']=speed

    def advance(self,delta):
        dt=number(delta)
        if not 0<=dt<=60:raise ValueError('Invalid elapsed time')
        if self.playing:
            self._state['time']=min(self.demo.duration,self._state['time']+dt*self._state['speed'])
            if self._state['time']>=self.demo.duration:self._playing=False
        return self.frame()

    def frame(self):
        s=self._state
        return {'pose':self.assembly.evaluate(s['spread']),
                'visible':self.assembly.effective_visibility(s['hidden'],s['solo']),
                'events':() if s['spread']>0 else self.demo.events(s['time']),
                'time':s['time'],'playing':self.playing}

    def edit_material(self,surface,values):
        if surface not in self.assembly.surfaces:raise ValueError('Unknown surface')
        if surface in self.locked:raise ValueError('Evidence-locked surface is read-only')
        checked=_material(values)
        self._state['materials'][surface]=checked

    def reset(self):
        self._state=self._fresh();self._playing=False

    def snapshot(self):
        return {'schema':SCHEMA,'recipeHash':self.recipe_hash,'assemblyHash':self.assembly.signature,'state':self.state()}

    def restore(self,snapshot):
        if type(snapshot) is not dict or set(snapshot)!= {'schema','recipeHash','assemblyHash','state'}:
            raise ValueError('Snapshot envelope mismatch')
        if snapshot['schema']!=SCHEMA or snapshot['recipeHash']!=self.recipe_hash or snapshot['assemblyHash']!=self.assembly.signature:
            raise ValueError('Snapshot belongs to another recipe or assembly')
        v=deepcopy(snapshot['state'])
        if type(v) is not dict or set(v)!=set(self._fresh()):raise ValueError('State schema mismatch')
        v['spread']=ratio(v['spread']);v['time']=number(v['time']);v['speed']=number(v['speed'])
        if not 0<=v['time']<=self.demo.duration or not .1<=v['speed']<=2:raise ValueError('Invalid time/speed')
        if type(v['hidden']) is not list or any(not isinstance(x,str) for x in v['hidden']) or len(set(v['hidden']))!=len(v['hidden']):
            raise ValueError('Hidden list mismatch')
        self.assembly.effective_visibility(v['hidden'],v['solo'])
        if v['selected'] is not None and v['selected'] not in self.assembly.ids:raise ValueError('Unknown selected part')
        if type(v['materials']) is not dict or set(v['materials'])!=set(self.assembly.surfaces):raise ValueError('Surface set mismatch')
        v['materials']={k:_material(p) for k,p in v['materials'].items()}
        for k in self.locked:
            if v['materials'][k]!=self._state['materials'][k]:raise ValueError('Snapshot changes evidence-locked surface')
        v['hidden']=sorted(v['hidden'])
        self._state=v;self._playing=False  # importing never starts animation automatically
