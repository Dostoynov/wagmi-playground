import React, { useMemo, useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useWalletClient,
} from "wagmi";
import { mainnet } from "wagmi/chains";
import {
  Address,
  Hex,
  createWalletClient,
  http,
  zeroAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getDeleGatorEnvironment } from "@metamask/delegation-toolkit";

import "./DelegationExperiment.css";

const metamaskEnvironment = getDeleGatorEnvironment(mainnet.id);

const delegatePresets = [
  {
    id: "metamask",
    label: "MetaMask Smart Account",
    description: "Delegates control to the MetaMask smart account.",
    address: metamaskEnvironment.implementations.EIP7702StatelessDeleGatorImpl,
  },
  {
    id: "null",
    label: "Null address",
    description: "Cancels the current delegation by sending it to the null address.",
    address: zeroAddress,
  },
  {
    id: "safepal",
    label: "SafePal account",
    description:
      "Use this address if you need to reproduce the isValidSignature issue.",
    address: "0xb15bed8fc30d3e82672bf7cd75417b414983934b" as Address,
  },
] as const;

export const DelegationUiExperiment: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { connectors, connectAsync, status: connectStatus, error: connectError } =
    useConnect();
  const { disconnect } = useDisconnect();
  const { data: walletClient } = useWalletClient();

  const [selectedOption, setSelectedOption] = useState<(typeof delegatePresets)[number]["id"] | "custom">(
    delegatePresets[0].id
  );
  const [customAddress, setCustomAddress] = useState<string>("");
  const [privateKeyInput, setPrivateKeyInput] = useState<string>("");
  const [delegateStatus, setDelegateStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [delegateError, setDelegateError] = useState<string | null>(null);
  const [delegateResponse, setDelegateResponse] = useState<string | null>(null);

  const currentContractAddress = useMemo(() => {
    if (selectedOption === "custom") {
      return customAddress.trim();
    }

    const preset = delegatePresets.find((option) => option.id === selectedOption);
    return preset?.address ?? delegatePresets[0].address;
  }, [customAddress, selectedOption]);

  const shortAddress = useMemo(() => {
    if (!address) {
      return null;
    }

    return `${address.slice(0, 6)}…${address.slice(-4)}`;
  }, [address]);

  const normalizedPrivateKey = useMemo(() => {
    const trimmed = privateKeyInput.trim();
    if (!trimmed) {
      return null;
    }

    return (trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`) as Hex;
  }, [privateKeyInput]);

  const walletSupportsAuthorization = useMemo(() => {
    const account = walletClient?.account as
    // @ts-ignore
      | (typeof walletClient.account & { signAuthorization?: unknown })
      | undefined;

    if (!account) {
      return false;
    }

    if (account.type !== "local") {
      return false;
    }

    return typeof account.signAuthorization === "function";
  }, [walletClient?.account]);

  const handleConnect = async () => {
    if (!connectors?.length) {
      return;
    }

    try {
      setDelegateError(null);
      await connectAsync({ connector: connectors[0] });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to connect the wallet.";
      setDelegateError(message);
    }
  };

  const handleDelegate = async () => {
    if (!currentContractAddress) {
      setDelegateStatus("error");
      setDelegateError("Enter a contract address for the delegation.");
      return;
    }

    setDelegateStatus("pending");
    setDelegateError(null);
    setDelegateResponse(null);

    try {
      let authorizationAccount = walletClient?.account;
      let authorizationClient = walletClient;
      let usedPrivateKey: string | null = null;

      if (!authorizationAccount || !walletSupportsAuthorization) {
        if (!normalizedPrivateKey) {
          throw new Error(
            authorizationAccount
              ? "The wallet does not support signing EIP-7702. Enter the private key below."
              : "Connect a wallet or enter a private key to sign the delegation."
          );
        }

        const account = privateKeyToAccount(normalizedPrivateKey);
        authorizationAccount = account;
        usedPrivateKey = normalizedPrivateKey;

        authorizationClient = createWalletClient({
          account,
          chain: walletClient?.chain ?? mainnet,
          transport: http(),
        });
      }

      const authorization = await authorizationClient!.signAuthorization({
        account: authorizationAccount!,
        contractAddress: currentContractAddress as Address,
        executor: "self",
      });

      const hash = await authorizationClient!.sendTransaction({
        account: authorizationAccount!,
        authorizationList: [authorization],
        data: "0x",
        to: zeroAddress,
      });

      setDelegateStatus("success");
      setDelegateResponse(
        JSON.stringify(
          {
            hash,
            contractAddress: currentContractAddress,
            authorization,
            signerType: usedPrivateKey ? "privateKey" : "wallet",
          },
          // Custom replacer to convert BigInt to string
          (key, value) => (typeof value === "bigint" ? value.toString() : value),
          2
        )
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to submit the delegation. Please try again.";
      setDelegateStatus("error");
      setDelegateError(message);
    }
  };

  return (
    <div className="delegation-wrapper">
      <header className="delegation-header">
        <h1 className="delegation-title">Delegation Toolkit Playground</h1>
        <p className="delegation-description">
          Connect a wallet, choose a delegate address, and sign an EIP-7702 authorization.
        </p>
      </header>

      <div className="delegation-card">
        <section className="delegation-section">
          <h2 className="delegation-section-title">Wallet connection</h2>
          <div className="delegation-connect">
            {isConnected ? (
              <div className="delegation-connected">
                <span className="delegation-connected-label">{shortAddress}</span>
                <button
                  type="button"
                  className="delegation-button"
                  onClick={() => disconnect()}
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="delegation-button delegation-button--primary"
                onClick={handleConnect}
                disabled={connectStatus === "pending"}
              >
                {connectStatus === "pending" ? "Connecting..." : "Connect wallet"}
              </button>
            )}
          </div>
          {connectError && (
            <div className="delegation-hint delegation-hint--error">{connectError.message}</div>
          )}
          {isConnected && !walletSupportsAuthorization && (
            <div className="delegation-hint">
              The connected wallet does not support signing EIP-7702. Use the private key below.
            </div>
          )}
        </section>

        <section className="delegation-section">
          <h2 className="delegation-section-title">Delegate address</h2>
          <div className="delegation-option-list">
            {delegatePresets.map((option) => (
              <label key={option.id} className="delegation-option">
                <input
                  type="radio"
                  name="delegate-option"
                  value={option.id}
                  checked={selectedOption === option.id}
                  onChange={() => setSelectedOption(option.id)}
                />
                <div className="delegation-option-body">
                  <span className="delegation-option-label">{option.label}</span>
                  <span className="delegation-option-address">{option.address}</span>
                  <span className="delegation-option-description">{option.description}</span>
                </div>
              </label>
            ))}
            <label className="delegation-option">
              <input
                type="radio"
                name="delegate-option"
                value="custom"
                checked={selectedOption === "custom"}
                onChange={() => setSelectedOption("custom")}
              />
              <div className="delegation-option-body">
                <span className="delegation-option-label">Custom address</span>
                <input
                  className="delegation-input"
                  placeholder="0x..."
                  spellCheck={false}
                  value={customAddress}
                  onChange={(event) => setCustomAddress(event.target.value)}
                  disabled={selectedOption !== "custom"}
                />
              </div>
            </label>
          </div>
        </section>

        <section className="delegation-section">
          <h2 className="delegation-section-title">Fallback access via private key</h2>
          <p className="delegation-hint">
            If your PK does not start with 0x, simply add it to the beginning.
          </p>
          <input
            className="delegation-input"
            type="password"
            placeholder="0x..."
            spellCheck={false}
            value={privateKeyInput}
            onChange={(event) => setPrivateKeyInput(event.target.value)}
          />
        </section>

        <section className="delegation-section">
          <button
            type="button"
            className="delegation-button delegation-button--primary"
            onClick={handleDelegate}
            disabled={delegateStatus === "pending"}
          >
            {delegateStatus === "pending" ? "Signing..." : "Sign delegation"}
          </button>

          {delegateError && <div className="delegation-hint delegation-hint--error">{delegateError}</div>}

          {delegateResponse && (
            <div className="delegation-response">
              <span className="delegation-response-title">Wallet response</span>
              <pre className="delegation-pre">{delegateResponse}</pre>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
