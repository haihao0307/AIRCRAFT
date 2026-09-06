"""Neutral-fixture contract tests; not product-rendering or historical-accuracy evidence."""
import sys,unittest,json
from pathlib import Path
from math import sqrt
from dataclasses import FrozenInstanceError,replace
from copy import deepcopy
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'core'))
from inspection import Assembly,Part,Session,Demo,native_to_blender,blender_to_native,transform_point,DEFAULT_MATERIAL


def fixture():
    return Assembly([
        Part('root',None,'base'),
        Part('plate','root','coat',rest=(0,.2,0),spread=(0,1,0)),
        Part('badge','plate','coat',rest=(.3,0,.1),spread=(.3,0,0)),
        Part('support','root','base',rest=(0,-.4,0),spread=(0,-.8,0)),
    ])

def session(**kwargs):return Session(fixture(),'a'*64,**kwargs)

class Coordinates(unittest.TestCase):
    def test_up_direction(self):self.assertEqual(native_to_blender((0,1,0)),(0,0,1))
    def test_forward_unchanged(self):self.assertEqual(native_to_blender((1,0,0)),(1,0,0))
    def test_right_handed(self):
        a=native_to_blender((1,0,0));b=native_to_blender((0,1,0));c=native_to_blender((0,0,1))
        cross=(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
        self.assertEqual(cross,c)
    def test_roundtrip(self):
        for v in [(1.3,-2.4,.5),(0,0,0),(-5,8,12)]:self.assertEqual(blender_to_native(native_to_blender(v)),v)
    def test_bad_vector(self):
        for v in [(1,2),('1',2,3),(float('nan'),0,0),(True,0,0)]:
            with self.assertRaises(ValueError):native_to_blender(v)
    def test_preserves_length(self):
        v=(.6,.8,0);w=native_to_blender(v);self.assertAlmostEqual(sum(x*x for x in v),sum(x*x for x in w))

class Graph(unittest.TestCase):
    def test_input_order_irrelevant(self):
        a=fixture();b=Assembly(reversed(a.parts));self.assertEqual(a.signature,b.signature);self.assertEqual(a.evaluate(.6),b.evaluate(.6))
    def test_duplicate_rejected(self):
        a=fixture()
        with self.assertRaises(ValueError):Assembly([*a.parts,a.parts[1]])
    def test_missing_parent_rejected(self):
        with self.assertRaises(ValueError):Assembly([Part('root',None,'a'),Part('child','absent','a')])
    def test_cycle_rejected(self):
        with self.assertRaises(ValueError):Assembly([Part('root',None,'a'),Part('a','b','a'),Part('b','a','a')])
    def test_self_cycle_rejected(self):
        with self.assertRaises(ValueError):Assembly([Part('root',None,'a'),Part('child','child','a')])
    def test_multiple_roots_rejected(self):
        with self.assertRaises(ValueError):Assembly([Part('root',None,'a'),Part('root2',None,'a')])
    def test_no_root_rejected(self):
        with self.assertRaises(ValueError):Assembly([Part('child','child','a')])
    def test_empty_rejected(self):
        with self.assertRaises(ValueError):Assembly([])
    def test_root_rotation_patch_rejected(self):
        with self.assertRaises(ValueError):Assembly([Part('root',None,'a',rotation=(sqrt(.5),0,0,sqrt(.5)))])
    def test_root_translation_rejected(self):
        with self.assertRaises(ValueError):Assembly([Part('root',None,'a',rest=(1,0,0))])
    def test_root_spread_rejected(self):
        with self.assertRaises(ValueError):Assembly([Part('root',None,'a',spread=(1,0,0))])
    def test_bad_quaternion_rejected(self):
        with self.assertRaises(ValueError):Part('root',None,'a',rotation=(0,0,0,2))
    def test_bad_identifier_rejected(self):
        for name in ['', '../old', 'UPPER', 'a'*90,3]:
            with self.assertRaises(ValueError):Part(name,None,'a')
    def test_no_input_alias(self):
        r=[1,2,3];p=Part('plate','root','a',rest=r);r[0]=5;self.assertEqual(p.rest,(1,2,3))
    def test_parts_frozen(self):
        p=Part('root',None,'a')
        with self.assertRaises(FrozenInstanceError):p.rest=(1,0,0)
    def test_graph_frozen(self):
        a=fixture()
        with self.assertRaises(FrozenInstanceError):a.parts=()
    def test_hierarchy_world_pose(self):
        p=fixture().evaluate(1)
        self.assertEqual(transform_point(p['plate']['world'],(0,0,0)),(0,1.2,0))
        self.assertEqual(transform_point(p['badge']['world'],(0,0,0)),(.6,1.2,.1))
    def test_rotated_parent(self):
        a=Assembly([Part('root',None,'a'),Part('rot','root','a',rotation=(0,0,sqrt(.5),sqrt(.5))),Part('child','rot','a',rest=(1,0,0))])
        x,y,z=transform_point(a.evaluate(0)['child']['world'],(0,0,0))
        self.assertAlmostEqual(x,0);self.assertAlmostEqual(y,1);self.assertAlmostEqual(z,0)
    def test_repeat_rest_exact(self):
        a=fixture();rest=a.evaluate(0)
        for i in range(200):a.evaluate((i%29)/28)
        self.assertEqual(a.evaluate(0),rest)
    def test_time_sampling_independent(self):
        a=fixture();expected=a.evaluate(.7);a.evaluate(.4);a.evaluate(1)
        self.assertEqual(a.evaluate(.7),expected)
    def test_material_does_not_change_graph_signature(self):
        s=session();before=s.assembly.signature;s.edit_material('coat',{**DEFAULT_MATERIAL,'roughness':.7})
        self.assertEqual(s.assembly.signature,before)
    def test_hidden_ancestor_hides_children(self):
        v=fixture().effective_visibility(['plate']);self.assertFalse(v['plate']);self.assertFalse(v['badge']);self.assertTrue(v['support'])
    def test_solo_child_survives_unselected_ancestors(self):
        v=fixture().effective_visibility([],solo='badge');self.assertTrue(v['badge']);self.assertFalse(v['support']);self.assertFalse(v['plate'])
    def test_solo_subtree_includes_descendants(self):
        v=fixture().effective_visibility([],solo='plate');self.assertTrue(v['plate']);self.assertTrue(v['badge']);self.assertFalse(v['root'])
    def test_hidden_overrides_solo(self):self.assertFalse(fixture().effective_visibility(['plate'],solo='badge')['badge'])
    def test_unknown_visibility_rejected(self):
        with self.assertRaises(ValueError):fixture().effective_visibility(['typo'])

class DemoState(unittest.TestCase):
    def test_fifth_event_is_accent(self):
        d=Demo(duration=7,period=.2,life=.01)
        accents=[]
        for i in range(1,21):
            events=d.events(i*.2);self.assertEqual(len(events),1)
            if events[0]['accent']:accents.append(events[0]['index'])
        self.assertEqual(accents,[5,10,15,20])
    def test_bounded_event_pool(self):
        d=Demo(duration=8,period=.01,life=5,capacity=8)
        for i in range(801):self.assertLessEqual(len(d.events(i*.01)),8)
    def test_no_accumulated_event_objects(self):
        d=Demo();a=d.events(3.7);d.events(.5);self.assertEqual(d.events(3.7),a)
    def test_begin_and_end_clear(self):
        d=Demo();self.assertEqual(d.events(0),());self.assertEqual(d.events(d.duration),())
    def test_initially_paused(self):self.assertFalse(session().playing)
    def test_pause_freezes_time(self):
        s=session();s.play();s.advance(.9);s.pause();before=s.frame();s.advance(1.7);self.assertEqual(s.frame(),before)
    def test_play_advances(self):
        s=session();s.play();s.advance(.5);self.assertEqual(s.state()['time'],.5)
    def test_visual_spread_pauses_and_hides_effects(self):
        s=session();s.play();s.advance(.5);self.assertTrue(s.frame()['events']);s.set_spread(.2)
        self.assertFalse(s.playing);self.assertEqual(s.frame()['events'],())
        with self.assertRaises(ValueError):s.play()
    def test_close_does_not_autoplay(self):
        s=session();s.set_spread(1);s.set_spread(0);self.assertFalse(s.playing)
    def test_seek_pauses(self):
        s=session();s.play();s.seek(.9);self.assertFalse(s.playing);self.assertEqual(s.state()['time'],.9)
    def test_speed_only_changes_clock(self):
        s=session();pose=s.frame()['pose'];s.set_speed(.5);s.play();s.advance(1);self.assertEqual(s.state()['time'],.5);self.assertEqual(s.frame()['pose'],pose)
    def test_step_size_equivalence(self):
        a=session();b=session();a.play();b.play();a.advance(2)
        for _ in range(20):b.advance(.1)
        self.assertAlmostEqual(a.state()['time'],b.state()['time'])
        self.assertEqual([e['index'] for e in a.frame()['events']],[e['index'] for e in b.frame()['events']])
    def test_replay_and_end(self):
        s=session();s.play();s.advance(8);self.assertFalse(s.playing);self.assertEqual(s.frame()['events'],());s.play();self.assertEqual(s.state()['time'],0);self.assertTrue(s.playing)
    def test_reset_clears_every_display_state(self):
        s=session();baseline=s.snapshot();s.set_spread(.5);s.select('plate');s.solo('plate');s.set_hidden('support',True);s.set_speed(.5);s.seek(3);s.edit_material('coat',{**DEFAULT_MATERIAL,'roughness':.8});s.reset()
        self.assertEqual(s.snapshot(),baseline);self.assertFalse(s.playing)
    def test_invalid_clock_delta_atomic(self):
        for v in [-.1,61,float('nan'),True,'0.2']:
            s=session();s.play();before=s.snapshot()
            with self.assertRaises(ValueError):s.advance(v)
            self.assertEqual(s.snapshot(),before)
    def test_invalid_seek_atomic(self):
        s=session();before=s.snapshot()
        for t in [-1,7,float('inf'),True]:
            with self.assertRaises(ValueError):s.seek(t)
            self.assertEqual(s.snapshot(),before)
    def test_demo_parameter_validation(self):
        for kw in [{'capacity':0},{'accent_every':True},{'period':0},{'duration':float('nan')},{'life':-1}]:
            with self.assertRaises(ValueError):Demo(**kw)

class Snapshots(unittest.TestCase):
    def test_roundtrip_restores_and_pauses(self):
        a=session();a.set_hidden('support',True);a.seek(2);a.select('badge');a.play();saved=json.loads(json.dumps(a.snapshot()))
        b=session();b.restore(saved);self.assertEqual(b.snapshot(),a.snapshot());self.assertFalse(b.playing)
    def test_output_copy_does_not_mutate(self):
        s=session();v=s.state();v['materials']['coat']['roughness']=.1;v['hidden'].append('plate')
        self.assertEqual(s.state()['materials']['coat']['roughness'],.5);self.assertEqual(s.state()['hidden'],[])
    def test_input_copy_does_not_mutate(self):
        s=session();v=s.snapshot();s.restore(v);v['state']['materials']['coat']['roughness']=.1
        self.assertEqual(s.state()['materials']['coat']['roughness'],.5)
    def test_recipe_mismatch_rejected(self):
        s=session();v=s.snapshot();v['recipeHash']='b'*64
        with self.assertRaises(ValueError):s.restore(v)
    def test_assembly_change_rejected(self):
        s=session();v=s.snapshot();other=Assembly([Part('root',None,'base')]);t=Session(other,'a'*64)
        with self.assertRaises(ValueError):t.restore(v)
    def test_schema_change_rejected(self):
        s=session();v=s.snapshot();v['schema']='old'
        with self.assertRaises(ValueError):s.restore(v)
    def test_opaque_data_injection_rejected(self):
        s=session();v=s.snapshot();v['vertices']=[1,2,3]
        with self.assertRaises(ValueError):s.restore(v)
        v=s.snapshot();v['state']['vertices']=[1,2,3]
        with self.assertRaises(ValueError):s.restore(v)
    def test_no_partial_restore(self):
        s=session();v=s.snapshot();v['state']['spread']=.9;v['state']['materials']['coat']['roughness']=float('nan');before=s.snapshot()
        with self.assertRaises(ValueError):s.restore(v)
        self.assertEqual(s.snapshot(),before)
    def test_locked_surface_rejected_in_edit_and_restore(self):
        s=session(locked_surfaces=['coat']);v=s.snapshot();v['state']['materials']['coat']['roughness']=.9
        with self.assertRaises(ValueError):s.restore(v)
        with self.assertRaises(ValueError):s.edit_material('coat',{**DEFAULT_MATERIAL,'roughness':.9})
    def test_other_surface_unaffected(self):
        s=session();s.edit_material('coat',{**DEFAULT_MATERIAL,'roughness':.9});self.assertEqual(s.state()['materials']['base'],DEFAULT_MATERIAL)
    def test_restore_unknown_part_rejected(self):
        for field,value in [('selected','unknown'),('solo','unknown'),('hidden',['unknown']),('hidden',['plate','plate']),('hidden',['plate',3])]:
            with self.subTest(field=field):
                s=session();v=s.snapshot();v['state'][field]=value
                with self.assertRaises(ValueError):s.restore(v)
    def test_material_identity_set_exact(self):
        s=session();v=s.snapshot();v['state']['materials']['ghost']=dict(DEFAULT_MATERIAL)
        with self.assertRaises(ValueError):s.restore(v)
    def test_import_cannot_start_motion(self):
        s=session();v=s.snapshot();v['state']['playing']=True
        with self.assertRaises(ValueError):s.restore(v)
    def test_unknown_surface_and_parameters_rejected(self):
        s=session()
        with self.assertRaises(ValueError):s.edit_material('ghost',DEFAULT_MATERIAL)
        with self.assertRaises(ValueError):s.edit_material('coat',{**DEFAULT_MATERIAL,'position':.2})

if __name__=='__main__':unittest.main(verbosity=2)
