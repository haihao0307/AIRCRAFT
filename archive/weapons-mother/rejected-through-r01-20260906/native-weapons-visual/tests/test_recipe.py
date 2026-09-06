import sys, unittest
from pathlib import Path
from collections import Counter
from dataclasses import replace
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'core'))
from recipe import Coupon, evaluate, signature, presentation_pose, roughness

class RuleTests(unittest.TestCase):
    def test_repeatable(self): self.assertEqual(signature(Coupon()), signature(Coupon()))
    def test_resolution_changes_generated_topology(self):
        self.assertNotEqual(signature(Coupon()), signature(Coupon(corner_steps=10)))
    def test_parameters_change_shape(self):
        self.assertNotEqual(signature(Coupon()), signature(Coupon(width=4)))
    def test_closed_oriented_manifold(self):
        pts, fs = evaluate(Coupon())
        edges = Counter((a,b) for f in fs for a,b in zip(f, f[1:]+f[:1]))
        for (a,b), count in edges.items():
            self.assertEqual(count,1); self.assertEqual(edges[(b,a)],1)
        self.assertEqual(len(pts)-len(edges)//2+len(fs),2)
    def test_no_duplicate_coordinates(self):
        ps,_=evaluate(Coupon()); self.assertEqual(len(ps),len(set(ps)))
    def test_bounds(self):
        ps,_=evaluate(Coupon())
        self.assertAlmostEqual(max(p[0] for p in ps)-min(p[0] for p in ps),3)
        self.assertAlmostEqual(max(p[1] for p in ps)-min(p[1] for p in ps),2)
        self.assertAlmostEqual(max(p[2] for p in ps)-min(p[2] for p in ps),.2)
    def test_reject_bad_shape(self):
        for key,value in [('width',0),('height',-1),('depth',float('nan')),('radius',1),('corner_steps',2.5),('corner_steps',True)]:
            with self.subTest(key=key), self.assertRaises(ValueError): evaluate(replace(Coupon(),**{key:value}))
    def test_spread_repeat_does_not_accumulate(self):
        r=(.3,.2,.1);o=(0,0,2)
        for _ in range(1000):
            presentation_pose(r,o,1);self.assertEqual(presentation_pose(r,o,0),r)
    def test_pose_independent_of_sampling_history(self):
        r=(.3,.2,.1);o=(0,0,2); expected=presentation_pose(r,o,.5)
        presentation_pose(r,o,.9);self.assertEqual(presentation_pose(r,o,.5),expected)
    def test_invalid_spread_rejected(self):
        for t in [-.1,1.1,float('inf'),True]:
            with self.assertRaises(ValueError):presentation_pose((0,0,0),(1,0,0),t)
    def test_roughness_local_coordinate_only(self):
        p=(.31,.2,.1);expected=roughness(p)
        for t in [0,.3,1,0]:
            presentation_pose((0,0,0),(0,0,2),t)
            self.assertEqual(roughness(p),expected)
    def test_material_does_not_rebuild_shape(self):
        before=signature(Coupon());roughness((.4,0,0),base=.8)
        self.assertEqual(signature(Coupon()),before)
    def test_roughness_bounded(self):
        for i in range(100):
            q=roughness((i*.01,0,0),base=.02,amplitude=.2)
            self.assertTrue(0 <= q <= 1)
    def test_no_external_runtime_imports(self):
        import ast
        code=(Path(__file__).resolve().parents[1]/'core/recipe.py').read_text()
        names={n.module for n in ast.walk(ast.parse(code)) if isinstance(n,ast.ImportFrom)}
        self.assertEqual(names,{'dataclasses','math','hashlib'})

if __name__=='__main__': unittest.main(verbosity=2)
