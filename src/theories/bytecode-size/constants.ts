import { mainnet, sepolia } from "wagmi/chains";

export const AVAILABLE_CHAINS = [mainnet, sepolia];

export const ERC1271_MAGIC_VALUE = "0x1626ba7e";

export const ERC1271_ABI = [
  {
    type: "function",
    name: "isValidSignature",
    stateMutability: "view",
    inputs: [
      { name: "hash", type: "bytes32" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [{ type: "bytes4" }],
  },
] as const;
