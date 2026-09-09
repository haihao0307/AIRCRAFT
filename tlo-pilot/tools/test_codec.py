import json,struct,unittest
from pathlib import Path
from codec import cbor_encode,cbor_decode,encode_wsd,parse_wsd,decode_profile
from verify import verify

class ProfileTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data=(Path(__file__).resolve().parents[1]/'data/B24_Generic_Mother_01.tlo').read_bytes()
        cls.chunks=[(c['type'],c['payload']) for c in parse_wsd(cls.data)]
    def test_complete_recovery(self):
        s,c,_=verify(self.data);self.assertEqual(s['resourceFiles'],102);self.assertEqual(c['TIME']['worldTime']['status'],'unknown');self.assertEqual(c['FRAM']['frames'][0]['worldLocation']['status'],'unknown');self.assertEqual(c['DNA_']['nextPhase']['implemented'],False)
    def test_exact_wide_integers_and_statuses(self):
        values={'largest':2**64-1,'negative':-2**64,'above_js_exact':2**53+1,'known-zero':0,'unknown':{'status':'unknown'},'not-applicable':{'status':'not-applicable'},'absent':{'status':'not-provided'},'bytes':bytes([0,255]),'float':.62}
        self.assertEqual(cbor_decode(cbor_encode(values)),values)
    def test_rfc_vectors(self):
        for value,hexbytes in [(0,'00'),(23,'17'),(24,'1818'),(1000,'1903e8'),(-1,'20'),('a','6161'),([1,2],'820102'),(None,'f6'),(True,'f5')]:
            self.assertEqual(cbor_encode(value).hex(),hexbytes);self.assertEqual(cbor_decode(bytes.fromhex(hexbytes)),value)
    def test_corruption_and_truncation(self):
        b=bytearray(self.data);b[-1]^=1
        for invalid in [b,self.data[:15],self.data[:-1],self.data+b'x']:
            with self.assertRaises(ValueError):parse_wsd(invalid)
    def test_unknown_optional_preserved(self):
        extra=self.chunks+[('ZZZZ',bytes([1,2,3,255]))];data=encode_wsd(extra);s,_,c=verify(data)
        self.assertEqual(s['unknownOptionalChunks'],['ZZZZ']);self.assertEqual(c[-1]['payload'],bytes([1,2,3,255]))
    def test_required_unsupported_or_missing(self):
        p=json.loads(self.chunks[0][1]);p['requiredChunks'].append('ZZZZ')
        with self.assertRaises(ValueError):decode_profile(encode_wsd([('PROF',json.dumps(p).encode())]+self.chunks[1:]))
        with self.assertRaises(ValueError):decode_profile(encode_wsd([c for c in self.chunks if c[0]!='TIME']))
    def test_path_traversal_rejected(self):
        chunks=list(self.chunks);i=next(i for i,c in enumerate(chunks) if c[0]=='RMAP');m=cbor_decode(chunks[i][1]);m['files'][0]['path']='../escape';chunks[i]=('RMAP',cbor_encode(m))
        with self.assertRaises(ValueError):verify(encode_wsd(chunks))
    def test_duplicate_key_rejected(self):
        with self.assertRaises(ValueError):cbor_decode(bytes.fromhex('a2616101616102'))

if __name__=='__main__':unittest.main()
