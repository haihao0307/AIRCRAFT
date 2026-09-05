import importlib.util
import json
import pathlib
import struct
import tempfile
import unittest

P = pathlib.Path(__file__).resolve().parents[2] / 'tools/audit-distillation-source.py'
spec = importlib.util.spec_from_file_location('audit', P)
a = importlib.util.module_from_spec(spec)
spec.loader.exec_module(a)

def make_glb(doc, data):
    doc = {**doc, 'asset': {'version': '2.0'}, 'buffers': [{'byteLength': len(data)}]}
    text = json.dumps(doc).encode(); text += b' ' * (-len(text) % 4)
    data += b'\x00' * (-len(data) % 4)
    body = struct.pack('<II', len(text), 0x4e4f534a) + text + struct.pack('<II', len(data), 0x004e4942) + data
    return struct.pack('<4sII', b'glTF', 2, len(body) + 12) + body

class SourceAuditTests(unittest.TestCase):
    def run_audit(self, doc, payload, expected=None):
        b = make_glb(doc, payload)
        with tempfile.TemporaryDirectory() as tmp:
            p = pathlib.Path(tmp) / 'fixture.glb'; p.write_bytes(b)
            r = a.audit(p, expected or a.sha(b))
            self.assertEqual(p.read_bytes(), b)
            return r
    def fixture(self):
        return {'bufferViews':[{'buffer':0,'byteLength':24}], 'accessors':[{'bufferView':0,'componentType':5126,'type':'VEC3','count':2}], 'meshes':[{'primitives':[{'attributes':{'POSITION':0}}]}]}
    def test_dense_bytes(self):
        b = struct.pack('<6f', 1,2,3,4,5,6); r = self.run_audit(self.fixture(), b)
        self.assertEqual(r['accessors'][0]['packedSha256'], a.sha(b))
    def test_interleaved(self):
        d = self.fixture(); d['bufferViews'][0].update(byteLength=32, byteStride=16)
        b = struct.pack('<8f',1,2,3,99,4,5,6,99)
        self.assertEqual(self.run_audit(d,b)['accessors'][0]['packedSha256'],a.sha(struct.pack('<6f',1,2,3,4,5,6)))
    def test_normalized_uv_preserved_raw(self):
        d = {'bufferViews':[{'byteLength':8}], 'accessors':[{'bufferView':0,'componentType':5123,'type':'VEC2','count':2,'normalized':True}], 'meshes':[{'primitives':[{'attributes':{'TEXCOORD_0':0}}]}]}
        b = struct.pack('<4H',0,65535,100,200); r = self.run_audit(d,b)
        self.assertTrue(r['accessors'][0]['normalized']); self.assertEqual(r['accessors'][0]['packedSha256'],a.sha(b))
    def test_wrong_source_rejected(self):
        with self.assertRaises(ValueError): self.run_audit(self.fixture(),b'\0'*24,'0'*64)
    def test_overrun_rejected(self):
        d=self.fixture();d['accessors'][0]['count']=3
        with self.assertRaises(ValueError): self.run_audit(d,b'\0'*24)
    def test_sparse_not_silently_ignored(self):
        d=self.fixture();d['accessors'][0]['sparse']={}
        with self.assertRaises(ValueError): self.run_audit(d,b'\0'*24)
    def test_matrix_not_silently_repacked(self):
        d=self.fixture();d['accessors'][0]['type']='MAT3'
        with self.assertRaises(ValueError): self.run_audit(d,b'\0'*24)
    def test_source_transform_recorded(self):
        d=self.fixture();d['nodes']=[{'mesh':0,'translation':[1,2,3]}]; r=self.run_audit(d,b'\0'*24)
        d['nodes'][0]['translation']=[1,2,4]; r2=self.run_audit(d,b'\0'*24)
        self.assertNotEqual(r['nodeGraphSha256'],r2['nodeGraphSha256'])
    def test_deterministic(self):
        self.assertEqual(self.run_audit(self.fixture(),b'\0'*24),self.run_audit(self.fixture(),b'\0'*24))
if __name__=='__main__': unittest.main(verbosity=2)
