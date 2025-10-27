import { isAddress, isHexString } from "ethers";
import type { Hex } from "viem";

export const validateHash = (hash: string) => {
  if (!hash) {
    return "Enter a hash";
  }
  if (!isHexString(hash)) {
    return "Hash must be a hex string";
  }
  if (!isHexString(hash, 32)) {
    return "Hash must be a bytes32 hex string";
  }
  return null;
};

export const validateSignature = (signature: Hex | undefined) => {
  if (!signature) {
    return "Enter a signature";
  }
  if (!isHexString(signature)) {
    return "Signature must be a hex string";
  }
  if (!isHexString(signature, 65)) {
    return "Signature must be 65 bytes long";
  }
  return null;
};

export const validateAddress = (value: string, errorMessage: string) => {
  if (!isAddress(value)) {
    return errorMessage;
  }
  return null;
};
