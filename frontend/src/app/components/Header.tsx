"use client";

interface HeaderProps {
  walletAddress: string | null;
  onConnect: () => void;
}

export default function Header({ walletAddress, onConnect }: HeaderProps) {
  return (
    <header className="border-b border-[#1a1a2e] bg-[#0a0a14] px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-sm font-bold">
            ZK
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">
              Lacuna
            </h1>
            <p className="text-xs text-slate-500">Stellar Testnet · Zero-Knowledge Dark Pool</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            BN254 · Groth16 · Poseidon
          </div>
          <button
            onClick={onConnect}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer"
            style={{
              background: walletAddress ? "rgba(16,185,129,0.15)" : "rgba(124,58,237,0.2)",
              color: walletAddress ? "#10b981" : "#a78bfa",
              border: `1px solid ${walletAddress ? "rgba(16,185,129,0.3)" : "rgba(124,58,237,0.4)"}`,
            }}
          >
            {walletAddress
              ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
              : "Connect Wallet"}
          </button>
        </div>
      </div>
    </header>
  );
}
