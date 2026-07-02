"use client";

import { EclipseMark } from "./Header";

interface WalletModalProps {
  onConnect: (address: string) => void;
  onClose: () => void;
}

export default function WalletModal({ onConnect, onClose }: WalletModalProps) {
  function demoMode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let addr = "G";
    for (let i = 0; i < 55; i++) addr += chars[Math.floor(Math.random() * chars.length)];
    onConnect(addr);
  }

  const wallets = [
    { letter: "F", name: "Freighter", recommended: true },
    { letter: "X", name: "xBull", recommended: false },
    { letter: "A", name: "Albedo", recommended: false },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(5,5,9,.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          width: 420,
          background: "#0E0E17",
          border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 16,
          padding: 32,
          boxShadow: "0 30px 80px rgba(0,0,0,.7)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginBottom: 26 }}>
          <EclipseMark size={44} id="wm-logo" />
          <h2 style={{ fontFamily: "var(--font-serif), Georgia, serif", fontSize: 26, color: "#ECEAF6", margin: 0 }}>
            Connect a wallet
          </h2>
          <p style={{ font: "400 12.5px/1.6 var(--font-archivo), sans-serif", color: "#9B99AF", textAlign: "center", margin: 0 }}>
            Orders are hashed locally before anything leaves your browser. Lacuna never sees your
            keys — or your prices.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {wallets.map((w) => (
            <button
              key={w.name}
              onClick={demoMode}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 16px",
                border: w.recommended ? "1px solid rgba(157,140,255,.35)" : "1px solid rgba(255,255,255,.1)",
                borderRadius: 11,
                background: w.recommended ? "rgba(157,140,255,.06)" : "transparent",
                cursor: "pointer",
                width: "100%",
                textAlign: "left",
              }}
            >
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: "#12121D",
                  border: "1px solid rgba(255,255,255,.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  font: "700 14px var(--font-archivo), sans-serif",
                  color: w.recommended ? "#9D8CFF" : "#9B99AF",
                  flexShrink: 0,
                }}
              >
                {w.letter}
              </span>
              <span style={{ font: "600 14px var(--font-archivo), sans-serif", color: "#ECEAF6" }}>{w.name}</span>
              {w.recommended && (
                <span
                  style={{
                    marginLeft: "auto",
                    font: "500 9.5px var(--font-mono), monospace",
                    letterSpacing: "0.1em",
                    color: "#9D8CFF",
                    border: "1px solid rgba(157,140,255,.35)",
                    padding: "3px 8px",
                    borderRadius: 20,
                  }}
                >
                  RECOMMENDED
                </span>
              )}
            </button>
          ))}

          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0" }}>
            <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,.08)" }} />
            <span style={{ font: "500 10px var(--font-mono), monospace", letterSpacing: "0.14em", color: "#5D5B6E" }}>OR</span>
            <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,.08)" }} />
          </div>

          <button
            onClick={demoMode}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "13px 16px",
              border: "1px dashed rgba(255,255,255,.18)",
              borderRadius: 11,
              background: "transparent",
              cursor: "pointer",
              width: "100%",
            }}
          >
            <span style={{ font: "600 13.5px var(--font-archivo), sans-serif", color: "#9B99AF" }}>
              Demo mode — generate a test address
            </span>
          </button>
        </div>

        <p style={{ textAlign: "center", font: "500 10px var(--font-mono), monospace", letterSpacing: "0.12em", color: "#5D5B6E", marginTop: 22 }}>
          YOUR KEYS STAY IN YOUR WALLET
        </p>
      </div>
    </div>
  );
}
