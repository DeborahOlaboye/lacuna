"use client";

import { motion, type TargetAndTransition, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";
import { EclipseMark, Wordmark } from "./Header";

interface LandingPageProps {
  onConnect: () => void;
}

function RedactBar({ w = 54 }: { w?: number }) {
  return <span className="redact" style={{ width: w }} />;
}

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.65, delay, ease },
});

const inView = (delay = 0) => ({
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 } as TargetAndTransition,
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.65, delay, ease },
});

// Animated counter
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v).toLocaleString() + suffix);
  const [display, setDisplay] = useState("0" + suffix);
  useEffect(() => {
    const unsub = rounded.on("change", setDisplay);
    const ctrl = animate(mv, to, { duration: 1.8, ease: "easeOut" });
    return () => { ctrl.stop(); unsub(); };
  }, [mv, rounded, to]);
  return <span>{display}</span>;
}

// Typewriter
function Typewriter({ text, delay = 0 }: { text: string; delay?: number }) {
  const chars = text.split("");
  return (
    <motion.span
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      {chars.map((ch, i) => (
        <motion.span
          key={i}
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { delay: delay + i * 0.035 } },
          }}
        >
          {ch}
        </motion.span>
      ))}
    </motion.span>
  );
}

// Dot grid background
function DotGrid() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage: "radial-gradient(circle, rgba(157,140,255,.18) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
        maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
        WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
        animation: "grid-pulse 4s ease-in-out infinite",
        pointerEvents: "none",
      }}
    />
  );
}

export default function LandingPage({ onConnect }: LandingPageProps) {
  return (
    <div style={{ background: "#08080D", minHeight: "100vh", fontFamily: "var(--font-archivo), sans-serif", overflow: "hidden" }}>

      {/* Nav */}
      <motion.nav
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          rowGap: 10,
          padding: "18px clamp(16px,5vw,40px)",
          borderBottom: "1px solid rgba(255,255,255,.07)",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <EclipseMark size={26} id="ln-nav" />
          <Wordmark size={15} />
        </div>
        <motion.button
          onClick={onConnect}
          whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(157,140,255,.4)" }}
          whileTap={{ scale: 0.96 }}
          style={{
            font: "600 13px var(--font-archivo), sans-serif",
            color: "#08080D",
            background: "#9D8CFF",
            padding: "9px 20px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
          }}
        >
          Connect wallet
        </motion.button>
      </motion.nav>

      {/* Hero */}
      <div
        className="lac-hero-grid"
        style={{
          position: "relative",
          padding: "clamp(48px,10vw,92px) clamp(20px,6vw,64px) clamp(40px,8vw,84px)",
        }}
      >
        {/* Animated radial glow */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(900px 520px at 78% 40%, rgba(157,140,255,.11), transparent 65%)",
            pointerEvents: "none",
          }}
        />
        <DotGrid />

        <div style={{ display: "flex", flexDirection: "column", gap: 26, justifyContent: "center", position: "relative", zIndex: 1 }}>
          <motion.div
            {...fadeUp(0.1)}
            style={{ font: "600 11px var(--font-mono), monospace", letterSpacing: "0.24em", color: "#9D8CFF" }}
          >
            ZERO-KNOWLEDGE DARK POOL · STELLAR
          </motion.div>

          {/* Word-by-word h1 */}
          <motion.h1
            style={{
              fontFamily: "var(--font-serif), Georgia, serif",
              fontSize: "clamp(34px, 7vw, 62px)",
              fontWeight: 400,
              lineHeight: 1.06,
              color: "#ECEAF6",
              margin: 0,
            }}
          >
            {"The market can’t front-run ".split(" ").map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.08, ease }}
                style={{ display: "inline-block", marginRight: "0.28em" }}
              >
                {word}
              </motion.span>
            ))}
            <em style={{ color: "#9D8CFF" }}>
              {"what it can’t see.".split(" ").map((word, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 + i * 0.09, ease }}
                  style={{ display: "inline-block", marginRight: "0.28em" }}
                >
                  {word}
                </motion.span>
              ))}
            </em>
          </motion.h1>

          <motion.p
            {...fadeUp(0.7)}
            style={{ font: "400 16.5px/1.68 var(--font-archivo), sans-serif", color: "#9B99AF", maxWidth: 520, margin: 0, width: "100%" }}
          >
            Lacuna is a dark pool for institutional-size orders. You commit a hash,
            a permissionless matcher proves your match is valid, and Soroban settles
            it — price and size never touch the chain. Not before, not after.
          </motion.p>

          <motion.div {...fadeUp(0.82)} style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <motion.button
              onClick={onConnect}
              whileHover={{ scale: 1.05, boxShadow: "0 0 24px rgba(157,140,255,.5)" }}
              whileTap={{ scale: 0.96 }}
              style={{
                font: "600 14.5px var(--font-archivo), sans-serif",
                color: "#08080D",
                background: "#9D8CFF",
                padding: "13px 26px",
                borderRadius: 9,
                border: "none",
                cursor: "pointer",
              }}
            >
              Connect wallet
            </motion.button>
            <motion.a
              href="https://github.com/DeborahOlaboye/lacuna"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05, borderColor: "rgba(255,255,255,.4)" }}
              whileTap={{ scale: 0.96 }}
              style={{
                font: "600 14.5px var(--font-archivo), sans-serif",
                color: "#ECEAF6",
                border: "1px solid rgba(255,255,255,.16)",
                padding: "12px 24px",
                borderRadius: 9,
                textDecoration: "none",
              }}
            >
              GitHub
            </motion.a>
          </motion.div>
        </div>

        {/* Orbital graphic */}
        <div className="lac-orbital" style={{ position: "relative", minHeight: "clamp(300px, 60vw, 460px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
          {/* Outer ring — slow CW */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 42, repeat: Infinity, ease: "linear" }}
            style={{ position: "absolute", width: 430, height: 430, border: "1px solid rgba(157,140,255,.12)", borderRadius: "50%" }}
          >
            <div style={{
              position: "absolute", top: -5, left: "50%", transform: "translateX(-50%)",
              width: 10, height: 10, borderRadius: "50%",
              background: "#9D8CFF",
              boxShadow: "0 0 12px 4px rgba(157,140,255,.8)",
            }} />
          </motion.div>

          {/* Mid ring — CCW */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
            style={{ position: "absolute", width: 330, height: 330, border: "1px solid rgba(157,140,255,.18)", borderRadius: "50%" }}
          >
            <div style={{
              position: "absolute", top: -4, left: "50%", transform: "translateX(-50%)",
              width: 8, height: 8, borderRadius: "50%",
              background: "#C4B8FF",
              boxShadow: "0 0 10px 3px rgba(196,184,255,.75)",
            }} />
          </motion.div>

          {/* Inner ring — faster CW */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
            style={{ position: "absolute", width: 230, height: 230, border: "1px solid rgba(157,140,255,.26)", borderRadius: "50%" }}
          >
            <div style={{
              position: "absolute", top: -3, left: "50%", transform: "translateX(-50%)",
              width: 6, height: 6, borderRadius: "50%",
              background: "#ECEAF6",
              boxShadow: "0 0 8px 3px rgba(236,234,246,.7)",
            }} />
          </motion.div>

          {/* Center logo — reveal once, then breathe forever */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease }}
          >
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
            >
              <EclipseMark size={130} id="ln-hero" />
            </motion.div>
          </motion.div>

          {/* Floating commitment badge */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0, y: [0, -7, 0] }}
            transition={{
              opacity: { duration: 0.6, delay: 0.65 },
              x:       { duration: 0.6, delay: 0.65, ease },
              y:       { duration: 4.2, repeat: Infinity, ease: "easeInOut" },
            }}
            style={{
              position: "absolute", top: 36, left: 16,
              background: "#0E0E17",
              border: "1px solid rgba(255,255,255,.09)",
              borderRadius: 8, padding: "10px 14px",
              display: "flex", flexDirection: "column", gap: 6,
            }}
          >
            <span style={{ font: "500 9.5px var(--font-mono), monospace", letterSpacing: "0.12em", color: "#5D5B6E" }}>COMMITMENT</span>
            <span style={{ font: "500 11.5px var(--font-mono), monospace", color: "#9D8CFF" }}>0x1f4a…c9e2</span>
          </motion.div>

          {/* Floating price/size badge */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0, y: [0, 7, 0] }}
            transition={{
              opacity: { duration: 0.6, delay: 0.8 },
              x:       { duration: 0.6, delay: 0.8, ease },
              y:       { duration: 5, repeat: Infinity, ease: "easeInOut" },
            }}
            style={{
              position: "absolute", bottom: 118, right: 0,
              background: "#0E0E17",
              border: "1px solid rgba(255,255,255,.09)",
              borderRadius: 8, padding: "10px 14px",
              display: "flex", flexDirection: "column", gap: 7,
            }}
          >
            <span style={{ font: "500 9.5px var(--font-mono), monospace", letterSpacing: "0.12em", color: "#5D5B6E" }}>PRICE · SIZE</span>
            <span style={{ display: "flex", gap: 8 }}>
              <RedactBar w={54} />
              <RedactBar w={38} />
            </span>
          </motion.div>

          {/* Pairing check badge — typewriter reveal */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.95, ease }}
            style={{
              position: "absolute", bottom: 24, left: 64,
              background: "#0E0E17",
              border: "1px solid rgba(62,207,142,.25)",
              borderRadius: 8, padding: "10px 14px",
              display: "flex", alignItems: "center", gap: 8,
            }}
          >
            <motion.span
              animate={{ opacity: [1, 0.25, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              style={{ width: 6, height: 6, borderRadius: "50%", background: "#3ECF8E", display: "inline-block" }}
            />
            <span style={{ font: "500 11px var(--font-mono), monospace", color: "#3ECF8E" }}>
              <Typewriter text="pairing_check → OK" delay={1.2} />
            </span>
          </motion.div>
        </div>
      </div>

      {/* Stats ticker — animated counters */}
      <div
        style={{
          display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "12px clamp(20px,5vw,44px)",
          padding: "20px clamp(16px,5vw,40px)",
          borderTop: "1px solid rgba(255,255,255,.07)",
          borderBottom: "1px solid rgba(255,255,255,.07)",
          font: "500 11.5px var(--font-mono), monospace",
          letterSpacing: "0.14em", color: "#9B99AF",
          background: "#0A0A12",
        }}
      >
        {[
          { label: "CONSTRAINTS", to: 1411, suffix: "" },
          { label: "GROTH16 / BN254", to: null },
          { label: "POSEIDON NATIVE", to: null },
          { label: "PROTOCOL 25", to: null },
          { label: "PERMISSIONLESS", to: null },
        ].map((item, i) => (
          <motion.span
            key={item.label}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.09 }}
            style={{ display: "flex", alignItems: "center", gap: "clamp(20px,5vw,44px)", flexWrap: "wrap" }}
          >
            {i > 0 && <span style={{ color: "#5D5B6E" }}>◆</span>}
            {item.to !== null ? <><Counter to={item.to} /> {item.label}</> : item.label}
          </motion.span>
        ))}
      </div>

      {/* Three moves */}
      <div style={{ padding: "clamp(48px,9vw,84px) clamp(20px,6vw,64px) clamp(40px,8vw,76px)" }}>
        <motion.h2
          {...inView(0)}
          style={{ fontFamily: "var(--font-serif), Georgia, serif", fontSize: "clamp(28px,5vw,42px)", fontWeight: 400, lineHeight: 1.1, color: "#ECEAF6", marginBottom: 12 }}
        >
          Three moves. Zero disclosure.
        </motion.h2>
        <motion.p
          {...inView(0.1)}
          style={{ font: "400 15px/1.6 var(--font-archivo), sans-serif", color: "#9B99AF", marginBottom: 44, maxWidth: 560 }}
        >
          Every step is verifiable on-chain. No step reveals what you traded.
        </motion.p>
        <div className="lac-three-grid">
          {[
            {
              n: "01",
              title: "Commit",
              body: "Your order is hashed locally in the browser. Only the commitment and a deposit reach the chain — never the terms.",
              code: "Poseidon(price, amount, side, secret)",
            },
            {
              n: "02",
              title: "Prove",
              body: "Anyone can match two compatible commitments by generating a proof that the trade is fair — validity without visibility.",
              code: "Groth16 · 1,411 constraints · in-browser",
            },
            {
              n: "03",
              title: "Settle",
              body: "Soroban verifies one BN254 pairing and moves the tokens. Nullifiers close both orders. The book saw nothing.",
              code: "BN254 pairing_check · Protocol 25",
            },
          ].map((card, i) => (
            <motion.div
              key={card.n}
              initial={{ opacity: 0, y: 36 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: i * 0.13, ease }}
              whileHover={{ y: -6, boxShadow: "0 16px 48px rgba(157,140,255,.16)", borderColor: "rgba(157,140,255,.25)" }}
              style={{
                background: "#0E0E17",
                border: "1px solid rgba(255,255,255,.08)",
                borderRadius: 12,
                padding: "30px 28px",
                display: "flex", flexDirection: "column", gap: 14,
              }}
            >
              <motion.div
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.8 }}
                style={{ font: "600 12px var(--font-mono), monospace", color: "#9D8CFF" }}
              >
                {card.n}
              </motion.div>
              <div style={{ font: "600 20px var(--font-archivo), sans-serif", color: "#ECEAF6" }}>{card.title}</div>
              <div style={{ font: "400 13.5px/1.65 var(--font-archivo), sans-serif", color: "#9B99AF" }}>{card.body}</div>
              <div
                style={{
                  font: "500 11px var(--font-mono), monospace",
                  color: "#9D8CFF",
                  background: "rgba(157,140,255,.08)",
                  borderRadius: 6, padding: "9px 12px", marginTop: "auto",
                }}
              >
                <Typewriter text={card.code} delay={0.3 + i * 0.1} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Chain comparison */}
      <div style={{ padding: "0 clamp(20px,6vw,64px) clamp(48px,9vw,88px)" }}>
        <motion.h2
          {...inView(0)}
          style={{ fontFamily: "var(--font-serif), Georgia, serif", fontSize: "clamp(28px,5vw,42px)", fontWeight: 400, lineHeight: 1.1, color: "#ECEAF6", marginBottom: 44 }}
        >
          What the chain sees.
        </motion.h2>
        <div className="lac-two-grid">

          {/* Public order book */}
          <motion.div
            initial={{ opacity: 0, x: -36 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.65, ease }}
            style={{ border: "1px solid rgba(242,109,120,.2)", borderRadius: 12, padding: "26px 28px", background: "rgba(242,109,120,.03)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <span style={{ font: "600 13px var(--font-archivo), sans-serif", color: "#ECEAF6" }}>A public order book</span>
              <motion.span
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                style={{ font: "500 10px var(--font-mono), monospace", letterSpacing: "0.1em", color: "#F26D78", border: "1px solid rgba(242,109,120,.3)", padding: "4px 9px", borderRadius: 20 }}
              >
                FRONT-RUNNABLE
              </motion.span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: ".8fr 1fr 1fr 1.4fr", gap: 8, font: "500 10px var(--font-mono), monospace", letterSpacing: "0.1em", color: "#5D5B6E", paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,.07)" }}>
              <span>SIDE</span><span>PRICE</span><span>SIZE</span><span>TRADER</span>
            </div>
            {[
              { side: "BUY", price: "1.0100", size: "300,000", trader: "GDKF…R2LQ", sideColor: "#3ECF8E" },
              { side: "SELL", price: "1.0000", size: "300,000", trader: "GBLX…K3F7", sideColor: "#F26D78" },
            ].map((row, i) => (
              <motion.div
                key={row.side}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.15 + i * 0.1 }}
                style={{ display: "grid", gridTemplateColumns: ".8fr 1fr 1fr 1.4fr", gap: 8, font: "500 12.5px var(--font-mono), monospace", color: "#ECEAF6", padding: "13px 0", borderBottom: "1px solid rgba(255,255,255,.05)" }}
              >
                <span style={{ color: row.sideColor }}>{row.side}</span>
                <span>{row.price}</span>
                <span>{row.size}</span>
                <span style={{ color: "#9B99AF" }}>{row.trader}</span>
              </motion.div>
            ))}
            <p style={{ font: "400 12px/1.6 var(--font-archivo), sans-serif", color: "#9B99AF", marginTop: 18 }}>
              Every bot sees your intent the moment you place it — and trades against you before you fill.
            </p>
          </motion.div>

          {/* Lacuna */}
          <motion.div
            initial={{ opacity: 0, x: 36 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.65, delay: 0.1, ease }}
            style={{ border: "1px solid rgba(157,140,255,.28)", borderRadius: 12, padding: "26px 28px", background: "rgba(157,140,255,.04)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <span style={{ font: "600 13px var(--font-archivo), sans-serif", color: "#ECEAF6" }}>Lacuna</span>
              <span style={{ font: "500 10px var(--font-mono), monospace", letterSpacing: "0.1em", color: "#9D8CFF", border: "1px solid rgba(157,140,255,.35)", padding: "4px 9px", borderRadius: 20 }}>
                NOTHING TO EXPLOIT
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: ".8fr 1fr 1fr 1.4fr", gap: 8, font: "500 10px var(--font-mono), monospace", letterSpacing: "0.1em", color: "#5D5B6E", paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,.07)" }}>
              <span>SIDE</span><span>PRICE</span><span>SIZE</span><span>COMMITMENT</span>
            </div>
            {["0x1f4a…c9e2", "0x8c2d…44b1"].map((commitment, i) => (
              <motion.div
                key={commitment}
                initial={{ opacity: 0, x: 10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.25 + i * 0.1 }}
                style={{ display: "grid", gridTemplateColumns: ".8fr 1fr 1fr 1.4fr", gap: 8, alignItems: "center", padding: "13px 0", borderBottom: "1px solid rgba(255,255,255,.05)" }}
              >
                <RedactBar w={30} />
                <RedactBar w={46} />
                <RedactBar w={52} />
                <span style={{ font: "500 12.5px var(--font-mono), monospace", color: "#9D8CFF" }}>{commitment}</span>
              </motion.div>
            ))}
            <p style={{ font: "400 12px/1.6 var(--font-archivo), sans-serif", color: "#9B99AF", marginTop: 18 }}>
              Two hashes. One proof. Even the matcher never learns your price — only that the math holds.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", rowGap: 14, padding: "26px clamp(16px,5vw,40px)", borderTop: "1px solid rgba(255,255,255,.07)" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <EclipseMark size={20} color="#5D5B6E" id="ln-footer" />
        </div>
        <div style={{ display: "flex", gap: 24, font: "500 12px var(--font-archivo), sans-serif", color: "#5D5B6E" }}>
          <a href="https://github.com/DeborahOlaboye/lacuna" target="_blank" rel="noopener noreferrer" style={{ color: "#5D5B6E", textDecoration: "none" }}>
            GitHub
          </a>
          <span>Circuit</span>
          <a href="https://stellar.expert/explorer/testnet/contract/CBSCCHS6HTZWS6YDIU6MOBGGA4654XLIMRI7F3YVPGB2DG3N4WBCMFJF" target="_blank" rel="noopener noreferrer" style={{ color: "#5D5B6E", textDecoration: "none" }}>
            Contracts
          </a>
        </div>
      </motion.footer>
    </div>
  );
}
