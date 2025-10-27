import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type Address,
  BaseError,
  type Hex,
  type TypedData,
  type TypedDataDomain,
  getAddress,
  hashTypedData,
  isAddress,
  isHex,
  recoverTypedDataAddress,
} from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

import { AVAILABLE_CHAINS, ERC1271_ABI, ERC1271_MAGIC_VALUE } from "./constants";
import { buildSamplePermitSingleTypedData } from "./samplePermitTypedData";

const getErrorMessage = (error: unknown) => {
  if (error instanceof BaseError) {
    return error.shortMessage || error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
};

const parseJsonInput = <T,>(value: string, errorMessage: string): T => {
  try {
    return JSON.parse(
      value,
      (_, v) => (typeof v === "bigint" ? v.toString() : v)
    ) as T;
  } catch (error) {
    throw new Error(errorMessage);
  }
};

const stringifyJson = (value: unknown) => JSON.stringify(value, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2);

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
  autogenerateError: string | null;
  typedDataError: string | null;
  isRecovering: boolean;
  isAutogenerating: boolean;
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
  autogenerateTypedData: () => Promise<void>;
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
  if (typeof size === "number" && !isHex(value, { strict: false })) {
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
  const [autogenerateError, setAutogenerateError] = useState<string | null>(null);
  const [typedDataError, setTypedDataError] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isAutogenerating, setIsAutogenerating] = useState(false);
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

  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId });
  const { data: walletClient } = useWalletClient({ chainId });

  useEffect(() => {
    setBytecodeResult(null);
    setBytecodeError(null);
    setErc1271Result(null);
    setErc1271Error(null);
  }, [chainId]);

  const autogenerateTypedData = useCallback(async () => {
    setAutogenerateError(null);
    setTypedDataError(null);
    setPayloadError(null);
    setPayloadForSigning(null);
    setClaimedSigner(null);
    setAddressInput("");
    setBytecodeResult(null);
    setBytecodeError(null);
    setErc1271Result(null);
    setErc1271Error(null);

    if (!walletClient || !address) {
      setAutogenerateError("Connect a wallet to sign");
      return;
    }

    const typedData = buildSamplePermitSingleTypedData(chainId);

    try {
      setIsAutogenerating(true);

      const signature = await walletClient.signTypedData({
        account: address as Address,
        domain: typedData.domain,
        types: typedData.types,
        primaryType: typedData.primaryType,
        message: typedData.message,
      });

      const payload = stringifyJson({
        domain: typedData.domain,
        types: typedData.types,
        primaryType: typedData.primaryType,
        message: typedData.message,
      });

      setDomainInput(stringifyJson(typedData.domain));
      setTypesInput(stringifyJson(typedData.types));
      setMessageInput(stringifyJson(typedData.message));
      setPrimaryType(typedData.primaryType);
      setSignatureInput(signature);
      setErc1271Signature(signature);
      setPayloadForSigning(payload);

      try {
        const digest = hashTypedData({
          domain: typedData.domain,
          types: typedData.types,
          primaryType: typedData.primaryType,
          message: typedData.message,
        });
        setHashInput(digest);
      } catch (error) {
        console.warn("Failed to compute hashTypedData", error);
      }
    } catch (error) {
      console.error("autogenerateTypedData error:", error);
      setAutogenerateError(getErrorMessage(error));
    } finally {
      setIsAutogenerating(false);
    }
  }, [address, chainId, walletClient]);

  const generatePayload = useCallback(() => {
    setAutogenerateError(null);
    setPayloadError(null);
    setPayloadForSigning(null);
    try {
      const domain = parseJsonInput<TypedDataDomain>(
        domainInput,
        "Domain must be valid JSON",
      );
      const types = parseJsonInput<TypedDataShape>(
        typesInput,
        "Types must be valid JSON",
      );
      const message = parseJsonInput<TypedDataMessage>(
        messageInput,
        "Message must be valid JSON",
      );

      if (!primaryType) {
        throw new Error("Specify primaryType");
      }

      const typedData = types as TypedData;

      if (!typedData[primaryType as keyof typeof typedData]) {
        throw new Error("The provided primaryType is missing in types");
      }

      const payload = stringifyJson({
        types: typedData,
        domain,
        primaryType,
        message,
      });

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
        "Domain must be valid JSON"
      );
      const types = parseJsonInput<TypedDataShape>(
        typesInput,
        "Types must be valid JSON"
      );
      const message = parseJsonInput<TypedDataMessage>(
        messageInput,
        "Message must be valid JSON"
      );
      const typedData = types as TypedData;

      if (!primaryType) {
        throw new Error("Specify primaryType");
      }
      if (!normalizeBytes(signatureInput, 65)) {
        throw new Error("Signature must be a valid 65-byte hex string");
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
        console.warn("Failed to compute hashTypedData", error);
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
      setBytecodeError("The public client has not been initialized yet");
      return;
    }
    if (!addressInput) {
      setBytecodeError("Enter an address to inspect");
      return;
    }
    if (!isAddress(addressInput)) {
      setBytecodeError("Address must be valid");
      return;
    }

    try {
      setIsFetchingBytecode(true);
      const normalized = getAddress(addressInput as Address);
      const bytecode = await publicClient.getCode({ address: normalized });
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
      setErc1271Error("The public client has not been initialized yet");
      return;
    }
    if (!addressInput || !isAddress(addressInput)) {
      setErc1271Error("Enter a valid address to call");
      return;
    }
    if (!normalizeBytes(hashInput, 32)) {
      setErc1271Error("hash must be a bytes32 hex string");
      return;
    }
    if (!normalizeBytes(erc1271Signature)) {
      setErc1271Error("signature must be a hex string");
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

  const handleDomainInput = useCallback((value: string) => {
    setDomainInput(value);
    setPayloadForSigning(null);
    setPayloadError(null);
    setAutogenerateError(null);
  }, []);

  const handleTypesInput = useCallback((value: string) => {
    setTypesInput(value);
    setPayloadForSigning(null);
    setPayloadError(null);
    setAutogenerateError(null);
  }, []);

  const handleMessageInput = useCallback((value: string) => {
    setMessageInput(value);
    setPayloadForSigning(null);
    setPayloadError(null);
    setAutogenerateError(null);
  }, []);

  const handlePrimaryType = useCallback((value: string) => {
    setPrimaryType(value);
    setPayloadForSigning(null);
    setPayloadError(null);
    setAutogenerateError(null);
  }, []);

  const handleSignatureInput = useCallback((value: string) => {
    setSignatureInput(value);
    setAutogenerateError(null);
  }, []);

  const handleAddressInput = useCallback((value: string) => {
    setAddressInput(value);
    setAutogenerateError(null);
  }, []);

  const actions = useMemo<ExperimentActions>(() => ({
    setDomainInput: handleDomainInput,
    setTypesInput: handleTypesInput,
    setMessageInput: handleMessageInput,
    setPrimaryType: handlePrimaryType,
    setSignatureInput: handleSignatureInput,
    setAddressInput: handleAddressInput,
    setHashInput,
    setErc1271Signature,
    setChainId,
    generatePayload,
    autogenerateTypedData,
    recoverSigner,
    fetchBytecode,
    checkErc1271,
  }), [
    handleDomainInput,
    handleTypesInput,
    handleMessageInput,
    handlePrimaryType,
    handleSignatureInput,
    handleAddressInput,
    setHashInput,
    setErc1271Signature,
    setChainId,
    generatePayload,
    autogenerateTypedData,
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
    autogenerateError,
    typedDataError,
    isRecovering,
    isAutogenerating,
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
