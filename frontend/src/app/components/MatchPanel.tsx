"use client";

import { useState } from "react";
import type { Order, MatchResult } from "../lib/types";
import { generateMatchProof, accountToField } from "../lib/circuit";
import { EclipseMark } from "./Header";

interface MatchPanelProps {
  orders: Order[];
  selectedIds: number[];
  onMatchComplete: (result: MatchResult) => void;
  onClose: () => void;
}

type Phase = "idle" | "witness" | "proof" | "submitting" | "success" | "error";

const CIRCUIT_CHECKS = [
  "Both commitments open correctly",
  "Buyer's bid ≥ seller's ask",
  "Settlement price sits inside the spread",
  "Both amounts cover the fill",
  "Nullifiers derived — no replay possible",
];

export default function MatchPanel({ orders, selectedIds, onMatchComplete, onClose }: MatchPanelProps) {
  const [phase, setPhase]               = useState<Phase>("idle");
  const [error, setError]               = useState<string | null>(null);
  const [result, setResult]             = useState<MatchResult | null>(null);
  const [elapsed, setElapsed]           = useState(0);
  const [proofLines, setProofLines]     = useState<string[]>([]);

  const orderA = orders.find((o) => o.id === selectedIds[0]);
  const orderB = orders.find((o) => o.id === selectedIds[1]);

  const buyOrder  = orderA?.side === "BUY" ? orderA : orderB;
  const sellOrder = orderA?.side === "SELL" ? orderA : orderB;

  const priceCompatible =
    buyOrder?._price !== undefined &&
    sellOrder?._price !== undefined &&
    buyOrder._price >= sellOrder._price;

  const canSubmit = buyOrder && sellOrder && phase === "idle";

  async function handleMatch() {
    if (!canSubmit || !buyOrder || !sellOrder) return;
    if (!buyOrder._price || !buyOrder._amount || !buyOrder._secret) return;
    if (!sellOrder._price || !sellOrder._amount || !sellOrder._secret) return;

    setError(null);
    setPhase("witness");

    const t0 = Date.now();
    const timer = setInterval(() => setElapsed(Date.now() - t0), 500);

    try {
      const settlementPrice  = (buyOrder._price + sellOrder._price) / 2n;
      const settlementAmount = buyOrder._amount < sellOrder._amount ? buyOrder._amount : sellOrder._amount;
      const buyerHash        = await accountToField(buyOrder.trader);
      const sellerHash       = await accountToField(sellOrder.trader);

      setPhase("proof");
      const proofOutput = await generateMatchProof(
        { price: buyOrder._price,  amount: buyOrder._amount,  secret: buyOrder._secret,  traderHash: buyerHash  },
        { price: sellOrder._price, amount: sellOrder._amount, secret: sellOrder._secret, traderHash: sellerHash },
        { price: settlementPrice, amount: settlementAmount }
      );

      setProofLines([
        `pi_a = [0x${proofOutput.proof.pi_a[0].slice(0, 8)}…, 0x${proofOutput.proof.pi_a[1].slice(0, 8)}…]`,
        `pi_b = [[0x${proofOutput.proof.pi_b[0][0].slice(0, 8)}…, …], […]]`,
        `pi_c = [0x${proofOutput.proof.pi_c[0].slice(0, 8)}…, 0x${proofOutput.proof.pi_c[1].slice(0, 8)}…]`,
      ]);

      setPhase("submitting");
      // Demo: simulate Stellar tx submission (replace with actual SDK call for production)
      await new Promise((r) => setTimeout(r, 1500));

      clearInterval(timer);
      const matchResult: MatchResult = {
        orderIdA:        buyOrder.id,
        orderIdB:        sellOrder.id,
        settlementPrice,
        settlementAmount,
        txHash:          proofOutput.nullifierA.slice(0, 20),
        proofValid:      true,
      };
      setResult(matchResult);
      setPhase("success");
      onMatchComplete(matchResult);
    } catch (err: unknown) {
      clearInterval(timer);
      setError(err instanceof Error ? err.message : "Proof generation failed");
      setPhase("error");
    }
  }

  const elapsedSec = (elapsed / 1000).toFixed(1);

  // Settlement success view
  if (phase === "success" && result) {
    return (
      <div
        style={{
          background: "#08080D",
          border: "1px solid rgba(255,255,255,.09)",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "44px 40px 36px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            background: "radial-gradient(420px 240px at 50% 0%, rgba(62,207,142,.08), transparent 70%)",
          }}
        >
          <div style={{ position: "relative", width: 88, height: 88, marginBottom: 10 }}>
            <EclipseMark size={88} color="#3ECF8E" id="settle-mark" />
            <span
              style={{
                position: "absolute",
                right: -2,
                top: -2,
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "#08080D",
                border: "2px solid #3ECF8E",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                font: "700 14px var(--font-archivo), sans-serif",
                color: "#3ECF8E",
              }}
            >
              ✓
            </span>
          </div>
          <h2
            style={{
              fontFamily: "var(--font-serif), Georgia, serif",
              fontSize: 32,
              color: "#ECEAF6",
              margin: 0,
            }}
          >
            Matched in the dark.
          </h2>
          <p style={{ font: "400 13px/1.6 var(--font-archivo), sans-serif", color: "#9B99AF", textAlign: "center", maxWidth: 380, margin: 0 }}>
            Proof verified on-chain. Tokens transferred. The order book saw two hashes and a
            proof — nothing else.
          </p>
        </div>

        <div style={{ padding: "0 40px 8px" }}>
          <div style={{ border: "1px solid rgba(255,255,255,.09)", borderRadius: 12, overflow: "hidden" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "13px 18px",
                background: "rgba(62,207,142,.05)",
                borderBottom: "1px solid rgba(255,255,255,.07)",
              }}
            >
              <span style={{ font: "500 10px var(--font-mono), monospace", letterSpacing: "0.12em", color: "#3ECF8E" }}>
                YOUR FILL — VISIBLE ONLY TO YOU
              </span>
            </div>
            {[
              ["Settlement price", `${(Number(result.settlementPrice) / 1e6).toFixed(6)} XLM`],
              ["Filled", `${(Number(result.settlementAmount) / 1e6).toFixed(2)} XLM`],
              ["Proof time", `${elapsedSec}s`],
              ["Nullifier stored", "✓ order closed"],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "13px 18px",
                  borderBottom: "1px solid rgba(255,255,255,.05)",
                }}
              >
                <span style={{ font: "400 12px var(--font-archivo), sans-serif", color: "#9B99AF" }}>{label}</span>
                <span style={{ font: "500 13px var(--font-mono), monospace", color: label === "Nullifier stored" ? "#3ECF8E" : "#ECEAF6" }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, padding: "20px 40px 22px" }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              textAlign: "center",
              font: "600 13.5px var(--font-archivo), sans-serif",
              color: "#08080D",
              background: "#ECEAF6",
              padding: "13px 0",
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
            }}
          >
            Back to the book
          </button>
        </div>

        <p style={{ textAlign: "center", font: "500 10px var(--font-mono), monospace", letterSpacing: "0.1em", color: "#44424F", padding: "0 40px 24px" }}>
          ON-CHAIN FOOTPRINT: 2 COMMITMENTS · 1 PROOF · 2 TRANSFERS · NOTHING ELSE
        </p>
      </div>
    );
  }

  // Proof pipeline view
  return (
    <div
      style={{
        background: "#08080D",
        border: "1px solid rgba(255,255,255,.07)",
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 28px",
          borderBottom: "1px solid rgba(255,255,255,.07)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <span style={{ fontFamily: "var(--font-serif), Georgia, serif", fontSize: 24, color: "#ECEAF6" }}>Match &amp; prove</span>
          {buyOrder && sellOrder && (
            <span style={{ font: "400 12px var(--font-archivo), sans-serif", color: "#5D5B6E" }}>
              #{String(orders.indexOf(buyOrder!) + 1).padStart(2, "0")} ×{" "}
              #{String(orders.indexOf(sellOrder!) + 1).padStart(2, "0")}
            </span>
          )}
        </div>
        <span
          style={{
            font: "500 9.5px var(--font-mono), monospace",
            letterSpacing: "0.12em",
            color: "#9B99AF",
            border: "1px solid rgba(255,255,255,.14)",
            padding: "5px 11px",
            borderRadius: 20,
          }}
        >
          MATCHER MODE · PERMISSIONLESS
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "400px 1fr" }}>
        {/* Left: order cards + circuit checks */}
        <div
          style={{
            padding: "26px 28px",
            borderRight: "1px solid rgba(255,255,255,.07)",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Order A */}
          <div
            style={{
              background: "#0E0E17",
              border: "1px solid rgba(62,207,142,.25)",
              borderRadius: 12,
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ font: "600 10px var(--font-mono), monospace", letterSpacing: "0.12em", color: "#3ECF8E" }}>
                ORDER A · BUY SIDE
              </span>
            </div>
            <div style={{ font: "500 13px var(--font-mono), monospace", color: "#ECEAF6", wordBreak: "break-all" }}>
              {buyOrder
                ? "0x" + BigInt(buyOrder.commitment).toString(16).padStart(64, "0").slice(0, 8) + "…" + BigInt(buyOrder.commitment).toString(16).padStart(64, "0").slice(-4)
                : "—"}
            </div>
            {buyOrder && (
              <div style={{ display: "flex", justifyContent: "space-between", font: "400 11px var(--font-archivo), sans-serif", color: "#9B99AF" }}>
                <span>{buyOrder.trader.slice(0, 4)}…{buyOrder.trader.slice(-4)}</span>
                <span>deposit {(Number(buyOrder.deposit) / 1e6).toFixed(2)}</span>
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 6px" }}>
            <span style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(62,207,142,.4), rgba(157,140,255,.5))" }} />
            <span style={{ font: "500 10px var(--font-mono), monospace", letterSpacing: "0.1em", color: "#9D8CFF" }}>
              OPENINGS SUPPLIED LOCALLY ✓
            </span>
            <span style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(157,140,255,.5), rgba(242,109,120,.4))" }} />
          </div>

          {/* Order B */}
          <div
            style={{
              background: "#0E0E17",
              border: "1px solid rgba(242,109,120,.25)",
              borderRadius: 12,
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ font: "600 10px var(--font-mono), monospace", letterSpacing: "0.12em", color: "#F26D78" }}>
                ORDER B · SELL SIDE
              </span>
            </div>
            <div style={{ font: "500 13px var(--font-mono), monospace", color: "#ECEAF6", wordBreak: "break-all" }}>
              {sellOrder
                ? "0x" + BigInt(sellOrder.commitment).toString(16).padStart(64, "0").slice(0, 8) + "…" + BigInt(sellOrder.commitment).toString(16).padStart(64, "0").slice(-4)
                : "—"}
            </div>
            {sellOrder && (
              <div style={{ display: "flex", justifyContent: "space-between", font: "400 11px var(--font-archivo), sans-serif", color: "#9B99AF" }}>
                <span>{sellOrder.trader.slice(0, 4)}…{sellOrder.trader.slice(-4)}</span>
                <span>deposit {(Number(sellOrder.deposit) / 1e6).toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Circuit checks */}
          <div style={{ marginTop: 6 }}>
            <div style={{ font: "600 10px var(--font-mono), monospace", letterSpacing: "0.14em", color: "#5D5B6E", marginBottom: 12 }}>
              THE CIRCUIT WILL PROVE — WITHOUT REVEALING
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {CIRCUIT_CHECKS.map((check) => (
                <div key={check} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: "rgba(157,140,255,.15)",
                      color: "#9D8CFF",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      font: "700 9px var(--font-archivo), sans-serif",
                      flexShrink: 0,
                    }}
                  >
                    ✓
                  </span>
                  <span style={{ font: "400 12px var(--font-archivo), sans-serif", color: "#9B99AF" }}>{check}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Price compatibility */}
          {buyOrder?._price && sellOrder?._price && !priceCompatible && (
            <div
              style={{
                background: "rgba(242,109,120,.07)",
                border: "1px solid rgba(242,109,120,.25)",
                borderRadius: 10,
                padding: "12px 14px",
                font: "500 12px var(--font-archivo), sans-serif",
                color: "#F26D78",
              }}
            >
              No match — buyer bid below seller ask
            </div>
          )}
        </div>

        {/* Right: pipeline steps */}
        <div style={{ padding: "26px 28px", display: "flex", flexDirection: "column", gap: 0 }}>
          {[
            {
              key: "witness",
              label: "Witness computed",
              sub: "Private inputs assembled in-browser",
              done: ["proof", "submitting", "success"].includes(phase),
              active: phase === "witness",
            },
            {
              key: "proof",
              label: "Generating Groth16 proof…",
              sub: "snarkjs · 1,411 constraints · typically 15–30s",
              done: ["submitting", "success"].includes(phase),
              active: phase === "proof",
            },
            {
              key: "submitting",
              label: "Submit to Soroban",
              sub: "match_orders(proof, pub_signals)",
              done: phase === "success",
              active: phase === "submitting",
            },
            {
              key: "verify",
              label: "On-chain verification",
              sub: "BN254 pairing_check — one host call",
              done: phase === "success",
              active: false,
            },
            {
              key: "settle",
              label: "Settlement",
              sub: "Tokens transferred · nullifiers stored · orders closed",
              done: phase === "success",
              active: false,
            },
          ].map((step, i, arr) => (
            <div key={step.key} style={{ display: "flex", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                {step.done ? (
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "#3ECF8E",
                      color: "#08080D",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      font: "700 11px var(--font-archivo), sans-serif",
                      flexShrink: 0,
                    }}
                  >
                    ✓
                  </span>
                ) : step.active ? (
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      border: "2px solid #9D8CFF",
                      boxSizing: "border-box",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#9D8CFF" }} />
                  </span>
                ) : (
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      border: "1.5px solid rgba(255,255,255,.18)",
                      boxSizing: "border-box",
                      flexShrink: 0,
                    }}
                  />
                )}
                {i < arr.length - 1 && (
                  <span
                    style={{
                      width: 1.5,
                      flex: 1,
                      background: step.done ? "rgba(62,207,142,.4)" : "rgba(255,255,255,.1)",
                    }}
                  />
                )}
              </div>
              <div style={{ paddingBottom: 20, flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span
                    style={{
                      font: "600 13.5px var(--font-archivo), sans-serif",
                      color: step.done ? "#ECEAF6" : step.active ? "#9D8CFF" : "#5D5B6E",
                    }}
                  >
                    {step.label}
                  </span>
                  {step.active && phase === "proof" && (
                    <span style={{ font: "500 11px var(--font-mono), monospace", color: "#9D8CFF" }}>{elapsedSec}s</span>
                  )}
                  {step.done && step.key === "witness" && (
                    <span style={{ font: "500 11px var(--font-mono), monospace", color: "#3ECF8E" }}>✓</span>
                  )}
                </div>
                <div
                  style={{
                    font: "400 11.5px var(--font-archivo), sans-serif",
                    color: step.active ? "#5D5B6E" : "#44424F",
                    marginTop: 3,
                  }}
                >
                  {step.sub}
                </div>

                {/* Proof output */}
                {step.key === "proof" && phase === "proof" && proofLines.length > 0 && (
                  <div
                    style={{
                      background: "#0A0A12",
                      border: "1px solid rgba(255,255,255,.08)",
                      borderRadius: 9,
                      padding: "12px 14px",
                      marginTop: 12,
                      font: "400 10.5px/1.75 var(--font-mono), monospace",
                      color: "#5D5B6E",
                    }}
                  >
                    {proofLines.map((line) => (
                      <div key={line}>
                        <span style={{ color: "#9D8CFF" }}>{line.split("=")[0]}</span>
                        = {line.split("=").slice(1).join("=")}
                      </div>
                    ))}
                    {!["submitting", "success"].includes(phase) && (
                      <div>
                        <span style={{ color: "#9D8CFF" }}>pi_c</span>
                        = computing<span style={{ color: "#9D8CFF" }}>▊</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {phase === "error" && (
            <div
              style={{
                background: "rgba(242,109,120,.07)",
                border: "1px solid rgba(242,109,120,.25)",
                borderRadius: 10,
                padding: "12px 14px",
                font: "500 12px var(--font-archivo), sans-serif",
                color: "#F26D78",
                marginTop: 8,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 20 }}>
            <span style={{ font: "400 11px var(--font-archivo), sans-serif", color: "#5D5B6E" }}>
              {phase === "proof" ? "You can leave this page — the proof runs locally." : ""}
            </span>
            {phase === "idle" || phase === "error" ? (
              <button
                onClick={handleMatch}
                disabled={!canSubmit || !priceCompatible}
                style={{
                  font: "600 13.5px var(--font-archivo), sans-serif",
                  color: "#08080D",
                  background: canSubmit && priceCompatible ? "#9D8CFF" : "rgba(157,140,255,.3)",
                  padding: "12px 24px",
                  borderRadius: 9,
                  border: "none",
                  cursor: canSubmit && priceCompatible ? "pointer" : "default",
                }}
              >
                {phase === "error" ? "Retry" : "Generate proof & match"}
              </button>
            ) : phase !== "success" ? (
              <button
                onClick={onClose}
                style={{
                  font: "600 12.5px var(--font-archivo), sans-serif",
                  color: "#9B99AF",
                  border: "1px solid rgba(255,255,255,.12)",
                  borderRadius: 8,
                  padding: "10px 16px",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                Abort
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
