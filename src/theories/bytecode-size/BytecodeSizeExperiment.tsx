import React, { useEffect, useState } from "react";
import { injected, useAccount, useConnect, useDisconnect } from "wagmi";

import { ERC1271_MAGIC_VALUE } from "./constants";
import { isErc1271MagicValue, useBytecodeSizeExperiment } from "./useBytecodeSizeExperiment";
import "./BytecodeSizeExperiment.css";

export const BytecodeSizeExperiment: React.FC = () => {
  const { state, actions, chainId, chains } = useBytecodeSizeExperiment();
  const activeChain = chains.find((chain) => chain.id === chainId);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const { address, isConnected } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    if (copyState === "idle") {
      return;
    }
    const timeoutId = window.setTimeout(() => setCopyState("idle"), 2000);
    return () => window.clearTimeout(timeoutId);
  }, [copyState]);

  const handleCopyPayload = async () => {
    if (!state.payloadForSigning) {
      return;
    }
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(state.payloadForSigning);
        setCopyState("copied");
      } else {
        throw new Error("Clipboard API is unavailable");
      }
    } catch (error) {
      console.warn("Failed to copy the payload", error);
      setCopyState("error");
    }
  };

  return (
    <div className="bytecode-container">
      <h1 className="bytecode-title">Bytecode Size Playground</h1>
      <p className="bytecode-description">
        Recover the signer address via EIP-712, fetch the bytecode, and determine whether it is an EOA
        or a smart contract. Optionally, call <code>isValidSignature</code>.
      </p>

      <div className="bytecode-card">
        <h2 className="bytecode-section-title">1. Recover the EIP-712 signer</h2>
        <div className="bytecode-wallet-row">
          {isConnected ? (
            <>
              <span className="bytecode-wallet-address">
                Connected: <code>{address}</code>
              </span>
              <button
                className="bytecode-disconnect-button"
                onClick={() => disconnect()}
                type="button"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              className="bytecode-connect-button"
              onClick={() => connect({ connector: injected() })}
              disabled={isConnecting}
              type="button"
            >
              {isConnecting ? "Connecting..." : "Connect wallet"}
            </button>
          )}
        </div>
        <div className="bytecode-field">
          <label className="bytecode-label">Network for requests</label>
          <select
            className="bytecode-select"
            value={chainId}
            onChange={(event) => actions.setChainId(Number(event.target.value))}
          >
            {chains.map((chain) => (
              <option key={chain.id} value={chain.id}>
                {chain.name}
              </option>
            ))}
          </select>
        </div>
        <div className="bytecode-grid">
          <div className="bytecode-field">
            <label className="bytecode-label">domain (JSON)</label>
            <textarea
              className="bytecode-textarea"
              value={state.domainInput}
              onChange={(event) => actions.setDomainInput(event.target.value)}
              rows={8}
              spellCheck={false}
            />
          </div>
          <div className="bytecode-field">
            <label className="bytecode-label">types (JSON)</label>
            <textarea
              className="bytecode-textarea"
              value={state.typesInput}
              onChange={(event) => actions.setTypesInput(event.target.value)}
              rows={8}
              spellCheck={false}
            />
          </div>
        </div>
        <div className="bytecode-field">
          <label className="bytecode-label">message (JSON)</label>
          <textarea
            className="bytecode-textarea"
            value={state.messageInput}
            onChange={(event) => actions.setMessageInput(event.target.value)}
            rows={6}
            spellCheck={false}
          />
        </div>
        <div className="bytecode-inline">
          <div className="bytecode-field">
            <label className="bytecode-label">primaryType</label>
            <input
              className="bytecode-input"
              value={state.primaryType}
              onChange={(event) => actions.setPrimaryType(event.target.value)}
              placeholder="For example, PermitSingle"
            />
          </div>
          <div className="bytecode-field">
            <label className="bytecode-label">signature</label>
            <input
              className="bytecode-input"
              value={state.signatureInput}
              onChange={(event) => actions.setSignatureInput(event.target.value)}
              placeholder="0x..."
            />
          </div>
        </div>
        <div className="bytecode-actions">
          <button
            className="bytecode-primary-button"
            onClick={actions.recoverSigner}
            disabled={state.isRecovering}
            type="button"
          >
            {state.isRecovering ? "Recovering..." : "Recover address"}
          </button>
          <button
            className="bytecode-ghost-button"
            onClick={actions.generatePayload}
            type="button"
          >
            Generate payload for signing
          </button>
          <button
            className="bytecode-secondary-button"
            onClick={actions.autogenerateTypedData}
            disabled={state.isAutogenerating}
            type="button"
          >
            {state.isAutogenerating ? "Signing..." : "Autogenerate and sign"}
          </button>
        </div>
        {state.autogenerateError && <div className="bytecode-error">{state.autogenerateError}</div>}
        {state.payloadError && <div className="bytecode-error">{state.payloadError}</div>}
        {state.payloadForSigning && (
          <div className="bytecode-payload">
            <div className="bytecode-payload-header">
              <span>eth_signTypedData_v4 payload</span>
              <button
                className="bytecode-ghost-button"
                onClick={handleCopyPayload}
                type="button"
              >
                {copyState === "copied"
                  ? "Copied"
                  : copyState === "error"
                    ? "Copy error"
                    : "Copy"}
              </button>
            </div>
            <pre className="bytecode-pre">{state.payloadForSigning}</pre>
          </div>
        )}
        {state.typedDataError && (
          <div className="bytecode-error">{state.typedDataError}</div>
        )}
        {state.claimedSigner && (
          <div className="bytecode-info">
            <div>
              Signer: <code>{state.claimedSigner}</code>
            </div>
            {state.hashInput && (
              <div>
                hashTypedData: <code>{state.hashInput}</code>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bytecode-card">
        <h2 className="bytecode-section-title">2. Fetch the bytecode</h2>
        <p className="bytecode-hint">
          You can change the address manually, for example to inspect a contract unrelated to the
          signature.
        </p>
        <div className="bytecode-field">
          <label className="bytecode-label">Address to inspect</label>
          <input
            className="bytecode-input"
            value={state.addressInput}
            onChange={(event) => actions.setAddressInput(event.target.value)}
            placeholder="0x..."
          />
        </div>
        <button
          className="bytecode-secondary-button"
          onClick={actions.fetchBytecode}
          disabled={state.isFetchingBytecode}
        >
          {state.isFetchingBytecode ? "Requesting..." : "Fetch bytecode"}
        </button>
        {state.bytecodeError && (
          <div className="bytecode-error">{state.bytecodeError}</div>
        )}
        {state.bytecodeResult && (
          <div className="bytecode-summary">
            <div>
              Network: <strong>{activeChain?.name ?? "Unknown"}</strong>
            </div>
            <div>
              Address: <code>{state.bytecodeResult.address}</code>
            </div>
            <div>
              Bytecode size: <strong>{state.bytecodeResult.size}</strong> bytes
            </div>
            <div>
              Signer type: {state.bytecodeResult.isContract ? "smart contract" : "EOA (externally owned account)"}
            </div>
            {state.bytecodeResult.bytecode && state.bytecodeResult.bytecode !== "0x" && (
              <details className="bytecode-details">
                <summary>Show bytecode</summary>
                <pre className="bytecode-pre">{state.bytecodeResult.bytecode}</pre>
              </details>
            )}
          </div>
        )}
      </div>

      <div className="bytecode-card">
        <h2 className="bytecode-section-title">3. Check ERC-1271 (optional)</h2>
        <p className="bytecode-hint">
          Calling <code>isValidSignature</code> is useful for contract wallets. The expected magic value is
          <code> {ERC1271_MAGIC_VALUE}</code>.
        </p>
        <div className="bytecode-field">
          <label className="bytecode-label">hash (bytes32)</label>
          <input
            className="bytecode-input"
            value={state.hashInput}
            onChange={(event) => actions.setHashInput(event.target.value)}
            placeholder="0x..."
          />
        </div>
        <div className="bytecode-field">
          <label className="bytecode-label">signature (bytes)</label>
          <textarea
            className="bytecode-textarea"
            value={state.erc1271Signature}
            onChange={(event) => actions.setErc1271Signature(event.target.value)}
            rows={4}
            spellCheck={false}
          />
        </div>
        <button
          className="bytecode-secondary-button"
          onClick={actions.checkErc1271}
          disabled={state.isChecking1271}
        >
          {state.isChecking1271 ? "Calling..." : "Call isValidSignature"}
        </button>
        {state.erc1271Error && (
          <div className="bytecode-error">{state.erc1271Error}</div>
        )}
        {state.erc1271Result && (
          <div
            className={
              isErc1271MagicValue(state.erc1271Result)
                ? "bytecode-success"
                : "bytecode-warning"
            }
          >
            Contract returned: <code>{state.erc1271Result}</code>{" "}
            {isErc1271MagicValue(state.erc1271Result)
              ? "— signature is valid"
              : "— value differs from magic"}
          </div>
        )}
      </div>
    </div>
  );
};
