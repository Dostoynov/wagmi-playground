import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Address,
  BaseError,
  Hex,
  TypedData,
  TypedDataDomain,
  getAddress,
  hashTypedData,
  isAddress,
  isHex,
  recoverTypedDataAddress,
} from "viem";
import { usePublicClient } from "wagmi";

import { AVAILABLE_CHAINS, ERC1271_ABI, ERC1271_MAGIC_VALUE } from "./constants";

const getErrorMessage = (error: unknown) => {
  if (error instanceof BaseError) {
    return error.shortMessage || error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Неизвестная ошибка";
};

const parseJsonInput = <T,>(value: string, errorMessage: string): T => {
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    throw new Error(errorMessage);
  }
};

type TypedDataShape = TypedData | Record<string, { name: string; type: string }[]>;
type TypedDataMessage = Record<string, unknown>;

type BytecodeResult = {
  address: Address;
  bytecode: Hex | null;
  size: number;
  isContract: boolean;
};

type ExperimentState = {
  domainInput: string;
  typesInput: string;
  messageInput: string;
  primaryType: string;
  signatureInput: string;
  payloadForSigning: string | null;
  payloadError: string | null;
  typedDataError: string | null;
  isRecovering: boolean;
  claimedSigner: Address | null;
  addressInput: string;
  bytecodeResult: BytecodeResult | null;
  bytecodeError: string | null;
  isFetchingBytecode: boolean;
  hashInput: string;
  erc1271Signature: string;
  erc1271Result: Hex | null;
  erc1271Error: string | null;
  isChecking1271: boolean;
};

type ExperimentActions = {
  setDomainInput: (value: string) => void;
  setTypesInput: (value: string) => void;
  setMessageInput: (value: string) => void;
  setPrimaryType: (value: string) => void;
  setSignatureInput: (value: string) => void;
  setAddressInput: (value: string) => void;
  setHashInput: (value: string) => void;
  setErc1271Signature: (value: string) => void;
  setChainId: (chainId: number) => void;
  generatePayload: () => void;
  recoverSigner: () => Promise<void>;
  fetchBytecode: () => Promise<void>;
  checkErc1271: () => Promise<void>;
};

type ExperimentResult = {
  state: ExperimentState;
  actions: ExperimentActions;
  chainId: number;
  chains: typeof AVAILABLE_CHAINS;
};

const normalizeBytes = (value: string, size?: number) => {
  if (!value) {
    return false;
  }
  if (!isHex(value, { strict: false })) {
    return false;
  }
  if (typeof size === "number" && !isHex(value, { strict: false, size })) {
    return false;
  }
  return true;
};

export const useBytecodeSizeExperiment = (): ExperimentResult => {
  const [domainInput, setDomainInput] = useState<string>("{}");
  const [typesInput, setTypesInput] = useState<string>("{}");
  const [messageInput, setMessageInput] = useState<string>("{}");
  const [primaryType, setPrimaryType] = useState<string>("");
  const [signatureInput, setSignatureInput] = useState<string>("0x");
  const [payloadForSigning, setPayloadForSigning] = useState<string | null>(null);
  const [payloadError, setPayloadError] = useState<string | null>(null);
  const [typedDataError, setTypedDataError] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [claimedSigner, setClaimedSigner] = useState<Address | null>(null);
  const [addressInput, setAddressInput] = useState<string>("");
  const [bytecodeResult, setBytecodeResult] = useState<BytecodeResult | null>(null);
  const [bytecodeError, setBytecodeError] = useState<string | null>(null);
  const [isFetchingBytecode, setIsFetchingBytecode] = useState(false);
  const [hashInput, setHashInput] = useState<string>("");
  const [erc1271Signature, setErc1271Signature] = useState<string>("0x");
  const [erc1271Result, setErc1271Result] = useState<Hex | null>(null);
  const [erc1271Error, setErc1271Error] = useState<string | null>(null);
  const [isChecking1271, setIsChecking1271] = useState(false);
  const [chainId, setChainId] = useState<number>(AVAILABLE_CHAINS[0].id);

  const publicClient = usePublicClient({ chainId });

  useEffect(() => {
    setBytecodeResult(null);
    setBytecodeError(null);
    setErc1271Result(null);
    setErc1271Error(null);
  }, [chainId]);

  useEffect(() => {
    setPayloadForSigning(null);
    setPayloadError(null);
  }, [domainInput, typesInput, messageInput, primaryType]);

  const generatePayload = useCallback(() => {
    setPayloadError(null);
    setPayloadForSigning(null);
    try {
      const domain = parseJsonInput<TypedDataDomain>(
        domainInput,
        "Domain должен быть валидным JSON",
      );
      const types = parseJsonInput<TypedDataShape>(
        typesInput,
        "Types должны быть валидным JSON",
      );
      const message = parseJsonInput<TypedDataMessage>(
        messageInput,
        "Message должен быть валидным JSON",
      );

      if (!primaryType) {
        throw new Error("Укажите primaryType");
      }

      const typedData = types as TypedData;

      if (!typedData[primaryType as keyof typeof typedData]) {
        throw new Error("Указанный primaryType отсутствует в types");
      }

      const payload = JSON.stringify(
        {
          types: typedData,
          domain,
          primaryType,
          message,
        },
        null,
        2,
      );

      setPayloadForSigning(payload);
    } catch (error) {
      setPayloadError(getErrorMessage(error));
    }
  }, [domainInput, typesInput, messageInput, primaryType]);

  const recoverSigner = useCallback(async () => {
    setTypedDataError(null);
    setIsRecovering(true);
    try {
      const domain = parseJsonInput<TypedDataDomain>(
        domainInput,
        "Domain должен быть валидным JSON"
      );
      const types = parseJsonInput<TypedDataShape>(
        typesInput,
        "Types должны быть валидным JSON"
      );
      const message = parseJsonInput<TypedDataMessage>(
        messageInput,
        "Message должен быть валидным JSON"
      );
      const typedData = types as TypedData;

      if (!primaryType) {
        throw new Error("Укажите primaryType");
      }
      if (!normalizeBytes(signatureInput, 65)) {
        throw new Error("Подпись должна быть валидной hex-строкой длиной 65 байт");
      }

      const recovered = await recoverTypedDataAddress({
        domain,
        types: typedData,
        primaryType: primaryType as keyof typeof typedData,
        message,
        signature: signatureInput as Hex,
      });

      setClaimedSigner(recovered);
      setAddressInput(recovered);
      setBytecodeResult(null);
      setBytecodeError(null);
      setErc1271Result(null);
      setErc1271Error(null);
      setErc1271Signature(signatureInput);

      try {
        const digest = hashTypedData({
          domain,
          types: typedData,
          primaryType: primaryType as keyof typeof typedData,
          message,
        });
        setHashInput(digest);
      } catch (error) {
        console.warn("Не удалось посчитать hashTypedData", error);
      }
    } catch (error) {
      setTypedDataError(getErrorMessage(error));
    } finally {
      setIsRecovering(false);
    }
  }, [domainInput, typesInput, messageInput, primaryType, signatureInput]);

  const fetchBytecode = useCallback(async () => {
    setBytecodeError(null);
    setBytecodeResult(null);
    if (!publicClient) {
      setBytecodeError("Публичный клиент еще не инициализирован");
      return;
    }
    if (!addressInput) {
      setBytecodeError("Укажите адрес для проверки");
      return;
    }
    if (!isAddress(addressInput)) {
      setBytecodeError("Адрес должен быть валидным");
      return;
    }

    try {
      setIsFetchingBytecode(true);
      const normalized = getAddress(addressInput as Address);
      const bytecode = await publicClient.getBytecode({ address: normalized });
      const size = bytecode && bytecode !== "0x" ? (bytecode.length - 2) / 2 : 0;
      const isContract = Boolean(bytecode && bytecode !== "0x");
      setBytecodeResult({
        address: normalized,
        bytecode: bytecode ?? null,
        size,
        isContract,
      });
    } catch (error) {
      setBytecodeError(getErrorMessage(error));
    } finally {
      setIsFetchingBytecode(false);
    }
  }, [addressInput, publicClient]);

  const checkErc1271 = useCallback(async () => {
    setErc1271Error(null);
    setErc1271Result(null);
    if (!publicClient) {
      setErc1271Error("Публичный клиент еще не инициализирован");
      return;
    }
    if (!addressInput || !isAddress(addressInput)) {
      setErc1271Error("Укажите корректный адрес для вызова");
      return;
    }
    if (!normalizeBytes(hashInput, 32)) {
      setErc1271Error("hash должен быть bytes32 hex-строкой");
      return;
    }
    if (!normalizeBytes(erc1271Signature)) {
      setErc1271Error("signature должна быть hex-строкой");
      return;
    }

    try {
      setIsChecking1271(true);
      const normalized = getAddress(addressInput as Address);
      const result = await publicClient.readContract({
        address: normalized,
        abi: ERC1271_ABI,
        functionName: "isValidSignature",
        args: [hashInput as Hex, erc1271Signature as Hex],
      });
      setErc1271Result(result as Hex);
    } catch (error) {
      setErc1271Error(getErrorMessage(error));
    } finally {
      setIsChecking1271(false);
    }
  }, [addressInput, erc1271Signature, hashInput, publicClient]);

  const actions = useMemo<ExperimentActions>(() => ({
    setDomainInput,
    setTypesInput,
    setMessageInput,
    setPrimaryType,
    setSignatureInput,
    setAddressInput,
    setHashInput,
    setErc1271Signature,
    setChainId,
    generatePayload,
    recoverSigner,
    fetchBytecode,
    checkErc1271,
  }), [
    generatePayload,
    recoverSigner,
    fetchBytecode,
    checkErc1271,
  ]);

  const state: ExperimentState = {
    domainInput,
    typesInput,
    messageInput,
    primaryType,
    signatureInput,
    payloadForSigning,
    payloadError,
    typedDataError,
    isRecovering,
    claimedSigner,
    addressInput,
    bytecodeResult,
    bytecodeError,
    isFetchingBytecode,
    hashInput,
    erc1271Signature,
    erc1271Result,
    erc1271Error,
    isChecking1271,
  };

  return {
    state,
    actions,
    chainId,
    chains: AVAILABLE_CHAINS,
  };
};

export const isErc1271MagicValue = (value: Hex | null) => value === ERC1271_MAGIC_VALUE;
