#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype,
    crypto::bn254::{Fr, Bn254G1Affine, Bn254G2Affine},
    vec, Env, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum VerifierError {
    InvalidPublicInputCount = 1,
    PairingFailed = 2,
}

/// Groth16 verification key (BN254 curve).
/// Points serialized as big-endian bytes:
///   G1Affine  = x (32 B) || y (32 B)         → 64 bytes
///   G2Affine  = x_im (32 B) || x_re (32 B) ||
///               y_im (32 B) || y_re (32 B)    → 128 bytes
#[derive(Clone)]
#[contracttype]
pub struct VerificationKey {
    pub alpha: Bn254G1Affine,
    pub beta: Bn254G2Affine,
    pub gamma: Bn254G2Affine,
    pub delta: Bn254G2Affine,
    /// IC[0] + IC[1..n_public+1] — length must equal n_public + 1
    pub ic: Vec<Bn254G1Affine>,
}

/// Groth16 proof (BN254).
#[derive(Clone)]
#[contracttype]
pub struct Proof {
    pub a: Bn254G1Affine,
    pub b: Bn254G2Affine,
    pub c: Bn254G1Affine,
}

#[contract]
pub struct Groth16Verifier;

#[contractimpl]
impl Groth16Verifier {
    /// Verify a Groth16 proof against a verification key and public signals.
    ///
    /// Returns true iff the proof is valid.
    ///
    /// Equation checked:
    ///   e(−A, B) · e(α, β) · e(vk_x, γ) · e(C, δ) == 1
    /// where  vk_x = IC[0] + Σ pub_signals[i] · IC[i+1]
    pub fn verify_proof(
        env: Env,
        vk: VerificationKey,
        proof: Proof,
        pub_signals: Vec<Fr>,
    ) -> Result<bool, VerifierError> {
        if pub_signals.len() + 1 != vk.ic.len() {
            return Err(VerifierError::InvalidPublicInputCount);
        }

        let bn254 = env.crypto().bn254();

        // vk_x = IC[0] + Σ pub_signals[i] · IC[i+1]
        let mut vk_x = vk.ic.get(0).unwrap();
        for (s, ic_pt) in pub_signals.iter().zip(vk.ic.iter().skip(1)) {
            let scaled = bn254.g1_mul(&ic_pt, &s);
            vk_x = bn254.g1_add(&vk_x, &scaled);
        }

        // e(-A, B) · e(α, β) · e(vk_x, γ) · e(C, δ) == 1
        let neg_a = -proof.a;
        let g1s = vec![&env, neg_a, vk.alpha, vk_x, proof.c];
        let g2s = vec![&env, proof.b, vk.beta, vk.gamma, vk.delta];

        Ok(bn254.pairing_check(g1s, g2s))
    }
}
