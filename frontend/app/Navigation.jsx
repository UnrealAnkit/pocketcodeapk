"use client";

import { useEffect, useState } from "react";

const appRepo = "https://github.com/UnrealAnkit/pocketcodeapk";

export default function Navigation() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      document.querySelector(".nav")?.classList.toggle("scrolled", window.scrollY > 16);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMenu = () => setOpen(false);

  return (
    <nav className={`nav ${open ? "open" : ""}`}>
      <a className="brand" href="#top" onClick={closeMenu}>
        <i />
        <span>PocketCode</span>
      </a>

      <div className="links">
        <a href="#features" onClick={closeMenu}>
          Features
        </a>
        <a href="#how" onClick={closeMenu}>
          Story
        </a>
        <a href="#roadmap" onClick={closeMenu}>
          Roadmap
        </a>
        <a href={appRepo} target="_blank" rel="noreferrer">
          GitHub
        </a>
      </div>

      <a className="button button-secondary small-button nav-cta" href={appRepo} target="_blank" rel="noreferrer">
        Open repo
      </a>

      <button
        className="menu"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Toggle navigation"
        aria-expanded={open}
      >
        Menu
      </button>
    </nav>
  );
}
