#!/usr/bin/env node
"use strict";

/**
 * Initialize the Lacuna dark pool contract on Stellar testnet.
 *
 * Usage:
 *   node init.js --network testnet --secret SXXX
 *
 * Reads:
 *   - keys/verification_key.json  (Groth16 VK)
 *   - .darkpool-config.json        (contract addresses from deploy.js)
 */

const {
  Keypair,
  rpc: SorobanRpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  xdr,
  Contract,
  Address,
  nativeToScVal,
} = require("@stellar/stellar-sdk");

const fs = require("fs");
const path = require("path");

const NETWORK = process.argv.includes("--network")
  ? process.argv[process.argv.indexOf("--network") + 1]
  : "testnet";

const SECRET = process.argv.includes("--secret")
  ? process.argv[process.argv.indexOf("--secret") + 1]
  : null;

const RPC_URL =
  NETWORK === "testnet"
    ? "https://soroban-testnet.stellar.org"
    : "https://rpc-futurenet.stellar.org";
const NETWORK_PASSPHRASE =
  NETWORK === "testnet" ? Networks.TESTNET : Networks.FUTURENET;

const ROOT = path.join(__dirname, "..");
const VK_PATH = path.join(ROOT, "keys", "verification_key.json");
const CONFIG_PATH = path.join(ROOT, ".darkpool-config.json");

// ── BN254 encoding helpers ────────────────────────────────────────────────────

function hexPad32(bigintStr) {
  return BigInt(bigintStr).toString(16).padStart(64, "0");
}

function g1ToBytes(point) {
  // G1Affine: x (32B) || y (32B) = 64 bytes total
  const x = hexPad32(point[0]);
  const y = hexPad32(point[1]);
  return Buffer.from(x + y, "hex");
}

function g2ToBytes(point) {
  // G2Affine: x_im (32B) || x_re (32B) || y_im (32B) || y_re (32B) = 128 bytes
  // snarkjs G2 format: [[x_im, x_re], [y_im, y_re], [1, 0]]
  const x_im = hexPad32(point[0][0]);
  const x_re = hexPad32(point[0][1]);
  const y_im = hexPad32(point[1][0]);
  const y_re = hexPad32(point[1][1]);
  return Buffer.from(x_im + x_re + y_im + y_re, "hex");
}

function g1ToScVal(point) {
  const buf = g1ToBytes(point);
  return xdr.ScVal.scvBytes(buf);
}

function g2ToScVal(point) {
  const buf = g2ToBytes(point);
  return xdr.ScVal.scvBytes(buf);
}

// ── Build VerificationKey ScVal ───────────────────────────────────────────────

function vkToScVal(vk) {
  const icVals = vk.IC.map((pt) => g1ToScVal(pt));
  const icVec = xdr.ScVal.scvVec(icVals);

  return xdr.ScVal.scvMap([
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("alpha"),
      val: g1ToScVal(vk.vk_alpha_1),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("beta"),
      val: g2ToScVal(vk.vk_beta_2),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("delta"),
      val: g2ToScVal(vk.vk_delta_2),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("gamma"),
      val: g2ToScVal(vk.vk_gamma_2),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("ic"),
      val: icVec,
    }),
  ]);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error("No .darkpool-config.json found. Run deploy.js first.");
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  const vkJson = JSON.parse(fs.readFileSync(VK_PATH, "utf8"));

  const { darkPoolContract, verifierContract } = config;
  const USDC = config.usdcContract;

  let keypair;
  if (SECRET) {
    keypair = Keypair.fromSecret(SECRET);
  } else {
    // Try to read from stellar CLI config
    const { execSync } = require("child_process");
    const secret = execSync(
      "stellar keys show lacuna-deployer 2>/dev/null || stellar keys show default 2>/dev/null",
      { encoding: "utf8" }
    ).trim();
    keypair = Keypair.fromSecret(secret);
  }

  console.log(`\nInitializing Lacuna dark pool on ${NETWORK}...`);
  console.log(`  Deployer  : ${keypair.publicKey()}`);
  console.log(`  DarkPool  : ${darkPoolContract}`);
  console.log(`  Verifier  : ${verifierContract}`);
  console.log(`  USDC      : ${USDC}`);
  console.log(`  VK IC len : ${vkJson.IC.length}`);

  const server = new SorobanRpc.Server(RPC_URL);
  const account = await server.getAccount(keypair.publicKey());

  const contract = new Contract(darkPoolContract);

  const adminVal = new Address(keypair.publicKey()).toScVal();
  const tokenVal = new Address(USDC).toScVal();
  const verifierVal = new Address(verifierContract).toScVal();
  const vkVal = vkToScVal(vkJson);

  const tx = new TransactionBuilder(account, {
    fee: "1000000", // 0.1 XLM — generous for the complex init
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call("initialize", adminVal, tokenVal, verifierVal, vkVal)
    )
    .setTimeout(60)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(sim)) {
    console.error("\nSimulation failed:", sim.error);
    process.exit(1);
  }

  const assembled = SorobanRpc.assembleTransaction(tx, sim).build();
  assembled.sign(keypair);

  console.log("\nSubmitting initialize transaction...");
  const result = await server.sendTransaction(assembled);
  if (result.status === "ERROR") {
    console.error("Transaction error:", JSON.stringify(result));
    process.exit(1);
  }

  let hash = result.hash;
  let status = result.status;
  while (status === "PENDING" || status === "NOT_FOUND") {
    await new Promise((r) => setTimeout(r, 2000));
    const poll = await server.getTransaction(hash);
    status = poll.status;
    if (status === "SUCCESS") {
      console.log("\n✅ Dark pool initialized successfully!");
      console.log(`   TX: https://stellar.expert/explorer/testnet/tx/${hash}`);
      break;
    }
    if (status === "FAILED") {
      console.error("Transaction failed:", hash);
      process.exit(1);
    }
  }
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
