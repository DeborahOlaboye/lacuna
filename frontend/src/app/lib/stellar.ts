"use client";

import {
  rpc as SorobanRpc,
  TransactionBuilder,
  Networks,
  Contract,
  xdr,
  nativeToScVal,
  scValToNative,
  Address,
  Transaction,
} from "@stellar/stellar-sdk";

// ── Network / contract constants ───────────────────────────────────────────────

const RPC_URL              = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE   = Networks.TESTNET;
export const DARK_POOL_ID  = "CBSCCHS6HTZWS6YDIU6MOBGGA4654XLIMRI7F3YVPGB2DG3N4WBCMFJF";
export const XLM_SAC_ID    = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

function rpc() { return new SorobanRpc.Server(RPC_URL); }

// ── Stellar Wallets Kit singleton ─────────────────────────────────────────────

let _kitReady = false;

async function ensureKit(): Promise<typeof import("@creit.tech/stellar-wallets-kit").StellarWalletsKit> {
  const { StellarWalletsKit, Networks: KitNetworks } = await import("@creit.tech/stellar-wallets-kit");
  const { FreighterModule } = await import("@creit.tech/stellar-wallets-kit/modules/freighter");

  if (!_kitReady) {
    StellarWalletsKit.init({
      modules: [new FreighterModule()],
      network: KitNetworks.TESTNET,
    });
    _kitReady = true;
  }
  return StellarWalletsKit;
}

/**
 * Opens the Stellar Wallets Kit auth modal (wallet picker) and returns the
 * user's Stellar address. Works with Freighter, xBull, Albedo, WalletConnect…
 */
export async function connectWallet(): Promise<string> {
  const kit = await ensureKit();
  const { address } = await kit.authModal();
  return address;
}

/**
 * Disconnect the active wallet and reset kit state.
 */
export async function disconnectWallet(): Promise<void> {
  const kit = await ensureKit();
  await kit.disconnect();
  _kitReady = false;
}

/**
 * Sign a built transaction XDR with the connected wallet.
 */
async function kitSign(txXdr: string): Promise<string> {
  const kit = await ensureKit();
  const { signedTxXdr } = await kit.signTransaction(txXdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
  });
  return signedTxXdr;
}

// ── BN254 encoding helpers (mirrors scripts/utils.js) ─────────────────────────

function g1ToHex(point: string[]): string {
  const x = BigInt(point[0]).toString(16).padStart(64, "0");
  const y = BigInt(point[1]).toString(16).padStart(64, "0");
  return x + y;
}

function g2ToHex(point: string[][]): string {
  // arkworks canonical: real (c0) first, imaginary (c1) second
  const c1 = BigInt(point[0][0]).toString(16).padStart(64, "0");
  const c0 = BigInt(point[0][1]).toString(16).padStart(64, "0");
  const d1 = BigInt(point[1][0]).toString(16).padStart(64, "0");
  const d0 = BigInt(point[1][1]).toString(16).padStart(64, "0");
  return c0 + c1 + d0 + d1;
}

function bytes32ScVal(value: string | bigint): xdr.ScVal {
  const hex =
    typeof value === "bigint"
      ? value.toString(16).padStart(64, "0")
      : String(value).replace(/^0x/, "").padStart(64, "0");
  return xdr.ScVal.scvBytes(Buffer.from(hex, "hex"));
}

function proofScVal(proof: { pi_a: string[]; pi_b: string[][]; pi_c: string[] }): xdr.ScVal {
  return xdr.ScVal.scvMap([
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("a"),
      val: xdr.ScVal.scvBytes(Buffer.from(g1ToHex(proof.pi_a), "hex")),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("b"),
      val: xdr.ScVal.scvBytes(Buffer.from(g2ToHex(proof.pi_b), "hex")),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("c"),
      val: xdr.ScVal.scvBytes(Buffer.from(g1ToHex(proof.pi_c), "hex")),
    }),
  ]);
}

function pubSignalsScVal(signals: string[]): xdr.ScVal {
  return xdr.ScVal.scvVec(
    signals.map((s) => nativeToScVal(BigInt(s), { type: "u256" }))
  );
}

// ── Transaction builder ────────────────────────────────────────────────────────

async function buildSignSubmit(
  walletAddress: string,
  contractId: string,
  fn: string,
  args: xdr.ScVal[]
): Promise<{ hash: string; returnValue: unknown }> {
  const server  = rpc();
  const account = await server.getAccount(walletAddress);
  const pool    = new Contract(contractId);

  const tx = new TransactionBuilder(account, {
    fee: "5000000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(pool.call(fn, ...args))
    .setTimeout(60)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed: ${sim.error}`);
  }

  const assembled  = SorobanRpc.assembleTransaction(tx, sim).build();
  const signedXdr  = await kitSign(assembled.toXDR());
  const signedTx   = new Transaction(signedXdr, NETWORK_PASSPHRASE);

  const sendResult = await server.sendTransaction(signedTx);
  if (sendResult.status === "ERROR") {
    throw new Error(`Submit failed: ${JSON.stringify(sendResult)}`);
  }

  let hash   = sendResult.hash;
  let status: string = sendResult.status;

  while (status === "PENDING" || status === "NOT_FOUND") {
    await new Promise((r) => setTimeout(r, 2500));
    const poll = await server.getTransaction(hash);
    status = poll.status as string;
    if (status === "SUCCESS") {
      const retval = (poll as SorobanRpc.Api.GetSuccessfulTransactionResponse).returnValue;
      return { hash, returnValue: retval ? scValToNative(retval) : null };
    }
    if (status === "FAILED") throw new Error(`TX failed: ${hash}`);
  }
  return { hash, returnValue: null };
}

async function viewCall(
  readerAddress: string,
  contractId: string,
  fn: string,
  args: xdr.ScVal[]
): Promise<unknown> {
  const server  = rpc();
  const account = await server.getAccount(readerAddress);
  const pool    = new Contract(contractId);

  const tx = new TransactionBuilder(account, {
    fee: "100000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(pool.call(fn, ...args))
    .setTimeout(60)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(sim)) {
    throw new Error(`View error: ${sim.error}`);
  }
  const retval = (sim as SorobanRpc.Api.SimulateTransactionSuccessResponse).result?.retval;
  return retval ? scValToNative(retval) : null;
}

// ── Dark pool contract functions ───────────────────────────────────────────────

/**
 * submit_order(trader, commitment_bytes32, deposit_i128) → order_id (u64)
 * The wallet user signs; the inner token.transfer is authorised through
 * Soroban's auth chain — no separate token.approve call is needed.
 */
export async function submitOrder(
  walletAddress: string,
  commitment: string,   // decimal string from Poseidon hash
  deposit: bigint
): Promise<{ hash: string; onChainId: number }> {
  const commitHex = BigInt(commitment).toString(16).padStart(64, "0");
  const { hash, returnValue } = await buildSignSubmit(
    walletAddress,
    DARK_POOL_ID,
    "submit_order",
    [
      new Address(walletAddress).toScVal(),
      bytes32ScVal(commitHex),
      nativeToScVal(deposit, { type: "i128" }),
    ]
  );
  const onChainId = typeof returnValue === "bigint" ? Number(returnValue) : 0;
  return { hash, onChainId };
}

/**
 * cancel_order(order_id_u64) — caller must be the original trader
 */
export async function cancelOrder(
  walletAddress: string,
  onChainId: number
): Promise<{ hash: string }> {
  const { hash } = await buildSignSubmit(
    walletAddress,
    DARK_POOL_ID,
    "cancel_order",
    [nativeToScVal(onChainId, { type: "u64" })]
  );
  return { hash };
}

/**
 * match_orders — permissionless; any connected wallet can call this as the matcher
 */
export async function matchOrders(
  matcherAddress: string,
  onChainIdA: number,
  onChainIdB: number,
  proof: { pi_a: string[]; pi_b: string[][]; pi_c: string[] },
  publicSignals: string[],
  nullifierA: string,
  nullifierB: string,
  settlementPrice: bigint,
  settlementAmount: bigint
): Promise<{ hash: string }> {
  const nullAHex = BigInt(nullifierA).toString(16).padStart(64, "0");
  const nullBHex = BigInt(nullifierB).toString(16).padStart(64, "0");

  const { hash } = await buildSignSubmit(
    matcherAddress,
    DARK_POOL_ID,
    "match_orders",
    [
      nativeToScVal(onChainIdA, { type: "u64" }),
      nativeToScVal(onChainIdB, { type: "u64" }),
      proofScVal(proof),
      pubSignalsScVal(publicSignals),
      bytes32ScVal(nullAHex),
      bytes32ScVal(nullBHex),
      nativeToScVal(settlementPrice, { type: "i128" }),
      nativeToScVal(settlementAmount, { type: "i128" }),
    ]
  );
  return { hash };
}

// ── View / read calls ─────────────────────────────────────────────────────────

export async function getOrderCount(walletAddress: string): Promise<number> {
  const result = await viewCall(walletAddress, DARK_POOL_ID, "order_count", []);
  return typeof result === "bigint" ? Number(result) : 0;
}

export interface ChainOrder {
  onChainId:  number;
  trader:     string;
  commitment: string;    // hex string
  deposit:    bigint;
  matched:    boolean;
  cancelled:  boolean;
}

export async function fetchAllOrders(walletAddress: string): Promise<ChainOrder[]> {
  const count  = await getOrderCount(walletAddress);
  const orders: ChainOrder[] = [];

  for (let i = 0; i < count; i++) {
    try {
      const raw = (await viewCall(
        walletAddress,
        DARK_POOL_ID,
        "get_order",
        [nativeToScVal(i, { type: "u64" })]
      )) as Record<string, unknown> | null;

      if (!raw) continue;

      const commitBytes = raw.commitment as Uint8Array | undefined;
      orders.push({
        onChainId:  i,
        trader:     String(raw.trader ?? ""),
        commitment: commitBytes
          ? Array.from(commitBytes).map((b) => (b as number).toString(16).padStart(2, "0")).join("")
          : "",
        deposit:   BigInt(String(raw.deposit ?? "0")),
        matched:   Boolean(raw.matched),
        cancelled: Boolean(raw.cancelled),
      });
    } catch {
      // skip if order not found
    }
  }
  return orders;
}
