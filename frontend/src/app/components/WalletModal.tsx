"use client";

import { useState } from "react";
import { EclipseMark } from "./Header";
import { connectWallet } from "../lib/stellar";

interface WalletModalProps {
  onConnect: (address: string) => void;
  onClose: () => void;
}

export default function WalletModal({ onConnect, onClose }: WalletModalProps) {
  const [status, setStatus] = useState<"idle" | "connecting" | "error">("idle");
  const [error, setError]   = useState<string | null>(null);

  async function handleConnect() {
    setStatus("connecting");
    setError(null);
    try {
      // Opens the Stellar Wallets Kit multi-wallet picker modal.
      // Supports Freighter, xBull, Albedo, WalletConnect, Ledger, etc.
      const address = await connectWallet();
      onConnect(address);
    } catch (err: unknown) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Wallet connection failed");
    }
  }

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
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          width: 420,
          background: "#0E0E17",
          border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 16,
          padding: 36,
          boxShadow: "0 30px 80px rgba(0,0,0,.7)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
        }}
      >
        <EclipseMark size={48} id="wm-logo" />

        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontFamily: "var(--font-serif), Georgia, serif", fontSize: 26, color: "#ECEAF6", margin: "0 0 8px" }}>
            Connect a wallet
          </h2>
          <p style={{ font: "400 12.5px/1.65 var(--font-archivo), sans-serif", color: "#9B99AF", margin: 0 }}>
            Orders are hashed locally before anything leaves your browser.
            Lacuna never sees your keys — or your prices.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              width: "100%",
              background: "rgba(242,109,120,.08)",
              border: "1px solid rgba(242,109,120,.3)",
              borderRadius: 10,
              padding: "12px 14px",
              font: "400 12px/1.5 var(--font-archivo), sans-serif",
              color: "#F26D78",
            }}
          >
            {error}
          </div>
        )}

        {/* Connect button — triggers Stellar Wallets Kit modal */}
        <button
          onClick={handleConnect}
          disabled={status === "connecting"}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: "16px 0",
            background: status === "connecting" ? "rgba(157,140,255,.3)" : "#9D8CFF",
            border: "none",
            borderRadius: 12,
            font: "600 15px var(--font-archivo), sans-serif",
            color: "#08080D",
            cursor: status === "connecting" ? "default" : "pointer",
            transition: "background .15s",
          }}
        >
          {status === "connecting" ? (
            <>
              <span
                style={{
                  width: 14,
                  height: 14,
                  border: "2px solid rgba(8,8,13,.3)",
                  borderTop: "2px solid #08080D",
                  borderRadius: "50%",
                  display: "inline-block",
                  animation: "spin .7s linear infinite",
                }}
              />
              Opening wallet picker…
            </>
          ) : (
            "Connect wallet"
          )}
        </button>

        <div style={{ width: "100%", textAlign: "center" }}>
          <p style={{ font: "400 11.5px/1.55 var(--font-archivo), sans-serif", color: "#5D5B6E", margin: "0 0 12px" }}>
            Supports Freighter, xBull, Albedo, WalletConnect, Ledger &amp; more via Stellar Wallets Kit.
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,.08)" }} />
            <span style={{ font: "500 10px var(--font-mono), monospace", letterSpacing: "0.14em", color: "#5D5B6E" }}>OR</span>
            <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,.08)" }} />
          </div>

          <button
            onClick={() => {
              // Demo mode — random G-address for UI testing without a real wallet
              const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
              let addr = "G";
              for (let i = 0; i < 55; i++) addr += chars[Math.floor(Math.random() * chars.length)];
              onConnect(addr);
            }}
            style={{
              width: "100%",
              padding: "12px 0",
              border: "1px dashed rgba(255,255,255,.18)",
              borderRadius: 10,
              background: "transparent",
              font: "500 13px var(--font-archivo), sans-serif",
              color: "#9B99AF",
              cursor: "pointer",
            }}
          >
            Demo mode — generate a test address
          </button>
        </div>

        <p style={{ font: "500 9.5px var(--font-mono), monospace", letterSpacing: "0.14em", color: "#44424F", margin: 0 }}>
          YOUR KEYS STAY IN YOUR WALLET
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
