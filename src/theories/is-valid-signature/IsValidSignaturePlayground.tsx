import React from "react";
import { injected, useAccount, useConnect, useDisconnect } from "wagmi";

import { ERC1271_MAGIC_VALUE } from "./constants.general";
import { useIsValidSignaturePlayground } from "./useIsValidSignaturePlayground";
import "./IsValidSignaturePlayground.css";


const ResultMessage: React.FC<{ value: string | null; error: string | null; matched: boolean }>
  = ({ value, error, matched }) => {
    if (error) {
      return (
        <div className="result-error">{error}</div>
      );
    }

    if (value) {
      return (
        <div className={matched ? "result-success" : "result-warning"}>
          Response: {value}{" "}
          {matched ? "(signature is valid)" : "(value differs from magic)"}
        </div>
      );
    }

    return null;
  };

export const IsValidSignaturePlayground: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();

  const { state, actions, parsedSignature, canSign, matchesMagic } =
    useIsValidSignaturePlayground({
      address: address ?? undefined,
      isConnected,
    });

  return (
    <div className="container">
      <h1 className="title">
        ERC-1271 Playground
      </h1>
      <p className="description">
        Sign a message and test <code>isValidSignature</code> on the prepared helper contract or any
        other address.
      </p>

      <div className="connection-container">
        {isConnected ? (
          <div className="connected-info">
            <span className="connected-text">Connected: {address}</span>
            <button
              onClick={() => disconnect()}
              className="disconnect-button"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={() => connect({ connector: injected() })}
            disabled={isConnecting}
            className="connect-button"
          >
            {isConnecting ? "Connecting..." : "Connect wallet"}
          </button>
        )}
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h2 className="section-title">1. Prepare data for signing</h2>
        <label className="label">Message</label>
        <textarea
          placeholder="Enter any string"
          value={state.message}
          onChange={(e) => actions.setMessage(e.target.value)}
          rows={3}
          className="textarea"
        />

        <div className="buttons-container">
          <button
            onClick={actions.computeHashes}
            className="compute-button"
          >
            Compute hashes
          </button>
          <button
            onClick={actions.signMessage}
            disabled={!canSign || state.isSigning}
            className="sign-button"
          >
            {state.isSigning ? "Signing..." : "Sign with wallet"}
          </button>
        </div>

        {state.hashError && (
          <div className="error-message">{state.hashError}</div>
        )}
        {state.signError && (
          <div className="error-message">{state.signError}</div>
        )}

        <div className="hashes-grid">
          <div>
            <label className="label">hashMessage (EIP-191)</label>
            <input
              value={state.hashMessage}
              onChange={(e) => actions.setHashMessage(e.target.value)}
              placeholder="0x..."
              className="input"
            />
          </div>
          <div>
            <label className="label">keccak256(utf8(message))</label>
            <input
              value={state.rawKeccakHash}
              readOnly
              placeholder="0x..."
              className="readonly-input"
            />
          </div>
          <div>
            <label className="label">Signature</label>
            <textarea
              value={state.signature}
              onChange={(e) => actions.setSignature(e.target.value)}
              placeholder="0x..."
              rows={2}
              className="signature-textarea"
            />
          </div>
        </div>

        {parsedSignature && (
          <div className="parsed-signature">
            <div>r: {parsedSignature.r}</div>
            <div>s: {parsedSignature.s}</div>
            <div>v: {parsedSignature.yParity}</div>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="section-title">2. Verification via helper contract</h2>
        <p className="helper-description">
          The contract proxies the call, letting you supply the user address manually.
        </p>
        <div className="inputs-grid">
          <div>
            <label className="label">Helper contract</label>
            <input
              value={state.helperAddress}
              onChange={(e) => actions.setHelperAddress(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">User address (user)</label>
            <input
              value={state.userAddress}
              onChange={(e) => actions.setUserAddress(e.target.value)}
              placeholder="0x..."
              className="input"
            />
          </div>
        </div>
        <button
          onClick={actions.callHelper}
          disabled={state.isCallingHelper}
          className="helper-button"
        >
          {state.isCallingHelper ? "Requesting..." : "Call isValidSignatureWithUser"}
        </button>
        <ResultMessage
          value={state.helperResult}
          error={state.helperError}
          matched={matchesMagic.helper}
        />
      </div>

      <div className="card">
        <h2 className="section-title">3. Direct isValidSignature call</h2>
        <p className="target-description">
          Use this to test other contracts. If the call reverts, the signature is not supported by the
          current implementation.
        </p>
        <label className="label">Contract address</label>
        <input
          value={state.targetAddress}
          onChange={(e) => actions.setTargetAddress(e.target.value)}
          className="input"
        />
        <button
          onClick={actions.callTarget}
          disabled={state.isCallingTarget}
          className="target-button"
        >
          {state.isCallingTarget ? "Requesting..." : "Call isValidSignature"}
        </button>
        <ResultMessage
          value={state.targetResult}
          error={state.targetError}
          matched={matchesMagic.target}
        />
      </div>

      <div className="magic-info">
        Expected magic value: <code>{ERC1271_MAGIC_VALUE}</code>.
      </div>
    </div>
  );
};
