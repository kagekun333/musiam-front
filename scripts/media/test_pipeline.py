import copy
import json
import tempfile
import unittest
from pathlib import Path
from pipeline import CHANNELS, ROOT, compile_recipe, confined, load_recipe, render


class PipelineTests(unittest.TestCase):
    def setUp(self):
        self.r = load_recipe('ops/media/sources/human-role-selection-v1.json')

    def rejects(self, change):
        r = copy.deepcopy(self.r)
        change(r)
        with self.assertRaises((ValueError, KeyError, IndexError)):
            compile_recipe(r)

    def test_determinism(self):
        self.assertEqual(render(compile_recipe(self.r)), render(compile_recipe(self.r)))

    def test_stale_source(self):
        self.rejects(lambda r: r['source'].update(sha256='0' * 64))

    def test_source_metadata(self):
        self.rejects(lambda r: r['source'].update(title='invented source title'))
        self.rejects(lambda r: r['source'].update(date='2026-01-01'))

    def test_unknown_recipe_fields(self):
        self.rejects(lambda r: r.update(publication='ENABLED'))

    def test_invalid_input_types(self):
        self.rejects(lambda r: r.update(channels=[]))
        self.rejects(lambda r: r['cta'].update(label=7))
        self.rejects(lambda r: r['channels']['x']['segments'][0].update(text=7))

    def test_fake_quote(self):
        self.rejects(lambda r: r['evidence']['q1'].update(excerpt='invented'))

    def test_fake_locator(self):
        self.rejects(lambda r: r['evidence']['q1'].update(line=1))

    def test_fake_fact(self):
        self.rejects(lambda r: r['channels']['x']['segments'][0].update(kind='fact'))

    def test_inference_claim(self):
        for text in ('売上は100万円です', '作者は「最高」と語った', 'https://fake.invalid', '[偽](/fake)'):
            self.rejects(lambda r: r['channels']['x']['segments'][0].update(text=text))

    def test_fake_cta(self):
        self.rejects(lambda r: r['cta'].update(href='/invented'))

    def test_missing_provenance(self):
        self.rejects(lambda r: r['channels']['x']['segments'][0].update(evidence_ids=[]))

    def test_copy_paste(self):
        self.rejects(lambda r: r['channels'].update(threads=r['channels']['x']))

    def test_repetition(self):
        self.rejects(lambda r: r['channels']['x']['segments'].append(r['channels']['x']['segments'][0]))

    def test_hype(self):
        self.rejects(lambda r: r['channels']['x']['segments'][0].update(text='革新的な制作です'))

    def test_traversal(self):
        with self.assertRaises(ValueError):
            confined('ops/media/../../package.json', 'ops/media')
        for path in ('/ops/media/sources/recipe.json', 'ops/media//sources/recipe.json',
                     'ops/media/./sources/recipe.json', r'ops\media\sources\recipe.json'):
            with self.subTest(path=path), self.assertRaises(ValueError):
                confined(path, 'ops/media')

    def test_symlink_traversal(self):
        with tempfile.TemporaryDirectory(dir=ROOT / 'ops/media') as temp:
            link = Path(temp) / 'dangling-link'
            link.symlink_to(Path(tempfile.gettempdir()) / 'media-os-missing-target', target_is_directory=True)
            relative = link.relative_to(ROOT).as_posix() + '/recipe.json'
            with self.assertRaisesRegex(ValueError, 'symlink forbidden'):
                confined(relative, 'ops/media')

    def test_schema_matches_compiler_contract(self):
        schema = json.loads((ROOT / 'ops/media/source.schema.json').read_text(encoding='utf-8'))
        self.assertEqual(set(schema['required']), {'schema_version', 'id', 'source', 'evidence', 'channels', 'cta'})
        self.assertEqual(set(schema['properties']['channels']['required']), set(CHANNELS))
        self.assertFalse(schema['additionalProperties'])
        self.assertFalse(schema['properties']['channels']['additionalProperties'])

    def test_draft_only(self):
        p = compile_recipe(self.r)
        self.assertEqual(p['publication'], 'DISABLED')
        self.assertTrue(all(not q['executable'] and q['state'] == 'DRAFT' for q in p['queue']))
        self.assertTrue(all(o['approval'] == 'UNREVIEWED' for o in p['outputs']))


if __name__ == '__main__':
    unittest.main()
