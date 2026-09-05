import importlib.util, tempfile, unittest
from pathlib import Path
p=Path(__file__).resolve().parents[1]/'tools/check_release.py'
s=importlib.util.spec_from_file_location('guard',p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class GuardTests(unittest.TestCase):
    def probe(self,name,data):
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp)/name).write_text(data);return m.scan(Path(tmp))['passed']
    def test_blocks_asset(self):self.assertFalse(self.probe('hidden.glb','not even a real model'))
    def test_blocks_mesh_table(self):self.assertFalse(self.probe('hidden.py','x='+repr(list(range(200)))))
    def test_blocks_data_uri(self):self.assertFalse(self.probe('hidden.js','data:'+'image/png;'+'base64,'+'AAAA'))
    def test_blocks_long_payload(self):self.assertFalse(self.probe('hidden.js','A'*600))
    def test_accepts_small_rule(self):self.assertTrue(self.probe('rule.py','x = [i / 20 for i in range(20)]'))
if __name__=='__main__':unittest.main(verbosity=2)
