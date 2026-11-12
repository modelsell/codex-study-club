#!/usr/bin/env python3
"""Offline draft-ready metadata audit, v1.0. Python 3.9+, standard library.

No Gmail/n8n/model/network interface. Writes only the explicitly selected local
SQLite audit database. References are supplied metadata, not artifact readback.
See /cases/email-agent-coverage-audit for the input contract and limitations.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import sqlite3
import sys

APP = 'agent-mail-coverage/v1'
VERSION = '1.0'


class Invalid(ValueError):
    pass


class AuditParser(argparse.ArgumentParser):
    def error(self, message):
        self.exit(1, '{"error":"invalid_command_arguments"}\n')


def encoded(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'))


def number(value):
    if type(value) is not int or not 0 <= value < 2**63:
        raise Invalid('invalid_millisecond_integer')
    return value


def label(value):
    if not isinstance(value, str) or not re.fullmatch(r'[A-Za-z0-9._:/-]{1,160}', value):
        raise Invalid('invalid_identifier')
    return value


def fields(value, required, optional=()):
    if not isinstance(value, dict) or not set(required) <= set(value) or set(value) - set(required) - set(optional):
        raise Invalid('invalid_fields')


def sequence(value):
    if not isinstance(value, list):
        raise Invalid('expected_list')
    return value


def token(value):
    if value is not None and (not isinstance(value, str) or not value):
        raise Invalid('invalid_page_token')


def validate(p):
    fields(p, ['version', 'scope', 'source', 'cursor_ms', 'until_ms', 'overlap_ms', 'pages', 'ledger', 'artifacts'])
    if type(p['version']) is not int or p['version'] != 1:
        raise Invalid('unsupported_input_version')
    label(p['scope'])
    if p['source'] not in ('synthetic', 'supplied-metadata'):
        raise Invalid('invalid_source_label')
    for key in ['cursor_ms', 'until_ms', 'overlap_ms']:
        number(p[key])
    if p['until_ms'] <= p['cursor_ms']:
        raise Invalid('invalid_window')
    for page in sequence(p['pages']):
        fields(page, ['request_token', 'next_token', 'messages'], ['error'])
        token(page['request_token']); token(page['next_token'])
        if 'error' in page:
            label(page['error'])
        for row in sequence(page['messages']):
            fields(row, ['id', 'received_ms'])
            label(row['id']); number(row['received_ms'])
    for row in sequence(p['ledger']):
        fields(row, ['id', 'outcome', 'artifact'])
        for key in row:
            label(row[key])
    for row in sequence(p['artifacts']):
        fields(row, ['id', 'ref'])
        label(row['id']); label(row['ref'])
    return p


def no_duplicate_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise Invalid('duplicate_json_key')
        result[key] = value
    return result


def load_packet(path):
    def reject_constant(_):
        raise Invalid('invalid_json_constant')
    with open(path, encoding='utf-8') as f:
        return validate(json.load(f, object_pairs_hook=no_duplicate_keys, parse_constant=reject_constant))


def reconcile(p):
    validate(p)
    low = max(0, p['cursor_ms'] - p['overlap_ms'])
    result = {'version': 1, 'scope': p['scope'], 'source': p['source'],
              'packet_sha256': hashlib.sha256(encoded(p).encode()).hexdigest(),
              'window_ms': [low, p['until_ms']], 'input_coverage': 'unknown',
              'cursor_before_ms': p['cursor_ms'], 'cursor_after_ms': p['cursor_ms'],
              'findings': [], 'automatic_mail_actions': 0}
    messages = {}
    expected, seen, ended = None, set(), False
    reason = None
    if not p['pages']:
        reason = 'no_pages'
    for i, page in enumerate(p['pages']):
        if page.get('error'):
            reason = 'page_error'; break
        if page['request_token'] != expected:
            reason = 'token_gap'; break
        for row in page['messages']:
            mid = row['id']
            if mid in messages and messages[mid] != row:
                reason = 'conflicting_message'; break
            messages[mid] = row
        if reason:
            break
        nxt = page['next_token']
        if nxt is None:
            if i != len(p['pages']) - 1:
                reason = 'trailing_pages'
            ended = True
            break
        if nxt in seen:
            reason = 'token_loop'; break
        seen.add(nxt); expected = nxt
    if not reason and not ended:
        reason = 'unfinished_pages'
    indexes = []
    for name in ['ledger', 'artifacts']:
        index = {}
        for row in p[name]:
            if row['id'] in index and index[row['id']] != row:
                reason = reason or 'conflicting_' + name
            index[row['id']] = row
        indexes.append(index)
    if reason:
        result['reason'] = reason
        return result
    ledger, artifacts = indexes
    for mid, row in sorted(messages.items()):
        if not low <= row['received_ms'] < p['until_ms']:
            continue
        marker, artifact = ledger.get(mid), artifacts.get(mid)
        if marker and artifact and marker['outcome'] == 'draft_ready' and marker['artifact'] == artifact['ref']:
            status = 'declared_complete'
        elif marker or artifact:
            status = 'needs_review'
        else:
            status = 'missing_record'
        result['findings'].append({'id': mid, 'status': status})
    result['input_coverage'] = 'complete'
    result['cursor_after_ms'] = p['until_ms']
    return result


def connect(db, mode='rw'):
    uri = Path(db).resolve().as_uri() + '?mode=' + mode
    con = sqlite3.connect(uri, uri=True, timeout=1, isolation_level=None)
    try:
        if con.execute('PRAGMA user_version').fetchone()[0] != 1:
            raise Invalid('not_an_audit_database')
        if con.execute('SELECT value FROM metadata WHERE key=?', ('app',)).fetchone() != (APP,):
            raise Invalid('not_an_audit_database')
    except BaseException:
        con.close(); raise
    return con


def initialize(db, scope, cursor):
    label(scope); number(cursor)
    path = Path(db)
    try:
        fd = os.open(str(path), os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError:
        con = connect(path)
    else:
        os.close(fd)
        con = sqlite3.connect(path, isolation_level=None)
        con.executescript('''
            BEGIN IMMEDIATE;
            CREATE TABLE metadata(key TEXT PRIMARY KEY, value TEXT NOT NULL);
            CREATE TABLE cursors(scope TEXT PRIMARY KEY, value INTEGER NOT NULL);
            CREATE TABLE reports(id TEXT PRIMARY KEY, scope TEXT NOT NULL, body TEXT NOT NULL);
            PRAGMA user_version=1;
        ''')
        con.execute('INSERT INTO metadata VALUES (?,?)', ('app', APP)); con.execute('COMMIT')
    try:
        con.execute('BEGIN IMMEDIATE')
        old = con.execute('SELECT value FROM cursors WHERE scope=?', (scope,)).fetchone()
        if old and old[0] != cursor:
            raise Invalid('scope_already_initialized_at_another_cursor')
        con.execute('INSERT OR IGNORE INTO cursors VALUES (?,?)', (scope, cursor))
        con.execute('COMMIT')
        return {'scope': scope, 'cursor_ms': cursor, 'initialized': old is None}
    finally:
        con.close()


def scan(db, packet, _test_fault=None, _test_readonly=False):
    validate(packet)
    con = connect(db, 'ro' if _test_readonly else 'rw')
    try:
        con.execute('BEGIN IMMEDIATE')
        old = con.execute('SELECT value FROM cursors WHERE scope=?', (packet['scope'],)).fetchone()
        if old is None or old[0] != packet['cursor_ms']:
            raise Invalid('stale_cursor_or_unknown_scope')
        report = reconcile(packet)
        body = encoded(report)
        rid = hashlib.sha256(body.encode()).hexdigest()
        con.execute('INSERT OR IGNORE INTO reports VALUES (?,?,?)', (rid, packet['scope'], body))
        if _test_fault == 'after_report':
            raise OSError('injected_failure')
        if _test_fault == 'crash_after_report':
            os._exit(73)
        if report['input_coverage'] == 'complete':
            con.execute('UPDATE cursors SET value=? WHERE scope=?', (report['cursor_after_ms'], packet['scope']))
        if _test_fault == 'after_cursor':
            raise OSError('injected_failure')
        if _test_fault == 'crash_after_cursor':
            os._exit(74)
        con.execute('COMMIT')
        return {'report_id': rid, 'report': report}
    except BaseException:
        if con.in_transaction:
            con.execute('ROLLBACK')
        raise
    finally:
        con.close()


def read_reports(db, scope, pending=False):
    label(scope)
    con = connect(db, 'ro')
    try:
        cursor = con.execute('SELECT value FROM cursors WHERE scope=?', (scope,)).fetchone()
        if cursor is None:
            raise Invalid('unknown_scope')
        reports = [{'report_id': rid, 'report': json.loads(body)} for rid, body in
                   con.execute('SELECT id,body FROM reports WHERE scope=? ORDER BY rowid', (scope,))]
        if pending:
            reports = [{'report_id': r['report_id'], 'finding': f} for r in reports
                       for f in r['report']['findings'] if f['status'] != 'declared_complete']
        return {'scope': scope, 'cursor_ms': cursor[0],
                'historical_unresolved_no_auto_close' if pending else 'reports': reports}
    finally:
        con.close()


def main():
    parser = AuditParser(description=__doc__)
    parser.add_argument('--version', action='version', version=VERSION)
    commands = parser.add_subparsers(dest='command', required=True)
    init = commands.add_parser('init', help='Create a local audit DB or add an independent namespace')
    init.add_argument('--db', required=True); init.add_argument('--scope', required=True)
    init.add_argument('--cursor-ms', required=True, type=int)
    scan_parser = commands.add_parser('scan', help='Audit supplied metadata and atomically save report + scan cursor')
    scan_parser.add_argument('--db', required=True); scan_parser.add_argument('--input', required=True)
    for cmd in ['reports', 'pending']:
        sub = commands.add_parser(cmd, help='Read local saved reports; pending is historical, never auto-closed')
        sub.add_argument('--db', required=True); sub.add_argument('--scope', required=True)
    args = parser.parse_args()
    try:
        if args.command == 'init':
            result = initialize(args.db, args.scope, args.cursor_ms)
        elif args.command == 'scan':
            result = scan(args.db, load_packet(args.input))
        else:
            result = read_reports(args.db, args.scope, args.command == 'pending')
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 2 if args.command == 'scan' and result['report']['input_coverage'] == 'unknown' else 0
    except Invalid as exc:
        print(json.dumps({'error': str(exc)}), file=sys.stderr)
    except (OSError, sqlite3.Error, json.JSONDecodeError, UnicodeError):
        print(json.dumps({'error': 'input_or_database_operation_failed'}), file=sys.stderr)
    return 1


if __name__ == '__main__':
    sys.exit(main())
