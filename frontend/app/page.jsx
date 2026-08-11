"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll, useSpring, useTransform } from "framer-motion";
import Lenis from "lenis";
import Navigation from "./Navigation";

const repo = "https://github.com/UnrealAnkit/pocketcodeapk/tree/main/frontend";
const appRepo = "https://github.com/UnrealAnkit/pocketcodeapk";

const featureCards = [
  {
    title: "Live Terminal",
    copy: "A real PTY-backed terminal, not a static screenshot. Scroll, type, resize, and keep your tools alive.",
  },
  {
    title: "Agent Oversight",
    copy: "Watch Claude and Codex work from your phone, approve risky actions, and stay in control without babysitting.",
  },
  {
    title: "Files and Git",
    copy: "Open files, inspect diffs, stage work, and push changes without losing the context of your machine.",
  },
  {
    title: "Direct Pairing",
    copy: "Tunnel into your own environment with pairing QR flows built around real developer setups.",
  },
];

const statusRail = [
  "PTY terminal sessions",
  "Multi-tab terminal control",
  "Git status and diffs",
  "File browsing",
  "Agent activity view",
  "Approvals on mobile",
];

const screenOrder = ["Approval", "Terminal", "Files", "Git", "Agent"];

export default function Home() {
  const spotlight = useRef(null);
  const [screenIndex, setScreenIndex] = useState(0);
  const [approval, setApproval] = useState(false);
  const { scrollYProgress } = useScroll({
    target: spotlight,
    offset: ["start start", "end end"],
  });

  const phoneY = useTransform(scrollYProgress, [0, 1], [90, -70]);
  const phoneRotate = useTransform(scrollYProgress, [0, 1], [-11, 0]);
  const desktopY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const desktopRotate = useTransform(scrollYProgress, [0, 1], [8, 2]);
  const orbScale = useTransform(scrollYProgress, [0, 1], [1, 1.25]);
  const orbOpacity = useTransform(scrollYProgress, [0, 1], [0.55, 0.85]);

  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    let frame = 0;
    const loop = (time) => {
      lenis.raf(time);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    const nextIndex = Math.min(screenOrder.length - 1, Math.floor(value * screenOrder.length));
    setScreenIndex(nextIndex);
  });

  const activeScreen = screenOrder[screenIndex];

  return (
    <div className="site">
      <div className="aurora aurora-a" />
      <div className="aurora aurora-b" />
      <div className="grid-haze" />
      <Navigation />

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <motion.p
              className="eyebrow"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              PocketCode beta
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 34 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.08 }}
            >
              A glassy control room
              <br />
              for your code editor.
            </motion.h1>
            <motion.p
              className="lede"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.16 }}
            >
              PocketCode turns your phone into a premium remote surface for your
              terminal, files, Git workflow, and coding agents.
            </motion.p>
            <motion.div
              className="hero-actions"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.24 }}
            >
              <a className="button button-primary" href={appRepo} target="_blank" rel="noreferrer">
                View repository
              </a>
              <a className="button button-secondary" href={repo} target="_blank" rel="noreferrer">
                Frontend source
              </a>
            </motion.div>
            <motion.div
              className="hero-metrics"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.32 }}
            >
              <Metric value="Direct" label="phone to machine pairing" />
              <Metric value="Live" label="terminal + agent visibility" />
              <Metric value="Beta" label="shipping in public right now" />
            </motion.div>
          </div>

          <div className="hero-stage" ref={spotlight}>
            <motion.div
              className="hero-orb"
              style={{ scale: orbScale, opacity: orbOpacity }}
            />
            <motion.div
              className="hero-desktop"
              style={{ y: desktopY, rotateX: desktopRotate }}
            >
              <DesktopPanel />
            </motion.div>
            <motion.div
              className="hero-phone"
              style={{ y: phoneY, rotateY: phoneRotate }}
            >
              <PhonePanel activeScreen={activeScreen} approval={approval} />
            </motion.div>
            <motion.div className="floating-chip chip-left" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
              <span>Realtime sessions</span>
              <strong>PTY + agent aware</strong>
            </motion.div>
            <motion.div className="floating-chip chip-right" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}>
              <span>Current view</span>
              <strong>{activeScreen}</strong>
            </motion.div>
          </div>
        </section>

        <section id="how" className="story-grid">
          <div className="story-copy">
            <p className="eyebrow">How it feels</p>
            <h2>Quiet glass, vivid color, real control.</h2>
            <p>
              The product should feel less like a dashboard and more like an Apple-style
              companion surface: layered glass, soft lighting, smooth transitions, and
              interfaces that make serious developer work feel calm.
            </p>
          </div>

          <div className="story-cards">
            {featureCards.map((item, index) => (
              <motion.article
                key={item.title}
                className="glass-card"
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.6, delay: index * 0.08 }}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </motion.article>
            ))}
          </div>
        </section>

        <section id="features" className="showcase">
          <div className="showcase-panel">
            <div className="panel-copy">
              <p className="eyebrow">Product showcase</p>
              <h2>The mobile surface tracks what matters.</h2>
              <p>
                PocketCode is strongest when the machine stays powerful and the phone stays
                focused. You do not need to recreate the whole desktop. You need the right
                parts at the right moment.
              </p>
              <div className="status-rail">
                {statusRail.map((item) => (
                  <div key={item} className="status-item">
                    <i />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <motion.div
              className="panel-preview"
              initial={{ opacity: 0, x: 34 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7 }}
            >
              <PreviewCard />
            </motion.div>
          </div>
        </section>

        <section className="oversight">
          <div className="oversight-copy">
            <p className="eyebrow">Approval flow</p>
            <h2>Your agent can keep moving without going rogue.</h2>
            <p>
              PocketCode keeps the human in the loop. Risky actions stay visible, approvals
              feel immediate, and the interface makes waiting states clear instead of noisy.
            </p>
            <button className="button button-primary small-button" type="button" onClick={() => setApproval((value) => !value)}>
              {approval ? "Reset approval demo" : "Approve demo action"}
            </button>
          </div>

          <motion.div
            className="approval-stage"
            animate={{
              boxShadow: approval
                ? "0 30px 80px rgba(65, 185, 125, 0.18)"
                : "0 30px 80px rgba(51, 112, 255, 0.14)",
            }}
          >
            <div className="timeline-line" />
            <TimelineStep title="Session opened" meta="09:41" />
            <TimelineStep title="Agent inspected repository" meta="09:42" />
            <TimelineStep title="Prepared command" meta="09:44" />
            <motion.div
              className={`approval-block ${approval ? "is-approved" : ""}`}
              animate={{
                borderColor: approval ? "rgba(53, 190, 124, 0.55)" : "rgba(95, 165, 255, 0.45)",
                backgroundColor: approval ? "rgba(17, 56, 37, 0.72)" : "rgba(12, 23, 43, 0.78)",
              }}
            >
              <small>{approval ? "Approved" : "Waiting for your decision"}</small>
              <strong>npm install</strong>
              <p>Dependency changes need a human check before the run continues.</p>
              <span>{approval ? "Execution resumed" : "Execution paused"}</span>
            </motion.div>
            <TimelineStep title={approval ? "Tests resumed" : "Tests paused"} meta="09:46" active={approval} />
          </motion.div>
        </section>

        <section id="roadmap" className="roadmap">
          <p className="eyebrow">Built in public</p>
          <h2>Already useful. Still getting sharper.</h2>
          <div className="roadmap-track">
            <RoadmapNode label="Foundation" state="done" />
            <RoadmapNode label="Beta polish" state="current" />
            <RoadmapNode label="More workflows" state="next" />
            <RoadmapNode label="More platforms" state="future" />
          </div>
        </section>

        <section className="closing">
          <div className="closing-card">
            <p className="eyebrow">Open source</p>
            <h2>Built for developers who want less friction.</h2>
            <p>
              The frontend is now brighter, smoother, and more premium, while the product story
              stays anchored in what PocketCode actually does today.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href={appRepo} target="_blank" rel="noreferrer">
                Explore PocketCode
              </a>
              <a className="button button-secondary" href={repo} target="_blank" rel="noreferrer">
                View frontend folder
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <strong>PocketCode</strong>
        <span>Control your code editor from your phone.</span>
        <a href={appRepo} target="_blank" rel="noreferrer">
          GitHub
        </a>
      </footer>
    </div>
  );
}

function Metric({ value, label }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function DesktopPanel() {
  return (
    <div className="desktop-shell">
      <div className="window-bar">
        <span className="window-dots">
          <i />
          <i />
          <i />
        </span>
        <b>pocketcodeapk / session.ts</b>
        <small>Live machine</small>
      </div>

      <div className="desktop-grid">
        <aside className="desktop-sidebar">
          <small>Workspace</small>
          <span>android</span>
          <span>docs</span>
          <strong>extension</strong>
          <span>frontend</span>
          <span>tools</span>
        </aside>

        <div className="desktop-main">
          <div className="desktop-tabs">
            <span className="active">session.ts</span>
            <span>agent-detector.ts</span>
            <span>protocol.ts</span>
          </div>

          <pre className="code-block">
            <span>const session = await server.start({`{`}</span>
            <span>  host: &quot;127.0.0.1&quot;,</span>
            <span>  tunnel: &quot;cloudflare&quot;,</span>
            <span>  features: [&quot;pty&quot;, &quot;agent-events&quot;],</span>
            <span>{`}`});</span>
          </pre>

          <div className="desktop-console">
            <label>Remote session</label>
            <p>Phone paired. Tunnel alive. Agent stream detected.</p>
            <strong>Tests passing in active workspace.</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function PhonePanel({ activeScreen, approval }) {
  return (
    <div className="phone-shell">
      <div className="phone-top">
        <span>9:41</span>
        <span>LTE</span>
      </div>
      <div className="phone-island" />
      <div className="phone-header">
        <strong>PocketCode</strong>
        <i />
      </div>
      <div className="phone-screen">
        <label>{activeScreen} view</label>
        {activeScreen === "Approval" && <ApprovalScreen approval={approval} />}
        {activeScreen === "Terminal" && <TerminalScreen />}
        {activeScreen === "Files" && <FilesScreen />}
        {activeScreen === "Git" && <GitScreen />}
        {activeScreen === "Agent" && <AgentScreen />}
      </div>
      <div className="phone-dock">
        <span>Agent</span>
        <span>Terminal</span>
        <span>Files</span>
        <span>Git</span>
      </div>
    </div>
  );
}

function ApprovalScreen({ approval }) {
  return (
    <div className={`mini-card ${approval ? "mini-approved" : ""}`}>
      <small>{approval ? "Approved command" : "Action required"}</small>
      <strong>npm install</strong>
      <p>Review dependency changes before the agent continues.</p>
      <div className="mini-actions">
        <button type="button">Reject</button>
        <button type="button" className="primary">
          {approval ? "Approved" : "Approve"}
        </button>
      </div>
    </div>
  );
}

function TerminalScreen() {
  return (
    <pre className="phone-pre">
      <span>$ git status</span>
      <strong>On branch main</strong>
      <span>$ npm test</span>
      <strong>PASS 60 tests</strong>
      <span>$ codex</span>
      <em>Analyzing repository...</em>
    </pre>
  );
}

function FilesScreen() {
  return (
    <div className="phone-list">
      <span>pocketcodeapk</span>
      <span> android</span>
      <span> extension</span>
      <strong> frontend</strong>
      <span> tools</span>
    </div>
  );
}

function GitScreen() {
  return (
    <div className="git-card">
      <strong>Branch main</strong>
      <small>3 changed files</small>
      <p>
        <i>- old transport</i>
        <b>+ real PTY path</b>
      </p>
      <div className="mini-actions">
        <button type="button">Stage</button>
        <button type="button" className="primary">
          Push
        </button>
      </div>
    </div>
  );
}

function AgentScreen() {
  return (
    <div className="agent-card">
      <strong>Claude Code</strong>
      <small>Running</small>
      <p>Reading package.json</p>
      <p>Editing terminal manager</p>
      <p>Running verification</p>
    </div>
  );
}

function PreviewCard() {
  return (
    <div className="preview-card">
      <div className="preview-row">
        <div>
          <small>Machine</small>
          <strong>Connected</strong>
        </div>
        <div>
          <small>Latency</small>
          <strong>Realtime feel</strong>
        </div>
      </div>
      <div className="preview-terminal">
        <span>~/pocketcodeapk</span>
        <p>$ claude</p>
        <strong>Agent event stream active</strong>
      </div>
      <div className="preview-footer">
        <span>Files</span>
        <span>Terminal</span>
        <span>Approvals</span>
      </div>
    </div>
  );
}

function TimelineStep({ title, meta, active = false }) {
  return (
    <div className={`timeline-step ${active ? "active" : ""}`}>
      <i />
      <div>
        <strong>{title}</strong>
        <span>{meta}</span>
      </div>
    </div>
  );
}

function RoadmapNode({ label, state }) {
  return (
    <div className={`roadmap-node ${state}`}>
      <i />
      <span>{label}</span>
    </div>
  );
}
