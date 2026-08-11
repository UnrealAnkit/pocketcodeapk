"use client";

import { useEffect, useState } from "react";

const repo = "https://github.com/UnrealAnkit/pocketcodeapk";

export default function Navigation() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => document.querySelector(".nav")?.classList.toggle("scrolled", window.scrollY > 12);
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return <nav className={`nav ${open ? "open" : ""}`}>
    <a className="brand" href="#top"><i>⌘</i>PocketCode</a>
    <div className="links"><a onClick={() => setOpen(false)} href="#features">Features</a><a onClick={() => setOpen(false)} href="#how">How it works</a><a onClick={() => setOpen(false)} href="#roadmap">Roadmap</a><a href={repo} target="_blank" rel="noreferrer">GitHub ↗</a></div>
    <div className="nav-actions">
      <a className="button small" href={repo} target="_blank" rel="noreferrer">Try Beta →</a>
      <button className="menu" type="button" onClick={() => setOpen(!open)} aria-label="Toggle navigation" aria-expanded={open}>{open ? "✕" : "☰"}</button>
    </div>
  </nav>;
}
