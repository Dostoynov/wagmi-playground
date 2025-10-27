import { useCallback, useEffect, useMemo, useState } from "react";
import { hashMessage, keccak256, toUtf8Bytes } from "ethers";
import { useSignMessage, useReadContract } from "wagmi";

import {
  ERC1271_ABI,
  ERC1271_MAGIC_VALUE,
  HELPER_ABI,
} from "./constants.general";
import {
  DEFAULT_HELPER_ADDRESS,
  DEFAULT_TARGET_ADDRESS,
} from "./constants.related";
import { validateAddress, validateHash, validateSignature } from "./utils";
import { Address, BaseError, Hex, parseSignature } from "viem";

const getErrorMessage = (error: unknown) => {
  if (error instanceof BaseError) {
    return error.shortMessage || error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "The call failed";
};

export type PlaygroundState = {
  message: string;
  hashMessage: string;
  rawKeccakHash: string;
  signature: Hex | undefined;
  userAddress: string;
  helperAddress: string;
  targetAddress: string;
  helperResult: Hex | null;
  helperError: string | null;
  targetResult: Hex | null;
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
  parsedSignature: { r: string; s: string; yParity: number } | null;
  canSign: boolean;
  matchesMagic: {
    helper: boolean;
    target: boolean;
  };
};

export const useIsValidSignaturePlayground = (
  options: {
    address?: Address;
    isConnected: boolean;
  }
): PlaygroundResult => {
  const { address, isConnected } = options;

  const { signMessageAsync } = useSignMessage();
  const [message, setMessage] = useState<string>("");
  const [hashMessageSaved, setHashMessageSaved] = useState<Hex | "">("");
  const [rawKeccakHash, setRawKeccakHash] = useState<Hex | "">("");
  const [signature, setSignature] = useState<Hex | undefined>(undefined);
  const [hashError, setHashError] = useState<string | null>(null);
  const [signError, setSignError] = useState<string | null>(null);
  const [helperAddress, setHelperAddress] = useState<string>(DEFAULT_HELPER_ADDRESS);
  const [targetAddress, setTargetAddress] = useState<string>(DEFAULT_TARGET_ADDRESS);
  const [userAddress, setUserAddress] = useState<string>(
    "0x0000000000000000000000000000000000000000"
  );
  const [helperResult, setHelperResult] = useState<Hex | null>(null);
  const [helperError, setHelperError] = useState<string | null>(null);
  const [targetResult, setTargetResult] = useState<Hex | null>(null);
  const [targetError, setTargetError] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [isCallingHelper, setIsCallingHelper] = useState(false);
  const [isCallingTarget, setIsCallingTarget] = useState(false);

  const { refetch: refetchHelper } = useReadContract({
    address: (helperAddress || DEFAULT_HELPER_ADDRESS) as Address,
    abi: HELPER_ABI,
    functionName: "isValidSignatureWithUser",
    args: [hashMessageSaved as Hex, signature as Hex, userAddress as Address],
    query: { enabled: true },
  });

  const { refetch: refetchTarget } = useReadContract({
    address: (targetAddress || DEFAULT_TARGET_ADDRESS) as Address,
    abi: ERC1271_ABI,
    functionName: "isValidSignature",
    args: [hashMessageSaved as Hex, signature as Hex],
    query: { enabled: true },
  });

  useEffect(() => {
    if (address) {
      setUserAddress(address);
    }
  }, [address]);

  const computeHashes = useCallback(() => {
    if (!message) {
      setHashError("Enter a message to hash");
      return;
    }

    try {
      const eip191Hash = hashMessage(message);
      const keccakHash = keccak256(toUtf8Bytes(message));
      setHashMessageSaved(eip191Hash as Hex);
      setRawKeccakHash(keccakHash as Hex);
      setHashError(null);
    } catch (error: any) {
      setHashError(error?.message ?? "Failed to compute the hash");
    }
  }, [message]);

  const signMessage = useCallback(async () => {
    setSignError(null);
    if (!message) {
      setSignError("Enter a message to sign");
      return;
    }

    try {
      setIsSigning(true);
      const signatureValue = await signMessageAsync({ message });
      const eip191Hash = hashMessage(message);
      const keccakHash = keccak256(toUtf8Bytes(message));
      setSignature(signatureValue as Hex);
      setHashMessageSaved(eip191Hash as Hex);
      setRawKeccakHash(keccakHash as Hex);
      setHashError(null);
      if (address) {
        setUserAddress(address);
      }
    } catch (error: any) {
      setSignError(error?.message ?? "Failed to sign the message");
    } finally {
      setIsSigning(false);
    }
  }, [signMessageAsync, message, address]);

  const callHelper = async () => {

    const hashValidation = validateHash(hashMessageSaved);
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
      "Enter a valid helper contract address"
    );
    if (helperAddressValidation) {
      setHelperError(helperAddressValidation);
      return;
    }

    const userAddressValidation = validateAddress(
      userAddress,
      "Enter a valid user address"
    );
    if (userAddressValidation) {
      setHelperError(userAddressValidation);
      return;
    }

    try {
      setIsCallingHelper(true);
      setHelperError(null);
      setHelperResult(null);
      console.log("callHelper: refetchHelper result before call");
      const { data } = await refetchHelper();
      console.log("callHelper: refetchHelper result after", data);
      setHelperResult((data as Hex | undefined) ?? null);
    } catch (error: unknown) {
      console.error("callHelper error:", error);
      setHelperError(getErrorMessage(error));
    } finally {
      setIsCallingHelper(false);
    }
  };

  const callTarget = useCallback(async () => {
    const hashValidation = validateHash(hashMessageSaved);
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
      "Enter a valid contract address"
    );
    if (targetAddressValidation) {
      setTargetError(targetAddressValidation);
      return;
    }

    try {
      setIsCallingTarget(true);
      setTargetError(null);
      setTargetResult(null);
      const { data } = await refetchTarget();
      setTargetResult((data as Hex | undefined) ?? null);
    } catch (error: unknown) {
      setTargetError(getErrorMessage(error));
    } finally {
      setIsCallingTarget(false);
    }
  }, [refetchTarget, hashMessageSaved, signature, targetAddress]);

  const parsedSignature = useMemo((): { r: string; s: string; yParity: number } | null => {
    if (!signature) {
      return null;
    }
    try {
      const sig = parseSignature(signature);
      return { r: sig.r, s: sig.s, yParity: sig.yParity };
    } catch (error) {
      console.warn("Failed to parse signature", error);
      return null;
    }
  }, [signature]);

  const canSign = isConnected && message.length > 0;

  const matchesMagic = useMemo(
    () => ({
      helper: (helperResult ?? "").toLowerCase() === ERC1271_MAGIC_VALUE,
      target: (targetResult ?? "").toLowerCase() === ERC1271_MAGIC_VALUE,
    }),
    [helperResult, targetResult]
  );

  const updateHashMessage = useCallback((value: string) => {
    const normalized = value.trim();
    setHashMessageSaved(normalized ? (normalized as Hex) : "");
    setHashError(null);
  }, []);

  const updateSignature = useCallback((value: string) => {
    setSignature(value.trim() ? (value.trim() as Hex) : undefined);
    setSignError(null);
  }, []);

  const updateHelperAddress = useCallback((value: string) => {
    setHelperAddress(value.trim());
    setHelperError(null);
  }, []);

  const updateTargetAddress = useCallback((value: string) => {
    setTargetAddress(value.trim());
    setTargetError(null);
  }, []);

  const updateUserAddress = useCallback((value: string) => {
    setUserAddress(value.trim());
    setHelperError(null);
  }, []);

  return {
    state: {
      message,
      hashMessage: hashMessageSaved,
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
