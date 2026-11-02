// Source-level experiment only: no DSH Session, model, GitHub API or real message delivery.
// Run with Node 24: node --experimental-transform-types deepseek-ticket-core-demo.mjs ./dsh-superagent-prototype
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const commit = '6337fc823ce20251c8de8085948165c81aaa701e';
if (!process.argv[2]) throw new Error('Pass the path to the pinned upstream checkout.');
const root = resolve(process.argv[2]);
const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
assert.equal(git('rev-parse', 'HEAD'), commit, 'Use the exact source revision in the article.');
// Refuse modified core files before importing code from the external checkout.
for (const name of readdirSync(join(root, 'src/core')).filter(name => name.endsWith('.ts'))) {
  const file = `src/core/${name}`;
  assert.equal(git('hash-object', file), git('rev-parse', `${commit}:${file}`), `Modified source: ${file}`);
}
const { Engine, MemoryRepositories, ticketStage } = await import(pathToFileURL(join(root, 'src/core/index.ts')).href);

function scenario(label, withPullRequest, closeOutcome) {
  const repo = new MemoryRepositories();
  const receipts = new Map();
  const launches = [];
  let tick = 0;
  const engine = new Engine({
    repo,
    // Stub ports: these do not test the real authorization policy, executor or channel.
    policy: () => ({ version: 'demo-policy', paused: false, evalTimeoutMs: 60000,
      gate: () => ({ admissible: true, strength: 'explicit', basis: { via: 'addressed', addressed: 'mention' } }),
      revalidate: () => true, admitsInferred: () => false }),
    scope: { scope: () => ({ listened: true, observed: false }) },
    assessor: { request() {} },
    executor: { start: (ticket, assignment) => launches.push([ticket.id, assignment.id]), deliver() {}, stop() {} },
    outbox: { send: message => { if (!receipts.has(message.id)) receipts.set(message.id, { ...message, status: 'pending' }); },
      status: id => receipts.get(id)?.status, withdraw: id => receipts.delete(id) },
    now: () => new Date(Date.UTC(2026, 10, 2, 0, 0, tick++)).toISOString(),
  });
  const trigger = { id: 'demo-request', source: 'github', threads: [{ source: 'github', id: 'demo-issue' }],
    actor: { source: 'github', id: 'demo-maintainer' }, human: true, at: '2026-11-02T00:00:00Z',
    text: 'Fix one documentation typo; open a PR for human review.', meta: {},
    channel: { source: 'github', thread: 'demo-issue', address: { issue: 'demo-issue' } } };
  const outcome = { kind: 'accept', title: 'Documentation typo', scope: 'One typo only', reason: 'Synthetic request', acknowledgement: 'Accepted in memory only.' };
  assert.equal(engine.receive(trigger), 'stored');
  assert.equal(engine.receive(trigger), 'duplicate');
  const decision = engine.decide(trigger.id, outcome);
  assert.equal(engine.decide(trigger.id, outcome).ticketId, decision.ticketId);
  assert.equal(repo.tickets.list().length, 1);
  assert.equal(launches.length, 1);
  const [ticketId, assignmentId] = launches[0];
  engine.assignmentStarted(ticketId, assignmentId);
  const pullRequest = { source: 'github', id: 'demo-pr' };
  if (withPullRequest) engine.bindThread(ticketId, pullRequest, true);
  engine.report(ticketId, { state: 'ready', summary: 'Synthetic work report, no real edit or PR.' });
  const readyTicket = repo.tickets.get(ticketId);
  const readyStage = ticketStage(readyTicket);
  assert.deepEqual(readyStage, withPullRequest ? { stage: 'person', action: 'review' } : { stage: 'ended' });
  engine.reply({ purpose: 'result', ticketId, text: 'Synthetic result, queued in memory only.' });
  const pendingReplies = [...receipts.values()].filter(receipt => receipt.kind === 'reply' && receipt.status === 'pending').length;
  assert.equal(pendingReplies, 1);
  assert.equal([...receipts.values()].some(receipt => receipt.status === 'sent'), false);
  if (withPullRequest) engine.threadClosed(pullRequest, closeOutcome, '2026-11-02T00:01:00Z');
  const finalOutcome = repo.tickets.get(ticketId).ended?.outcome;
  assert.equal(finalOutcome, withPullRequest ? closeOutcome : 'completed');
  return { label, ticketsAfterReplay: 1, readyStage, resultReceipt: 'pending', finalOutcome };
}

const results = [scenario('open PR then merge', true, 'merged'), scenario('open PR then close unmerged', true, 'closed'),
  scenario('no followed PR', false)];
console.log(JSON.stringify({ evidence: 'core-engine simulation with stubbed ports; not client success', commit,
  rejectedShortcuts: ['ready means completed', 'ended means merged', 'reply queued means delivered', 'replayed request needs another ticket'],
  results }, null, 2));
