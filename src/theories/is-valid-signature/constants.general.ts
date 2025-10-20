export const ERC1271_MAGIC_VALUE = "0x1626ba7e";

export const ERC1271_ABI = [
  "function isValidSignature(bytes32 hash, bytes signature) view returns (bytes4)",
] as const;

export const HELPER_ABI = [
  "function isValidSignatureWithUser(bytes32 hash, bytes signature, address user) view returns (bytes4)",
] as const;
