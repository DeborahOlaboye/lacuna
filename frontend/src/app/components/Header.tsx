"use client";

interface HeaderProps {
  walletAddress: string | null;
  onConnect: () => void;
  activeTab?: "book" | "history";
  onTabChange?: (tab: "book" | "history") => void;
}

export function EclipseMark({ size = 24, color = "#9D8CFF", id = "hdr" }: { size?: number; color?: string; id?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className="eclipse-mark flex-shrink-0">
      <mask id={`em-${id}`}>
        <rect width="48" height="48" fill="#fff" />
        <circle cx="31.5" cy="16.5" r="9.5" fill="#000" />
      </mask>
      <circle cx="24" cy="24" r="19" fill={color} mask={`url(#em-${id})`} />
    </svg>
  );
}

export function Wordmark({ size = 14 }: { size?: number }) {
  return (
    <span
      style={{
        font: `700 ${size}px var(--font-archivo), sans-serif`,
        letterSpacing: "0.2em",
        color: "#ECEAF6",
      }}
    >
      LAC
      <span style={{ color: "transparent", WebkitTextStroke: "1.2px #9D8CFF" }}>U</span>
      NA
    </span>
  );
}

export default function Header({ walletAddress, onConnect, activeTab = "book", onTabChange }: HeaderProps) {
  return (
    <header
      style={{
        borderBottom: "1px solid rgba(255,255,255,.07)",
        background: "#08080D",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          height: 60,
        }}
      >
        {/* Left: logo + pair selector + tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <EclipseMark size={24} id="hdr-main" />
            <Wordmark size={14} />
          </div>

          {walletAddress && (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#12121D",
                  border: "1px solid rgba(255,255,255,.1)",
                  borderRadius: 9,
                  padding: "8px 14px",
                }}
              >
                <span style={{ font: "600 13px var(--font-mono), monospace", color: "#ECEAF6" }}>
                  XLM
                </span>
              </div>

              <nav style={{ display: "flex", gap: 22 }}>
                {(["book", "history"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => onTabChange?.(tab)}
                    style={{
                      font: "500 13px var(--font-archivo), sans-serif",
                      color: activeTab === tab ? "#ECEAF6" : "#5D5B6E",
                      background: "none",
                      border: "none",
                      borderBottom: activeTab === tab ? "2px solid #9D8CFF" : "2px solid transparent",
                      paddingBottom: 19,
                      marginBottom: -21,
                      cursor: "pointer",
                      textTransform: "capitalize" as const,
                    }}
                  >
                    {tab === "book" ? "Book" : "History"}
                  </button>
                ))}
              </nav>
            </>
          )}
        </div>

        {/* Right: wallet */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {walletAddress ? (
            <button
              onClick={onConnect}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                background: "#12121D",
                border: "1px solid rgba(255,255,255,.1)",
                borderRadius: 9,
                padding: "8px 14px",
                cursor: "pointer",
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3ECF8E", flexShrink: 0 }} />
              <span style={{ font: "500 12px var(--font-mono), monospace", color: "#ECEAF6" }}>
                {walletAddress.slice(0, 4)}…{walletAddress.slice(-4)}
              </span>
              <span style={{ font: "400 10px var(--font-archivo), sans-serif", color: "#5D5B6E" }}>▾</span>
            </button>
          ) : (
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
          )}
        </div>
      </div>
    </header>
  );
}
