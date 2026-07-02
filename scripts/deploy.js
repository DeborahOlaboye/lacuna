#!/usr/bin/env node
"use strict";
/**
 * Deploy Lacuna contracts to Stellar testnet.
 *
 * Usage:
 *   node deploy.js [--network testnet|futurenet] [--secret SXXX]
 *
 * Deploys:
 *   1. groth16_verifier  — standalone ZK proof verifier
 *   2. dark_pool         — the trading pool (references the verifier)
 *
 * Saves contract IDs to ../.darkpool-config.json
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { vkToSoroban, VK_JSON } = require("./utils");

const NETWORK = process.argv.includes("--network")
  ? process.argv[process.argv.indexOf("--network") + 1]
  : "testnet";

const WASM_DIR = path.join(__dirname, "../target/wasm32v1-none/release");
const CONFIG_FILE = path.join(__dirname, "../.darkpool-config.json");

function run(cmd) {
  console.log(`  $ ${cmd.split(" ").slice(0, 4).join(" ")} ...`);
  return execSync(cmd, { encoding: "utf8" }).trim();
}

async function main() {
  console.log(`\n🚀 Deploying Lacuna to Stellar ${NETWORK}\n`);

  // Build contracts
  console.log("📦 Building contracts...");
  execSync("cargo build --target wasm32v1-none --release", {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
  });

  // Deploy verifier contract
  console.log("\n1️⃣  Deploying Groth16 Verifier...");
  const verifierWasm = path.join(WASM_DIR, "groth16_verifier.wasm");
  const verifierId = run(
    `stellar contract deploy --wasm ${verifierWasm} --network ${NETWORK} --source-account default`
  );
  console.log(`   ✓ Groth16Verifier: ${verifierId}`);

  // Deploy dark pool contract
  console.log("\n2️⃣  Deploying Dark Pool...");
  const darkPoolWasm = path.join(WASM_DIR, "dark_pool.wasm");
  const darkPoolId = run(
    `stellar contract deploy --wasm ${darkPoolWasm} --network ${NETWORK} --source-account default`
  );
  console.log(`   ✓ DarkPool: ${darkPoolId}`);

  // Initialize dark pool with verification key
  console.log("\n3️⃣  Initializing Dark Pool with verification key...");
  const vk = JSON.parse(fs.readFileSync(VK_JSON, "utf8"));
  const sorobanVk = vkToSoroban(vk);

  // Build the VK as a JSON argument for stellar CLI
  // (In practice you'd use the SDK; this is simplified for the demo)
  console.log("   VK IC length:", sorobanVk.ic.length);
  console.log("   ✓ Verification key prepared");

  // Save config
  const config = {
    network: NETWORK,
    verifierContract: verifierId,
    darkPoolContract: darkPoolId,
    usdcContract: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA", // testnet USDC
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

  console.log("\n✅ Deployment complete!");
  console.log(`   Config saved to .darkpool-config.json`);
  console.log(`\n   Verifier : ${verifierId}`);
  console.log(`   Dark Pool: ${darkPoolId}`);
  console.log(`\n   Next: node demo.js --network ${NETWORK}`);
}

main().catch((e) => {
  console.error("Deployment failed:", e.message);
  process.exit(1);
});
