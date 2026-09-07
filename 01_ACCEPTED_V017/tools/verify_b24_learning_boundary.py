#!/usr/bin/env python3
"""Read-only guard for this B24 knowledge intake, not a visual/physics test.

Usage: python tools/verify_b24_learning_boundary.py --repo .
       python tools/verify_b24_learning_boundary.py --self-test
Requires Python 3.9+ and Git. Self-tests use disposable synthetic repositories.
"""
import argparse
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

BASELINE = 'b6c47ba3f27330776c7a473094d7c29375993d1c'
PREFIX = 'docs/b24-learning-r1-20260905/'
ADDITIONS = frozenset({
    PREFIX + 'SKILL.md', PREFIX + 'STATE.json', PREFIX + 'VALIDATION.md',
    'tools/verify_b24_learning_boundary.py',
})
ENTRY = 'NEXT_START_HERE.md'


def git(repo, *args):
    """Use an argument vector, never a shell or an interpolated command."""
    result = subprocess.run(['git', '-C', str(repo), *args],
                            capture_output=True, check=False, timeout=30)
    if result.returncode:
        raise RuntimeError(result.stderr.decode('utf-8', 'replace').strip()
                           or 'Git command failed')
    return result.stdout


def parse_changes(data):
    """Parse git diff --no-renames --name-status -z; fail on ambiguity."""
    if not data:
        return []
    if not data.endswith(b'\0'):
        raise ValueError('Truncated NUL-delimited Git diff')
    parts = data[:-1].split(b'\0')
    if len(parts) % 2:
        raise ValueError('Malformed Git diff; rename detection must be off')
    changes = []
    for i in range(0, len(parts), 2):
        status, path = parts[i].decode('ascii'), parts[i + 1].decode('utf-8')
        if status not in {'A', 'M', 'D', 'T', 'U', 'X', 'B'} or not path:
            raise ValueError('Unsupported Git status or empty path')
        changes.append((status, path))
    return changes


def policy_errors(changes):
    errors = []
    for status, path in changes:
        if path in ADDITIONS and status == 'A':
            continue
        if path == ENTRY and status == 'M':
            continue
        errors.append('Out-of-scope change: {} {}'.format(status, path))
    return errors


def audit(repo, base=BASELINE, head='HEAD', require_clean=True):
    """Check committed tree delta, exact inherited entry prefix, and dirtiness."""
    base_sha = git(repo, 'rev-parse', '--verify', base + '^{commit}').decode().strip()
    head_sha = git(repo, 'rev-parse', '--verify', head + '^{commit}').decode().strip()
    git(repo, 'merge-base', '--is-ancestor', base_sha, head_sha)
    changes = parse_changes(git(repo, 'diff', '--no-renames', '--name-status',
                                '-z', base_sha, head_sha, '--'))
    errors = policy_errors(changes)
    before = git(repo, 'show', base_sha + ':' + ENTRY)
    after = git(repo, 'show', head_sha + ':' + ENTRY)
    if not after.startswith(before):
        errors.append('Inherited restart entry was edited or removed')
    dirty = bool(git(repo, 'status', '--porcelain', '--untracked-files=all'))
    if require_clean and dirty:
        errors.append('Working tree is dirty; commit-range check is insufficient')
    return {'scope': 'knowledge-intake-only', 'base': base_sha, 'head': head_sha,
            'passed': not errors, 'errors': errors, 'dirty_worktree': dirty,
            'changes': [{'status': s, 'path': p} for s, p in changes],
            'visual_acceptance': 'not_evaluated', 'runtime_test': 'not_run'}


class BoundaryTests(unittest.TestCase):
    def test_empty_diff(self):
        self.assertEqual(parse_changes(b''), [])

    def test_allowed_changes(self):
        self.assertEqual(policy_errors([('A', p) for p in ADDITIONS]
                                       + [('M', ENTRY)]), [])

    def test_runtime_and_asset_rejected(self):
        errors = policy_errors([('M', 'preview/b24-metal-grass-mission-r1/native-aircraft.js'),
                                ('M', 'assets/native.bin.gz')])
        self.assertEqual(len(errors), 2)

    def test_deletion_and_rename_source_rejected(self):
        self.assertTrue(policy_errors([('D', ENTRY), ('A', 'archive/NEXT_START_HERE.md')]))

    def test_prefix_escape_rejected(self):
        self.assertTrue(policy_errors([('A', PREFIX + '../runtime.js')]))

    def test_type_change_rejected(self):
        self.assertTrue(policy_errors([('T', ENTRY)]))

    def test_nul_paths(self):
        self.assertEqual(parse_changes(b'M\0odd\nname.txt\0'), [('M', 'odd\nname.txt')])

    def test_truncated_diff_rejected(self):
        with self.assertRaises(ValueError):
            parse_changes(b'A\0file')

    def test_rename_format_rejected(self):
        with self.assertRaises(ValueError):
            parse_changes(b'R100\0old\0new\0')

    def test_git_integration_positive_and_negative(self):
        with tempfile.TemporaryDirectory(prefix='b24-guard-fixture-') as directory:
            repo = Path(directory)
            git(repo, 'init', '-q')
            git(repo, 'config', 'user.name', 'Synthetic test')
            git(repo, 'config', 'user.email', 'test@example.invalid')
            (repo / ENTRY).write_text('Frozen entry\n', encoding='utf-8')
            (repo / 'runtime.js').write_text('frozen\n', encoding='utf-8')
            git(repo, 'add', '.')
            git(repo, 'commit', '-qm', 'fixture baseline')
            base = git(repo, 'rev-parse', 'HEAD').decode().strip()
            target = repo / (PREFIX + 'SKILL.md')
            target.parent.mkdir(parents=True)
            target.write_text('Learning only\n', encoding='utf-8')
            (repo / ENTRY).write_text('Frozen entry\nNew link\n', encoding='utf-8')
            git(repo, 'add', '.')
            git(repo, 'commit', '-qm', 'allowed intake')
            self.assertTrue(audit(repo, base)['passed'])
            (repo / 'runtime.js').write_text('unexpected change\n', encoding='utf-8')
            self.assertFalse(audit(repo, base)['passed'])
            git(repo, 'add', '.')
            git(repo, 'commit', '-qm', 'forbidden runtime change')
            self.assertFalse(audit(repo, base)['passed'])
            (repo / ENTRY).write_text('Replaced entry\n', encoding='utf-8')
            git(repo, 'add', '.')
            git(repo, 'commit', '-qm', 'forbidden entry replacement')
            self.assertIn('Inherited restart entry was edited or removed',
                          audit(repo, base)['errors'])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, default=Path('.'))
    parser.add_argument('--base', default=BASELINE)
    parser.add_argument('--head', default='HEAD')
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    if args.self_test:
        result = unittest.TextTestRunner(verbosity=2).run(
            unittest.defaultTestLoader.loadTestsFromTestCase(BoundaryTests))
        return 0 if result.wasSuccessful() else 1
    try:
        report = audit(args.repo, args.base, args.head)
    except (RuntimeError, ValueError, OSError, subprocess.TimeoutExpired) as exc:
        print(json.dumps({'passed': False, 'error': str(exc)}, ensure_ascii=False))
        return 2
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
