"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Lenis from "lenis";
import Navigation from "./Navigation";

const repo = "https://github.com/UnrealAnkit/pocketcodeapk";
const screens = ["APPROVAL", "TERMINAL", "FILES", "GIT", "AGENT"];
const capabilities = ["REAL PTY", "MULTI-TAB", "FILES", "GIT", "AGENTS", "NOTIFICATIONS", "MULTI-MACHINE", "TUNNELS"];

export default function Home() {
  const [cursor, setCursor] = useState({ x: 0, y: 0, label: "" });
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    let id;
    const tick = t => {
      lenis.raf(t);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(id);
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTab(prev => (prev + 1) % screens.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div onPointerMove={e => setCursor(c => ({ ...c, x: e.clientX, y: e.clientY }))} className="site">
      <motion.div className="cursor" animate={{ x: cursor.x - 10, y: cursor.y - 10, scale: cursor.label ? 2.2 : 1 }}>
        <span>{cursor.label}</span>
      </motion.div>
      <div className="atmosphere"><i /><i /></div>
      <Navigation />
      <main id="top">
        {/* HERO SECTION */}
        <section className="hero">
          <div className="hero-copy">
            <p className="kicker">● OPEN SOURCE REMOTE CONTROL FOR YOUR DEV ENVIRONMENT</p>
            <h1>Control your code editor<br /><em>from your phone.</em></h1>
            <p className="lede">Your terminal, files, Git, and AI agents. Anywhere.</p>
            <div className="actions">
              <a onPointerEnter={() => setCursor(c => ({ ...c, label: "GO" }))} onPointerLeave={() => setCursor(c => ({ ...c, label: "" }))} className="button" href={repo} target="_blank" rel="noreferrer">TRY THE BETA <b>→</b></a>
              <a onPointerEnter={() => setCursor(c => ({ ...c, label: "VIEW" }))} onPointerLeave={() => setCursor(c => ({ ...c, label: "" }))} className="button quiet" href={repo} target="_blank" rel="noreferrer">VIEW ON GITHUB</a>
            </div>
          </div>
          <div className="hero-product">
            <div className="desktop-ui">
              <Desktop />
              <span className="machine-label">LOCAL MACHINE</span>
            </div>
            <div className="phone-ui">
              <Phone activeIndex={activeTab} />
              <span className="pocket-label">POCKETCODE</span>
            </div>
            <div className="connection">
              <small>DIRECT CONNECTION</small>
              <i />
            </div>
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section id="how" className="how-section">
          <header className="how-header">
            <p className="kicker">● HOW IT WORKS</p>
            <h2>Your machine doesn&apos;t need a browser.<br /><em>It just needs a way to reach you.</em></h2>
            <div className="tab-buttons">
              {screens.map((tab, idx) => (
                <button key={tab} type="button" className={activeTab === idx ? "active" : ""} onClick={() => setActiveTab(idx)}>
                  {tab}
                </button>
              ))}
            </div>
          </header>
        </section>

        <TerminalScene />
        <AgentScene />

        {/* WORKING FEATURES */}
        <section id="features" className="working">
          <header>
            <p className="kicker">● WORKING NOW</p>
            <h2>Already working.<br />Still shipping.</h2>
            <p>PocketCode is currently in beta. Here&apos;s what you can use today.</p>
          </header>
          <div className="feature-rail">
            {capabilities.map((item, i) => (
              <motion.article key={item} whileHover={{ scale: 1.03 }}>
                <span>0{i + 1}</span>
                <b>{item}</b>
                <i>● WORKING NOW</i>
                <p>{item === "AGENTS" ? "Timeline, cost tracking, approval and rejection." : item === "TUNNELS" ? "Tailscale, devtunnel, and SSH reverse tunnels." : "Built around your existing local development environment."}</p>
              </motion.article>
            ))}
          </div>
        </section>

        {/* ROADMAP */}
        <section id="roadmap" className="roadmap">
          <p className="kicker">● BUILT IN PUBLIC</p>
          <h2>And we&apos;re not done.</h2>
          <p className="sub">PocketCode is actively being built in public.</p>
          <div className="line">
            <span />
            <article><b>PAST</b><p>Foundation</p></article>
            <article className="current"><b>CURRENT</b><p>Beta</p></article>
            <article><b>NEXT</b><p>More workflows</p></article>
            <article><b>FUTURE</b><p>More platforms</p></article>
          </div>
          <div className="future-words">
            <span>MORE AGENT WORKFLOWS</span>
            <span>BETTER MOBILE EDITING</span>
            <span>MORE INTEGRATIONS</span>
            <span>MORE REMOTE CONTROLS</span>
          </div>
        </section>

        {/* OPEN SOURCE */}
        <section className="oss">
          <div className="github-window">
            <header><span>● ● ●</span><b>github.com / UnrealAnkit / pocketcodeapk</b></header>
            <main>
              <p><b>UnrealAnkit / pocketcodeapk</b><i>Public</i></p>
              <div><span>MIT</span><span>Kotlin</span><span>TypeScript</span><span>Python</span><span>Shell</span></div>
              <hr />
              <p className="readme"># PocketCode<br /><small>Control your code editor from your phone.</small></p>
            </main>
          </div>
          <div>
            <p className="kicker">● OPEN SOURCE</p>
            <h2>Built in public.</h2>
            <p>PocketCode is open source. Try it, break it, improve it, or just tell us what sucks.</p>
            <div className="actions">
              <a className="button quiet" href={repo} target="_blank" rel="noreferrer">VIEW ON GITHUB</a>
              <a className="text-link" href={repo} target="_blank" rel="noreferrer">TRY THE BETA →</a>
            </div>
          </div>
        </section>

        {/* CLOSING */}
        <section className="closing" onPointerMove={e => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`); e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`); }}>
          <div>
            <p className="kicker">● BETA</p>
            <h2>Take your development<br />environment with you.</h2>
            <p>PocketCode is in beta.</p>
            <div className="actions">
              <a className="button" href={repo} target="_blank" rel="noreferrer">TRY THE BETA <b>→</b></a>
              <a className="text-link" href={repo} target="_blank" rel="noreferrer">VIEW SOURCE →</a>
            </div>
          </div>
        </section>
      </main>
      <footer>
        <b>⌘ PocketCode</b>
        <span>Control your code editor from your phone.</span>
        <a href={repo} target="_blank" rel="noreferrer">GitHub</a>
        <a href={repo} target="_blank" rel="noreferrer">Documentation</a>
        <a href={repo} target="_blank" rel="noreferrer">Security</a>
        <small>BETA</small>
      </footer>
    </div>
  );
}

function Desktop() {
  return (
    <div className="desktop-shell">
      <header><span>● ● ●</span><b>pocketcodeapk — server.ts</b><small>⌘ P</small></header>
      <div className="workspace">
        <aside>
          <small>EXPLORER</small>
          <b>⌄ POCKETCODEAPK</b>
          <span>⌄ android</span>
          <span>⌄ docs</span>
          <strong>⌄ extension</strong>
          <em> server.ts</em>
          <span> protocol.ts</span>
          <span>⌄ tools</span>
        </aside>
        <article>
          <nav>server.ts agent-detector.ts</nav>
          <pre><i>12</i> <mark>const</mark> session = <mark>await</mark> server.start(&#123;{"\n"}<i>13</i> host: <q>&apos;127.0.0.1&apos;</q>,{"\n"}<i>14</i> tunnel: <q>&apos;tailscale&apos;</q>,{"\n"}<i>15</i> &#125;);</pre>
          <div className="desk-terminal">
            <b>~/Projects/pocketcodeapk main</b><br />
            $ npm test<br />
            <strong>✓ PASS 60 tests passed</strong>
            <p>✦ Claude Code <span>Analyzing repository...</span></p>
          </div>
        </article>
      </div>
    </div>
  );
}

function Phone({ activeIndex = 0 }) {
  const title = screens[activeIndex] || "APPROVAL";
  return (
    <div className="phone-shell">
      <div className="notch" />
      <small>9:41 ⌘ POCKETCODE</small>
      <h4>⌘ <b>PocketCode</b><i>● CONNECTED</i></h4>
      <div className="phone-screen">
        <label>{title === "APPROVAL" ? "MACBOOK PRO · CONNECTED" : `POCKETCODE · ${title}`}</label>
        {title === "TERMINAL" && <pre>~/pocketcodeapk<br />$ git status<br /><b>On branch main</b><br />$ npm test<br /><strong>PASS</strong><em>_</em></pre>}
        {title === "FILES" && <div className="phone-files">⌄ pocketcodeapk<br /> ⌄ android<br /> ⌄ docs<br /> ⌄ extension<br />  <b>server.ts</b><br /> ⌄ tools</div>}
        {title === "GIT" && <div className="phone-git"><b>main</b><small>3 changed files</small><p><i>−</i> const host = oldHost<br /><strong>+</strong> const host = tunnelHost</p><button type="button">STAGE</button> <button type="button">PUSH</button></div>}
        {title === "AGENT" && <div className="phone-agent"><b>✦ Claude Code</b><small>● RUNNING</small><p>Reading package.json<br />Editing server.ts<br />Running tests</p></div>}
        {title === "APPROVAL" && <div className="approval-card"><small>✦ CLAUDE CODE</small><p>Action required</p><code>npm install</code><div><button type="button">REJECT</button><button type="button">APPROVE</button></div></div>}
      </div>
      <footer>⌨ ▱ ⌘ ✦</footer>
    </div>
  );
}

function TerminalScene() {
  return (
    <section className="terminal-scene">
      <div>
        <p className="kicker">● LIVE TERMINAL</p>
        <h2>A real terminal.<br />Not a screenshot.</h2>
        <p>Control the terminal running on your machine, remotely.</p>
      </div>
      <pre>
        <span>~/Projects/pocketcodeapk</span>{"\n"}
        $ git status{"\n"}
        On branch main{"\n\n"}
        $ npm test{"\n"}
        <b>PASS 60 tests passed</b>{"\n\n"}
        $ claude{"\n"}
        <i>Analyzing repository...</i>{"\n"}
        <em>_</em>
      </pre>
    </section>
  );
}

function AgentScene() {
  const [approved, setApproved] = useState(false);
  return (
    <section className="agent-scene">
      <div className="agent-copy">
        <p className="kicker">● AGENT OVERSIGHT</p>
        <h2>Your agent keeps working.<br /><em>You stay in control.</em></h2>
        <p>Monitor what your coding agent is doing and step in when it needs you.</p>
      </div>
      <div className="timeline">
        <span>09:41 Started session</span>
        <span>09:42 Read package.json</span>
        <span>09:43 Modified server.ts</span>
        <span>09:44 Ran tests</span>
        <motion.div animate={{ borderColor: approved ? "#45d483" : "#f5a524" }}>
          <small>{approved ? "APPROVED" : "WAITING FOR APPROVAL"}</small>
          <b>npm install</b>
          <button type="button" onClick={() => setApproved(true)}>{approved ? "APPROVED ✓" : "APPROVE"}</button>
        </motion.div>
        <span className={approved ? "resumed" : ""}>09:46 {approved ? "Running tests" : "Paused for you"}</span>
      </div>
    </section>
  );
}
