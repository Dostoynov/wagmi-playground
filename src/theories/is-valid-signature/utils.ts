import { ethers } from "ethers";

export const validateHash = (hash: string) => {
  if (!hash) {
    return "Укажите хеш";
  }
  if (!ethers.utils.isHexString(hash)) {
    return "Хеш должен быть hex-строкой";
  }
  if (!ethers.utils.isHexString(hash, 32)) {
    return "Хеш должен соответствовать bytes32";
  }
  return null;
};

export const validateSignature = (signature: string) => {
  if (!signature) {
    return "Укажите подпись";
  }
  if (!ethers.utils.isHexString(signature)) {
    return "Подпись должна быть hex-строкой";
  }
  if (!ethers.utils.isHexString(signature, 65)) {
    return "Подпись должна соответствовать 65 байтам";
  }
  return null;
};

export const validateAddress = (value: string, errorMessage: string) => {
  if (!ethers.utils.isAddress(value)) {
    return errorMessage;
  }
  return null;
};
