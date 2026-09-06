import unittest
from dataclasses import replace
from math import isclose
from surface_program import Recipe,FIELDS,Field,modes,evaluate,sampled_field
class SurfaceTests(unittest.TestCase):
 def setUp(self):self.r=Recipe('material.study.body');self.p=(.173,.259,.361)
 def test_rebuild_deterministic(self):self.assertEqual(evaluate(self.r,self.p),evaluate(Recipe('material.study.body'),self.p))
 def test_entity_namespace(self):self.assertNotEqual(modes(self.r,FIELDS[0]),modes(replace(self.r,entity='other'),FIELDS[0]))
 def test_layer_namespace(self):self.assertNotEqual(modes(self.r,FIELDS[0]),modes(self.r,replace(FIELDS[0],process='other')))
 def test_added_layer_does_not_change_existing(self):
  a=modes(self.r,FIELDS[0]);modes(self.r,Field('added',.1));self.assertEqual(a,modes(self.r,FIELDS[0]))
 def test_order_independent(self):
  a={f.process:sampled_field(self.r,f,self.p) for f in FIELDS};b={f.process:sampled_field(self.r,f,self.p) for f in reversed(FIELDS)};self.assertEqual(a,b)
 def test_channels_not_same_pattern(self):
  v=[sampled_field(self.r,f,self.p)[0] for f in FIELDS];self.assertEqual(len(set(v)),len(v))
 def test_no_unobserved_oil_default(self):self.assertEqual(evaluate(self.r,self.p)['coat_weight'],0)
 def test_oil_changes_related_outputs_only(self):
  a=evaluate(self.r,self.p);b=evaluate(replace(self.r,film_coverage=.8),self.p);self.assertGreater(b['coat_weight'],0);self.assertLess(b['roughness'],a['roughness']);self.assertEqual(a['height_ratio'],b['height_ratio']);self.assertEqual(a['base_linear'],b['base_linear'])
 def test_height_does_not_change_tint(self):self.assertEqual(evaluate(self.r,self.p)['base_linear'],evaluate(replace(self.r,relief_ratio=0),self.p)['base_linear'])
 def test_high_frequency_attenuation(self):
  near=abs(sampled_field(self.r,FIELDS[2],self.p,0)[0]);far=abs(sampled_field(self.r,FIELDS[2],self.p,.02)[0]);self.assertLess(far,near*1e-6)
 def test_gradient_matches_finite_difference(self):
  _,g=sampled_field(self.r,FIELDS[1],self.p,.001)
  for j in range(3):
   a=list(self.p);b=list(self.p);a[j]+=1e-7;b[j]-=1e-7
   delta=(sampled_field(self.r,FIELDS[1],a,.001)[0]-sampled_field(self.r,FIELDS[1],b,.001)[0])/2e-7
   self.assertTrue(isclose(g[j],delta,rel_tol=1e-6,abs_tol=1e-7))
 def test_temporal_state_not_input(self):
  a=evaluate(self.r,self.p)
  for t in range(30):self.assertEqual(a,evaluate(self.r,self.p))
 def test_parameters_validated(self):
  for k,v in [('master_seed',True),('base_roughness',float('nan')),('film_coverage',2),('relief_ratio',-.1)]:
   with self.subTest(k=k),self.assertRaises(ValueError):replace(self.r,**{k:v})
 def test_bad_coordinates(self):
  for p in [(1,2),(0,float('inf'),1),(True,0,0)]:
   with self.assertRaises(ValueError):evaluate(self.r,p)
 def test_bounded_outputs(self):
  for i in range(50):
   a=evaluate(self.r,(i/59,i/71,i/83));self.assertTrue(.08<=a['roughness']<=.98);self.assertLessEqual(abs(a['height_ratio']),self.r.relief_ratio)
 def test_white_color_stays_bounded(self):
  a=evaluate(replace(self.r,base_linear=(1.,1.,1.)),self.p);self.assertTrue(all(0<=v<=1 for v in a['base_linear']))
if __name__=='__main__':unittest.main(verbosity=2)
