#!/usr/bin/env python3
"""Acceptance checks using invented metadata and temporary SQLite files only."""
import argparse
import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import sqlite3
import subprocess
import sys
import tempfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--tool', type=Path, required=True)
parser.add_argument('--example', type=Path, required=True)
args = parser.parse_args()
checks, network_attempts = [], []


def audit_hook(event, _):
    if event.startswith('socket.'):
        network_attempts.append(event)
        raise RuntimeError('network_forbidden_in_test')


sys.addaudithook(audit_hook)
spec = importlib.util.spec_from_file_location('coverage_audit', args.tool.resolve())
core = importlib.util.module_from_spec(spec); spec.loader.exec_module(core)
BASE = core.load_packet(args.example)
OLD, HIGH, SCOPE = BASE['cursor_ms'], BASE['until_ms'], BASE['scope']
RUNNER = '''import sys,runpy,os

def guard(event,args):
 if event.startswith('socket.'):os._exit(97)
sys.addaudithook(guard)
sys.argv=sys.argv[1:]
runpy.run_path(sys.argv[0],run_name='__main__')
'''
FAULT = '''import sys,importlib.util,json,os

def guard(event,args):
 if event.startswith('socket.'):os._exit(97)
sys.addaudithook(guard)
spec=importlib.util.spec_from_file_location('audit',sys.argv[1]);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
m.scan(sys.argv[2],json.load(open(sys.argv[3])),_test_fault=sys.argv[4])
'''
ENV = {'PYTHONNOUSERSITE': '1', 'PYTHONDONTWRITEBYTECODE': '1', 'PATH': os.environ.get('PATH', '')}


def ok(name):
    checks.append(name)


def states(result):
    return {r['id']: r['status'] for r in result['findings']}


def snapshot(db):
    with sqlite3.connect(db) as con:
        assert con.execute('PRAGMA integrity_check').fetchone() == ('ok',)
        return [con.execute('SELECT * FROM ' + table + ' ORDER BY 1').fetchall()
                for table in ['metadata', 'cursors', 'reports']]


def unknown(packet, reason):
    result = core.reconcile(packet)
    assert result['input_coverage'] == 'unknown' and result['cursor_after_ms'] == OLD
    assert not result['findings'] and result['reason'] == reason


# Illustrative predicates over invented properties, not a Gmail q parser.
received = {row['id']: row['received_ms'] for page in BASE['pages'] for row in page['messages']}
# Each tuple means (in inbox, unread, completion label).
properties = {'opened': (True, False, False), 'archived': (False, False, False),
              'delayed': (True, True, False), 'done': (True, False, True),
              'draft-no-marker': (True, False, False)}
old_sweep = sorted(mid for mid in received if properties[mid][0] and not properties[mid][2] and received[mid] > HIGH - 86400000)
old_trigger = sorted(mid for mid in received if properties[mid][1])
assert old_sweep == ['draft-no-marker', 'opened']
assert old_trigger == ['delayed']
ok('synthetic inbox/day/unprocessed baseline sees two of five; not a Gmail query execution')
report = core.reconcile(BASE)
assert states(report) == {'archived': 'missing_record', 'delayed': 'missing_record', 'opened': 'missing_record',
                         'done': 'declared_complete', 'draft-no-marker': 'needs_review'}
assert report['input_coverage'] == 'complete' and report['automatic_mail_actions'] == 0
ok('five-message example; identical duplicate counted once')
for array, field, reason in [('messages', 'received_ms', 'conflicting_message'),
                            ('ledger', 'artifact', 'conflicting_ledger'),
                            ('artifacts', 'ref', 'conflicting_artifacts')]:
    p = copy.deepcopy(BASE)
    if array == 'messages':
        p['pages'][1]['messages'][0]['received_ms'] -= 1
    else:
        row = {**p[array][0], field: 'different'}; p[array].append(row)
    unknown(p, reason); ok(array + ' conflict keeps unknown coverage')
p = copy.deepcopy(BASE); p['artifacts'] = []
assert states(core.reconcile(p))['done'] == 'needs_review'
ok('ledger alone does not establish supplied artifact match')
p = copy.deepcopy(BASE); p['ledger'][0]['outcome'] = 'sending'
assert states(core.reconcile(p))['done'] == 'needs_review'
ok('another outcome does not mean draft-ready')
p = copy.deepcopy(BASE)
p['pages'] = [{'request_token': None, 'next_token': None, 'messages': [
    {'id': 'before', 'received_ms': OLD - p['overlap_ms'] - 1},
    {'id': 'lower', 'received_ms': OLD - p['overlap_ms']},
    {'id': 'last', 'received_ms': HIGH - 1}, {'id': 'upper', 'received_ms': HIGH}]}]
assert set(states(core.reconcile(p))) == {'lower', 'last'}
ok('millisecond half-open interval boundaries')
for key in ['cursor_ms', 'until_ms', 'overlap_ms']:
    p = copy.deepcopy(BASE); p[key] = True
    try: core.validate(p)
    except core.Invalid: pass
    else: raise AssertionError('boolean accepted')
ok('boolean window fields rejected')
for name, mutate, reason in [
    ('failed page', lambda p: p['pages'][1].update(error='synthetic-error'), 'page_error'),
    ('unfinished pages', lambda p: p['pages'].pop(), 'unfinished_pages'),
    ('token gap', lambda p: p['pages'][1].update(request_token='wrong'), 'token_gap'),
    ('token loop', lambda p: p['pages'][1].update(next_token='p2'), 'token_loop'),
    ('trailing pages', lambda p: p['pages'].append(copy.deepcopy(p['pages'][1])), 'trailing_pages'),
    ('empty page list', lambda p: p.update(pages=[]), 'no_pages')]:
    p = copy.deepcopy(BASE); mutate(p); unknown(p, reason); ok(name + ' stays unknown')
p = copy.deepcopy(BASE); del p['pages'][1]['next_token']
try: core.validate(p)
except core.Invalid: pass
else: raise AssertionError('missing explicit terminator accepted')
ok('missing explicit next_token is invalid input')
p = copy.deepcopy(BASE); p['pages'][0]['messages'][0]['body'] = 'synthetic-extra-field'
try: core.validate(p)
except core.Invalid: pass
else: raise AssertionError('unknown message field accepted')
ok('unexpected message fields rejected')

with tempfile.TemporaryDirectory(prefix='mail-audit-acceptance-') as temp:
    root = Path(temp); tool = root / 'clean directory' / 'mail-coverage-audit.py'
    tool.parent.mkdir(); shutil.copy2(args.tool, tool)
    example = tool.parent / 'input.json'; shutil.copy2(args.example, example)
    def cli(*argv, expected=0):
        run = subprocess.run([sys.executable, '-c', RUNNER, str(tool), *map(str, argv)],
                             cwd=root, env=ENV, capture_output=True, text=True)
        assert run.returncode == expected, (run.returncode, run.stdout, run.stderr)
        return json.loads(run.stdout) if run.stdout else None
    db = root / 'audit.db'
    cli('init', '--db', db, '--scope', SCOPE, '--cursor-ms', OLD)
    got = cli('scan', '--db', db, '--input', example)
    assert got['report'] == report
    saved = cli('reports', '--db', db, '--scope', SCOPE)
    assert saved['cursor_ms'] == HIGH and saved['reports'][0] == got
    assert len(cli('pending', '--db', db, '--scope', SCOPE)['historical_unresolved_no_auto_close']) == 4
    ok('packaged CLI init/scan/reports/pending from another directory with spaces')
    before = snapshot(db)
    cli('scan', '--db', db, '--input', example, expected=1)
    assert snapshot(db) == before
    ok('stale CLI replay neither regresses cursor nor duplicates report')
    p = copy.deepcopy(BASE); p['cursor_ms'] = HIGH; p['until_ms'] = HIGH + 3600000
    p['overlap_ms'] = 0; p['pages'] = [{'request_token': None, 'next_token': None, 'messages': []}]
    future = root / 'next.json'; future.write_text(json.dumps(p))
    cli('scan', '--db', db, '--input', future)
    assert len(cli('pending', '--db', db, '--scope', SCOPE)['historical_unresolved_no_auto_close']) == 4
    ok('later empty scan keeps historical unresolved findings visible')
    second = 'another-mailbox/draft-ready/v1'
    cli('init', '--db', db, '--scope', second, '--cursor-ms', OLD)
    p = copy.deepcopy(BASE); p['scope'] = second; future.write_text(json.dumps(p))
    cli('scan', '--db', db, '--input', future)
    assert len(cli('reports', '--db', db, '--scope', second)['reports']) == 1
    ok('same IDs in independent namespace do not share cursor or reports')
    before = snapshot(db)
    cli('init', '--db', db, '--scope', SCOPE, '--cursor-ms', OLD, expected=1)
    assert snapshot(db) == before
    ok('init cannot reset an existing namespace cursor')
    unknown_db = root / 'unknown.db'; core.initialize(unknown_db, SCOPE, OLD)
    p = copy.deepcopy(BASE); p['pages'].pop(); future.write_text(json.dumps(p))
    got = cli('scan', '--db', unknown_db, '--input', future, expected=2)
    state = cli('reports', '--db', unknown_db, '--scope', SCOPE)
    assert got['report']['input_coverage'] == 'unknown' and state['cursor_ms'] == OLD
    assert state['reports'][0] == got
    before = snapshot(unknown_db)
    cli('scan', '--db', unknown_db, '--input', future, expected=2)
    assert snapshot(unknown_db) == before
    ok('unknown input report is saved once while scan cursor stays old')
    before = snapshot(unknown_db)
    duplicate = root / 'duplicate.json'; duplicate.write_text('{"version":1,"version":1}')
    cli('scan', '--db', unknown_db, '--input', duplicate, expected=1)
    assert snapshot(unknown_db) == before
    ok('duplicate JSON key rejected without database mutation')
    invalid = copy.deepcopy(BASE); del invalid['pages'][1]['next_token']; future.write_text(json.dumps(invalid))
    cli('scan', '--db', unknown_db, '--input', future, expected=1)
    assert snapshot(unknown_db) == before
    ok('invalid CLI schema does not write report or move cursor')
    cli('init', '--db', unknown_db, '--scope', SCOPE, '--cursor-ms', 'not-an-integer', expected=1)
    assert snapshot(unknown_db) == before
    ok('invalid CLI arguments exit one without database mutation')
    unrelated = root / 'unrelated.db'
    with sqlite3.connect(unrelated) as con: con.execute('CREATE TABLE important(value TEXT)')
    original = unrelated.read_bytes()
    cli('init', '--db', unrelated, '--scope', SCOPE, '--cursor-ms', OLD, expected=1)
    assert unrelated.read_bytes() == original
    ok('unrelated SQLite database preserved byte-for-byte')
    for fault in ['after_report', 'after_cursor', 'crash_after_report', 'crash_after_cursor']:
        dbf = root / (fault + '.db'); core.initialize(dbf, SCOPE, OLD); before = snapshot(dbf)
        if fault.startswith('crash'):
            run = subprocess.run([sys.executable, '-c', FAULT, str(tool), str(dbf), str(example), fault],
                                 env=ENV, capture_output=True)
            assert run.returncode == (73 if fault.endswith('report') else 74)
        else:
            try: core.scan(dbf, BASE, _test_fault=fault)
            except OSError: pass
            else: raise AssertionError('expected injected failure')
        assert snapshot(dbf) == before
        ok(fault + ' rolls back both tables after real file reopen')
    readonly = root / 'readonly.db'; core.initialize(readonly, SCOPE, OLD); before = snapshot(readonly)
    try: core.scan(readonly, BASE, _test_readonly=True)
    except sqlite3.OperationalError: pass
    else: raise AssertionError('expected real SQLite readonly failure')
    assert snapshot(readonly) == before
    ok('SQLite read-only write failure leaves both tables unchanged')
assert not network_attempts
print(json.dumps({'passed': len(checks), 'checks': checks, 'python': sys.version.split()[0],
                  'sqlite': sqlite3.sqlite_version, 'network_attempts': len(network_attempts),
                  'network_guard': 'parent and each CLI/fault child', 'external_mail_actions': 0,
                  'tool_sha256': hashlib.sha256(args.tool.read_bytes()).hexdigest(),
                  'scope': 'synthetic metadata, local CLI/files/SQLite only'}, ensure_ascii=False, indent=2))
