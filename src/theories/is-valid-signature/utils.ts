import { isAddress, isHexString } from "ethers";
import type { Hex } from "viem";

export const validateHash = (hash: string) => {
  if (!hash) {
    return "Укажите хеш";
  }
  if (!isHexString(hash)) {
    return "Хеш должен быть hex-строкой";
  }
  if (!isHexString(hash, 32)) {
    return "Хеш должен соответствовать bytes32";
  }
  return null;
};

export const validateSignature = (signature: Hex | undefined) => {
  if (!signature) {
    return "Укажите подпись";
  }
  if (!isHexString(signature)) {
    return "Подпись должна быть hex-строкой";
  }
  if (!isHexString(signature, 65)) {
    return "Подпись должна соответствовать 65 байтам";
  }
  return null;
};

export const validateAddress = (value: string, errorMessage: string) => {
  if (!isAddress(value)) {
    return errorMessage;
  }
  return null;
};
