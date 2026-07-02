export type OrderSide = "BUY" | "SELL";

export interface Order {
  id: number;
  side: OrderSide;
  commitment: string;       // on-chain hash — only thing visible publicly
  deposit: bigint;
  trader: string;           // Stellar address
  matched: boolean;
  cancelled: boolean;
  // Private fields — only the order creator holds these
  _price?: bigint;
  _amount?: bigint;
  _secret?: bigint;
}

export interface MatchResult {
  orderIdA: number;
  orderIdB: number;
  settlementPrice: bigint;
  settlementAmount: bigint;
  txHash: string;
  proofValid: boolean;
}

export interface ProofOutput {
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
  };
  publicSignals: string[];
  commitmentA: string;
  commitmentB: string;
  nullifierA: string;
  nullifierB: string;
}
