"use client";

import { EclipseMark, Wordmark } from "./Header";

interface LandingPageProps {
  onConnect: () => void;
}

function RedactBar({ w = 54 }: { w?: number }) {
  return (
    <span
      className="redact"
      style={{ width: w }}
    />
  );
}

export default function LandingPage({ onConnect }: LandingPageProps) {
  return (
    <div style={{ background: "#08080D", minHeight: "100vh", fontFamily: "var(--font-archivo), sans-serif" }}>
      {/* Nav */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 40px",
          borderBottom: "1px solid rgba(255,255,255,.07)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <EclipseMark size={26} id="ln-nav" />
          <Wordmark size={15} />
        </div>
        <button
          onClick={onConnect}
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
        </button>
      </nav>

      {/* Hero */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.05fr .95fr",
          gap: 24,
          padding: "92px 64px 84px",
          background: "radial-gradient(900px 520px at 78% 40%, rgba(157,140,255,.09), transparent 65%)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 26, justifyContent: "center" }}>
          <div
            style={{
              font: "600 11px var(--font-mono), monospace",
              letterSpacing: "0.24em",
              color: "#9D8CFF",
            }}
          >
            ZERO-KNOWLEDGE DARK POOL · STELLAR
          </div>
          <h1
            style={{
              fontFamily: "var(--font-serif), Georgia, serif",
              fontSize: 62,
              fontWeight: 400,
              lineHeight: 1.04,
              color: "#ECEAF6",
              margin: 0,
            }}
          >
            The market can&rsquo;t front-run{" "}
            <em style={{ color: "#9D8CFF" }}>what it can&rsquo;t see.</em>
          </h1>
          <p
            style={{
              font: "400 16.5px/1.68 var(--font-archivo), sans-serif",
              color: "#9B99AF",
              maxWidth: 520,
              margin: 0,
            }}
          >
            Lacuna is a dark pool for institutional-size orders. You commit a hash,
            a permissionless matcher proves your match is valid, and Soroban settles
            it — price and size never touch the chain. Not before, not after.
          </p>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <button
              onClick={onConnect}
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
            </button>
            <a
              href="https://github.com/DeborahOlaboye/lacuna"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                font: "600 14.5px var(--font-archivo), sans-serif",
                color: "#ECEAF6",
                border: "1px solid rgba(255,255,255,.16)",
                padding: "12px 24px",
                borderRadius: 9,
                textDecoration: "none",
              }}
            >
              github
            </a>
          </div>
          <div
            style={{
              font: "500 10.5px var(--font-mono), monospace",
              letterSpacing: "0.12em",
              color: "#5D5B6E",
            }}
          >
            SUBMITTED TO STELLAR HACKS: REAL-WORLD ZK · JUNE 2026
          </div>
        </div>

        {/* Orbital graphic */}
        <div style={{ position: "relative", minHeight: 460, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", width: 430, height: 430, border: "1px solid rgba(157,140,255,.10)", borderRadius: "50%" }} />
          <div style={{ position: "absolute", width: 330, height: 330, border: "1px solid rgba(157,140,255,.16)", borderRadius: "50%" }} />
          <div style={{ position: "absolute", width: 230, height: 230, border: "1px solid rgba(157,140,255,.24)", borderRadius: "50%" }} />
          <EclipseMark size={130} id="ln-hero" />
          {/* Floating commitment */}
          <div
            style={{
              position: "absolute",
              top: 36,
              left: 16,
              background: "#0E0E17",
              border: "1px solid rgba(255,255,255,.09)",
              borderRadius: 8,
              padding: "10px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <span style={{ font: "500 9.5px var(--font-mono), monospace", letterSpacing: "0.12em", color: "#5D5B6E" }}>COMMITMENT</span>
            <span style={{ font: "500 11.5px var(--font-mono), monospace", color: "#9D8CFF" }}>0x1f4a…c9e2</span>
          </div>
          {/* Floating redacted values */}
          <div
            style={{
              position: "absolute",
              bottom: 118,
              right: 0,
              background: "#0E0E17",
              border: "1px solid rgba(255,255,255,.09)",
              borderRadius: 8,
              padding: "10px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 7,
            }}
          >
            <span style={{ font: "500 9.5px var(--font-mono), monospace", letterSpacing: "0.12em", color: "#5D5B6E" }}>PRICE · SIZE</span>
            <span style={{ display: "flex", gap: 8 }}>
              <RedactBar w={54} />
              <RedactBar w={38} />
            </span>
          </div>
          {/* Pairing check badge */}
          <div
            style={{
              position: "absolute",
              bottom: 24,
              left: 64,
              background: "#0E0E17",
              border: "1px solid rgba(62,207,142,.25)",
              borderRadius: 8,
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3ECF8E" }} />
            <span style={{ font: "500 11px var(--font-mono), monospace", color: "#3ECF8E" }}>pairing_check → OK</span>
          </div>
        </div>
      </div>

      {/* Stats ticker */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 44,
          padding: "20px 40px",
          borderTop: "1px solid rgba(255,255,255,.07)",
          borderBottom: "1px solid rgba(255,255,255,.07)",
          font: "500 11.5px var(--font-mono), monospace",
          letterSpacing: "0.14em",
          color: "#9B99AF",
          background: "#0A0A12",
        }}
      >
        {["1,411 CONSTRAINTS", "GROTH16 / BN254", "POSEIDON NATIVE", "PROTOCOL 25", "PERMISSIONLESS MATCHING"].map(
          (s, i) => (
            <span key={s} style={{ display: "flex", alignItems: "center", gap: 44 }}>
              {i > 0 && <span style={{ color: "#5D5B6E" }}>◆</span>}
              {s}
            </span>
          )
        )}
      </div>

      {/* Three moves */}
      <div style={{ padding: "84px 64px 76px" }}>
        <h2
          style={{
            fontFamily: "var(--font-serif), Georgia, serif",
            fontSize: 42,
            fontWeight: 400,
            lineHeight: 1.1,
            color: "#ECEAF6",
            marginBottom: 12,
          }}
        >
          Three moves. Zero disclosure.
        </h2>
        <p style={{ font: "400 15px/1.6 var(--font-archivo), sans-serif", color: "#9B99AF", marginBottom: 44, maxWidth: 560 }}>
          Every step is verifiable on-chain. No step reveals what you traded.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
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
          ].map((card) => (
            <div
              key={card.n}
              style={{
                background: "#0E0E17",
                border: "1px solid rgba(255,255,255,.08)",
                borderRadius: 12,
                padding: "30px 28px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div style={{ font: "600 12px var(--font-mono), monospace", color: "#9D8CFF" }}>{card.n}</div>
              <div style={{ font: "600 20px var(--font-archivo), sans-serif", color: "#ECEAF6" }}>{card.title}</div>
              <div style={{ font: "400 13.5px/1.65 var(--font-archivo), sans-serif", color: "#9B99AF" }}>{card.body}</div>
              <div
                style={{
                  font: "500 11px var(--font-mono), monospace",
                  color: "#9D8CFF",
                  background: "rgba(157,140,255,.08)",
                  borderRadius: 6,
                  padding: "9px 12px",
                  marginTop: "auto",
                }}
              >
                {card.code}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chain comparison */}
      <div style={{ padding: "0 64px 88px" }}>
        <h2
          style={{
            fontFamily: "var(--font-serif), Georgia, serif",
            fontSize: 42,
            fontWeight: 400,
            lineHeight: 1.1,
            color: "#ECEAF6",
            marginBottom: 44,
          }}
        >
          What the chain sees.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Public order book */}
          <div
            style={{
              border: "1px solid rgba(242,109,120,.2)",
              borderRadius: 12,
              padding: "26px 28px",
              background: "rgba(242,109,120,.03)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <span style={{ font: "600 13px var(--font-archivo), sans-serif", color: "#ECEAF6" }}>A public order book</span>
              <span
                style={{
                  font: "500 10px var(--font-mono), monospace",
                  letterSpacing: "0.1em",
                  color: "#F26D78",
                  border: "1px solid rgba(242,109,120,.3)",
                  padding: "4px 9px",
                  borderRadius: 20,
                }}
              >
                FRONT-RUNNABLE
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: ".8fr 1fr 1fr 1.4fr",
                gap: 8,
                font: "500 10px var(--font-mono), monospace",
                letterSpacing: "0.1em",
                color: "#5D5B6E",
                paddingBottom: 10,
                borderBottom: "1px solid rgba(255,255,255,.07)",
              }}
            >
              <span>SIDE</span><span>PRICE</span><span>SIZE</span><span>TRADER</span>
            </div>
            {[
              { side: "BUY", price: "1.0100", size: "300,000", trader: "GDKF…R2LQ", sideColor: "#3ECF8E" },
              { side: "SELL", price: "1.0000", size: "300,000", trader: "GBLX…K3F7", sideColor: "#F26D78" },
            ].map((row) => (
              <div
                key={row.side}
                style={{
                  display: "grid",
                  gridTemplateColumns: ".8fr 1fr 1fr 1.4fr",
                  gap: 8,
                  font: "500 12.5px var(--font-mono), monospace",
                  color: "#ECEAF6",
                  padding: "13px 0",
                  borderBottom: "1px solid rgba(255,255,255,.05)",
                }}
              >
                <span style={{ color: row.sideColor }}>{row.side}</span>
                <span>{row.price}</span>
                <span>{row.size}</span>
                <span style={{ color: "#9B99AF" }}>{row.trader}</span>
              </div>
            ))}
            <p style={{ font: "400 12px/1.6 var(--font-archivo), sans-serif", color: "#9B99AF", marginTop: 18 }}>
              Every bot sees your intent the moment you place it — and trades against you before you fill.
            </p>
          </div>

          {/* Lacuna */}
          <div
            style={{
              border: "1px solid rgba(157,140,255,.28)",
              borderRadius: 12,
              padding: "26px 28px",
              background: "rgba(157,140,255,.04)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <span style={{ font: "600 13px var(--font-archivo), sans-serif", color: "#ECEAF6" }}>Lacuna</span>
              <span
                style={{
                  font: "500 10px var(--font-mono), monospace",
                  letterSpacing: "0.1em",
                  color: "#9D8CFF",
                  border: "1px solid rgba(157,140,255,.35)",
                  padding: "4px 9px",
                  borderRadius: 20,
                }}
              >
                NOTHING TO EXPLOIT
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: ".8fr 1fr 1fr 1.4fr",
                gap: 8,
                font: "500 10px var(--font-mono), monospace",
                letterSpacing: "0.1em",
                color: "#5D5B6E",
                paddingBottom: 10,
                borderBottom: "1px solid rgba(255,255,255,.07)",
              }}
            >
              <span>SIDE</span><span>PRICE</span><span>SIZE</span><span>COMMITMENT</span>
            </div>
            {["0x1f4a…c9e2", "0x8c2d…44b1"].map((commitment) => (
              <div
                key={commitment}
                style={{
                  display: "grid",
                  gridTemplateColumns: ".8fr 1fr 1fr 1.4fr",
                  gap: 8,
                  alignItems: "center",
                  padding: "13px 0",
                  borderBottom: "1px solid rgba(255,255,255,.05)",
                }}
              >
                <RedactBar w={30} />
                <RedactBar w={46} />
                <RedactBar w={52} />
                <span style={{ font: "500 12.5px var(--font-mono), monospace", color: "#9D8CFF" }}>{commitment}</span>
              </div>
            ))}
            <p style={{ font: "400 12px/1.6 var(--font-archivo), sans-serif", color: "#9B99AF", marginTop: 18 }}>
              Two hashes. One proof. Even the matcher never learns your price — only that the math holds.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "26px 40px",
          borderTop: "1px solid rgba(255,255,255,.07)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <EclipseMark size={20} color="#5D5B6E" id="ln-footer" />
          <span style={{ font: "500 11px var(--font-mono), monospace", color: "#5D5B6E" }}>
            HACKATHON PROTOTYPE · UNAUDITED
          </span>
        </div>
        <div style={{ display: "flex", gap: 24, font: "500 12px var(--font-archivo), sans-serif", color: "#5D5B6E" }}>
          <a
            href="https://github.com/DeborahOlaboye/lacuna"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#5D5B6E", textDecoration: "none" }}
          >
            GitHub
          </a>
          <span>Circuit</span>
          <a
            href="https://stellar.expert/explorer/testnet/contract/CBSCCHS6HTZWS6YDIU6MOBGGA4654XLIMRI7F3YVPGB2DG3N4WBCMFJF"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#5D5B6E", textDecoration: "none" }}
          >
            Contracts
          </a>
        </div>
      </footer>
    </div>
  );
}
