import { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import type { Signer } from "ethers";
import type { providers } from "ethers";

import {
  ERC1271_MAGIC_VALUE,
  ERC1271_ABI,
  HELPER_ABI,
} from "./constants.general";
import {
  DEFAULT_HELPER_ADDRESS,
  DEFAULT_TARGET_ADDRESS,
} from "./constants.related";
import { validateAddress, validateHash, validateSignature } from "./utils";

export type PlaygroundState = {
  message: string;
  hashMessage: string;
  rawKeccakHash: string;
  signature: string;
  userAddress: string;
  helperAddress: string;
  targetAddress: string;
  helperResult: string | null;
  helperError: string | null;
  targetResult: string | null;
  targetError: string | null;
  hashError: string | null;
  signError: string | null;
  isSigning: boolean;
  isCallingHelper: boolean;
  isCallingTarget: boolean;
};

export type PlaygroundActions = {
  setMessage: (value: string) => void;
  setHashMessage: (value: string) => void;
  setSignature: (value: string) => void;
  setHelperAddress: (value: string) => void;
  setTargetAddress: (value: string) => void;
  setUserAddress: (value: string) => void;
  computeHashes: () => void;
  signMessage: () => Promise<void>;
  callHelper: () => Promise<void>;
  callTarget: () => Promise<void>;
};

export type PlaygroundResult = {
  state: PlaygroundState;
  actions: PlaygroundActions;
  parsedSignature: ethers.utils.Signature | null;
  canSign: boolean;
  matchesMagic: {
    helper: boolean;
    target: boolean;
  };
};

export const useIsValidSignaturePlayground = (
  options: {
    address?: string;
    signer?: Signer | null;
    provider?: providers.Provider;
    isConnected: boolean;
  }
): PlaygroundResult => {
  const { address, signer, provider, isConnected } = options;
  const [message, setMessage] = useState("");
  const [hashMessage, setHashMessage] = useState("");
  const [rawKeccakHash, setRawKeccakHash] = useState("");
  const [signature, setSignature] = useState("");
  const [hashError, setHashError] = useState<string | null>(null);
  const [signError, setSignError] = useState<string | null>(null);
  const [helperAddress, setHelperAddress] = useState(DEFAULT_HELPER_ADDRESS);
  const [targetAddress, setTargetAddress] = useState(DEFAULT_TARGET_ADDRESS);
  const [userAddress, setUserAddress] = useState("");
  const [helperResult, setHelperResult] = useState<string | null>(null);
  const [helperError, setHelperError] = useState<string | null>(null);
  const [targetResult, setTargetResult] = useState<string | null>(null);
  const [targetError, setTargetError] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [isCallingHelper, setIsCallingHelper] = useState(false);
  const [isCallingTarget, setIsCallingTarget] = useState(false);

  useEffect(() => {
    if (address) {
      setUserAddress(address);
    }
  }, [address]);

  const computeHashes = useCallback(() => {
    if (!message) {
      setHashError("Введите сообщение для хеширования");
      return;
    }

    try {
      const eip191Hash = ethers.utils.hashMessage(message);
      const keccakHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(message));
      setHashMessage(eip191Hash);
      setRawKeccakHash(keccakHash);
      setHashError(null);
    } catch (error: any) {
      setHashError(error?.message ?? "Не удалось посчитать хеш");
    }
  }, [message]);

  const signMessage = useCallback(async () => {
    setSignError(null);
    if (!signer) {
      setSignError("Signer недоступен. Подключите кошелек");
      return;
    }
    if (!message) {
      setSignError("Введите сообщение для подписи");
      return;
    }

    try {
      setIsSigning(true);
      const signatureValue = await signer.signMessage(message);
      const eip191Hash = ethers.utils.hashMessage(message);
      const keccakHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(message));
      setSignature(signatureValue);
      setHashMessage(eip191Hash);
      setRawKeccakHash(keccakHash);
      setHashError(null);
      if (address) {
        setUserAddress(address);
      }
    } catch (error: any) {
      setSignError(error?.message ?? "Не удалось подписать сообщение");
    } finally {
      setIsSigning(false);
    }
  }, [signer, message, address]);

  const callHelper = useCallback(async () => {
    if (!provider) {
      setHelperError("Провайдер не инициализирован");
      return;
    }

    const hashValidation = validateHash(hashMessage);
    if (hashValidation) {
      setHelperError(hashValidation);
      return;
    }

    const signatureValidation = validateSignature(signature);
    if (signatureValidation) {
      setHelperError(signatureValidation);
      return;
    }

    const helperAddressValidation = validateAddress(
      helperAddress,
      "Укажите корректный адрес helper-контракта"
    );
    if (helperAddressValidation) {
      setHelperError(helperAddressValidation);
      return;
    }

    const userAddressValidation = validateAddress(
      userAddress,
      "Укажите корректный адрес пользователя"
    );
    if (userAddressValidation) {
      setHelperError(userAddressValidation);
      return;
    }

    try {
      setIsCallingHelper(true);
      setHelperError(null);
      setHelperResult(null);
      const contract = new ethers.Contract(helperAddress, HELPER_ABI, provider);
      const result: string = await contract.isValidSignatureWithUser(
        hashMessage,
        signature,
        userAddress
      );
      setHelperResult(result);
    } catch (error: any) {
      setHelperError(error?.message ?? "Вызов завершился ошибкой");
    } finally {
      setIsCallingHelper(false);
    }
  }, [
    provider,
    hashMessage,
    signature,
    helperAddress,
    userAddress,
  ]);

  const callTarget = useCallback(async () => {
    if (!provider) {
      setTargetError("Провайдер не инициализирован");
      return;
    }

    const hashValidation = validateHash(hashMessage);
    if (hashValidation) {
      setTargetError(hashValidation);
      return;
    }

    const signatureValidation = validateSignature(signature);
    if (signatureValidation) {
      setTargetError(signatureValidation);
      return;
    }

    const targetAddressValidation = validateAddress(
      targetAddress,
      "Укажите корректный адрес контракта"
    );
    if (targetAddressValidation) {
      setTargetError(targetAddressValidation);
      return;
    }

    try {
      setIsCallingTarget(true);
      setTargetError(null);
      setTargetResult(null);
      const contract = new ethers.Contract(targetAddress, ERC1271_ABI, provider);
      const result: string = await contract.isValidSignature(hashMessage, signature);
      setTargetResult(result);
    } catch (error: any) {
      setTargetError(error?.message ?? "Вызов завершился ошибкой");
    } finally {
      setIsCallingTarget(false);
    }
  }, [provider, hashMessage, signature, targetAddress]);

  const parsedSignature = useMemo(() => {
    if (!signature) {
      return null;
    }
    try {
      return ethers.utils.splitSignature(signature);
    } catch (error) {
      console.warn("Failed to parse signature", error);
      return null;
    }
  }, [signature]);

  const canSign = isConnected && Boolean(signer) && message.length > 0;

  const matchesMagic = useMemo(
    () => ({
      helper:
        (helperResult ?? "").toLowerCase() === ERC1271_MAGIC_VALUE.toLowerCase(),
      target:
        (targetResult ?? "").toLowerCase() === ERC1271_MAGIC_VALUE.toLowerCase(),
    }),
    [helperResult, targetResult]
  );

  const updateHashMessage = useCallback((value: string) => {
    setHashMessage(value);
    setHashError(null);
  }, []);

  const updateSignature = useCallback((value: string) => {
    setSignature(value);
    setSignError(null);
  }, []);

  const updateHelperAddress = useCallback((value: string) => {
    setHelperAddress(value);
    setHelperError(null);
  }, []);

  const updateTargetAddress = useCallback((value: string) => {
    setTargetAddress(value);
    setTargetError(null);
  }, []);

  const updateUserAddress = useCallback((value: string) => {
    setUserAddress(value);
    setHelperError(null);
  }, []);

  return {
    state: {
      message,
      hashMessage,
      rawKeccakHash,
      signature,
      userAddress,
      helperAddress,
      targetAddress,
      helperResult,
      helperError,
      targetResult,
      targetError,
      hashError,
      signError,
      isSigning,
      isCallingHelper,
      isCallingTarget,
    },
    actions: {
      setMessage,
      setHashMessage: updateHashMessage,
      setSignature: updateSignature,
      setHelperAddress: updateHelperAddress,
      setTargetAddress: updateTargetAddress,
      setUserAddress: updateUserAddress,
      computeHashes,
      signMessage,
      callHelper,
      callTarget,
    },
    parsedSignature,
    canSign,
    matchesMagic,
  };
};
