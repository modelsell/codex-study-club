import type { Metadata } from "next";
import { Check, Circle, GitPullRequest, Play, Terminal } from "lucide-react";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function VisualsPage() {
  return (
    <main className="visuals-page">
      <section className="case-visual visual-first" data-visual="first-verifiable-task">
        <div className="visual-window">
          <div className="visual-topbar">
            <div className="window-dots"><i /><i /><i /></div>
            <span>第一次任务</span>
            <div className="visual-state"><Circle size={8} fill="currentColor" /> 已完成</div>
          </div>
          <div className="visual-split">
            <div className="visual-chat">
              <span className="visual-label">任务</span>
              <h2>创建一个可以记录日常支出的页面</h2>
              <p>包含新增、删除和本月汇总。完成后启动页面并检查结果。</p>
              <div className="visual-response">
                <span><Check size={15} /> 已创建 4 个文件</span>
                <span><Check size={15} /> 交互检查通过</span>
                <button><Play size={14} fill="currentColor" /> 打开预览</button>
              </div>
            </div>
            <div className="expense-preview">
              <div className="expense-head"><span>JULY / 2026</span><strong>本月支出</strong><b>¥ 3,428.00</b></div>
              <div className="expense-bars"><i /><i /><i /><i /><i /><i /><i /></div>
              <div className="expense-row"><span>工作午餐</span><b>¥ 58.00</b></div>
              <div className="expense-row"><span>软件订阅</span><b>¥ 148.00</b></div>
              <div className="expense-row"><span>交通</span><b>¥ 36.00</b></div>
            </div>
          </div>
        </div>
      </section>

      <section className="case-visual visual-ci" data-visual="diagnose-ci-failure">
        <div className="visual-window dark-window">
          <div className="visual-topbar dark-topbar">
            <div className="window-dots"><i /><i /><i /></div>
            <span>CI failure · auth-session</span>
            <div className="visual-state success"><Circle size={8} fill="currentColor" /> Checks passed</div>
          </div>
          <div className="terminal-layout">
            <div className="terminal-sidebar">
              <span className="visual-label">WORKFLOW</span>
              <div className="job failed"><Circle size={9} fill="currentColor" /> test / auth</div>
              <div className="job"><Check size={13} /> lint</div>
              <div className="job"><Check size={13} /> typecheck</div>
            </div>
            <div className="terminal-main">
              <div className="terminal-title"><Terminal size={16} /> pnpm test auth</div>
              <pre><span className="muted">FAIL</span> src/auth/session.test.ts{`\n`}Expected: authenticated{`\n`}Received: anonymous{`\n\n`}<b>Root cause</b>{`\n`}session restore runs after route guard{`\n\n`}<em>✓ 12 tests passed in 2.31s</em></pre>
              <div className="pr-line"><GitPullRequest size={18} /><span>fix/auth-session-restore</span><b>+18 −4</b></div>
            </div>
          </div>
        </div>
      </section>

      <section className="case-visual visual-skill" data-visual="reusable-review-skill">
        <div className="visual-window skill-window">
          <div className="skill-grid">
            <div className="skill-file">
              <span className="visual-label">SKILL.md</span>
              <h2>Evidence-first review</h2>
              <div className="code-lines">
                <i style={{ width: "94%" }} /><i style={{ width: "72%" }} /><i style={{ width: "85%" }} />
                <i style={{ width: "54%" }} /><i style={{ width: "80%" }} /><i style={{ width: "65%" }} />
              </div>
              <div className="skill-command">$ codex review --changes</div>
            </div>
            <div className="review-output">
              <div className="review-head"><span>Review result</span><b>2 findings</b></div>
              <div className="finding high"><span>P1</span><div><strong>权限校验发生在数据读取之后</strong><p>src/api/project.ts · line 48</p></div></div>
              <div className="finding medium"><span>P2</span><div><strong>缺少刷新恢复状态的测试</strong><p>src/auth/session.test.ts · line 91</p></div></div>
              <div className="review-foot"><Check size={16} /> 证据、位置和验证建议已补齐</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
