import type { Address } from "viem";

const PERMIT2_CONTRACT_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3".toLowerCase();
const USDC_TOKEN_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0Ce3606eb48".toLowerCase();
const SAMPLE_SPENDER_ADDRESS = "0x1111111254fb6c44bac0bed2854e76f90643097d".toLowerCase();

const getDefaultTimestamps = () => {
  const now = Math.floor(Date.now() / 1000);
  const expiration = now + 60 * 60; // 1 hour
  const deadline = now + 2 * 60 * 60; // 2 hours
  return {
    expiration,
    deadline,
  };
};

export const buildSamplePermitSingleTypedData = (chainId: number) => {
  const { expiration, deadline } = getDefaultTimestamps();

  const domain = {
    name: "Permit2",
    chainId: BigInt(chainId),
    verifyingContract: PERMIT2_CONTRACT_ADDRESS as Address,
  } as const;

  const types = {
    EIP712Domain: [
      { name: "name", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
    ],
    PermitSingle: [
      { name: "details", type: "PermitDetails" },
      { name: "spender", type: "address" },
      { name: "sigDeadline", type: "uint256" },
    ],
    PermitDetails: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint160" },
      { name: "expiration", type: "uint48" },
      { name: "nonce", type: "uint48" },
    ],
  } as const;

  const message = {
    details: {
      token: USDC_TOKEN_ADDRESS as Address,
      amount: 1000000n,
      expiration,
      nonce: 1,
    },
    spender: SAMPLE_SPENDER_ADDRESS as Address,
    sigDeadline: BigInt(deadline),
  } as const;

  return {
    domain,
    types,
    primaryType: "PermitSingle" as const,
    message,
  };
};
