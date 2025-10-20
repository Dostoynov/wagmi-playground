import React, { useCallback } from "react";
import { useState, useMemo } from "react";
import { ethers, Contract } from "ethers";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSigner,
} from "wagmi";

import { InjectedConnector } from "wagmi/connectors/injected";
import { depositTest } from "./deposit";

// Minimal ABI for a Greeter-like contract with setGreeting(string)
const GREETER_ABI = [
  {
    inputs: [{ internalType: "string", name: "_greeting", type: "string" }],
    name: "setGreeting",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

export const App: React.FC = () => {
  const [value, setValue] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const greeterAddress = useMemo(() => {
    return (import.meta as any).env?.VITE_GREETER_ADDRESS || "";
  }, []);

  const { address, isConnected } = useAccount();
  const { connect, isLoading: isConnecting } = useConnect({
    connector: new InjectedConnector(),
  });
  const { disconnect } = useDisconnect();
  const { data: signer } = useSigner();

  const canWrite = isConnected && !!signer && !!greeterAddress && value.length > 0;

  const onWrite = async () => {
    setError(null);
    setTxHash(null);
    if (!signer) {
      setError("No signer available");
      return;
    }
    if (!ethers.utils.isAddress(greeterAddress)) {
      setError("Invalid or missing VITE_GREETER_ADDRESS");
      return;
    }
    if (!value) {
      setError("Value is required");
      return;
    }

    try {
      setIsSubmitting(true);
      const contract = new Contract(greeterAddress, GREETER_ABI, signer);
      const tx = await contract.setGreeting(value);
      setTxHash(tx.hash);
      await tx.wait();
    } catch (e: any) {
      setError(e?.message ?? "Transaction failed");
    } finally {
      setIsSubmitting(false);
    }
  };
 
  const runDepositTest = useCallback(() => {
    try {
      depositTest();
    } catch (e) {
      console.error(e);
    }
  }, []);
  return (
    <div style={{ maxWidth: 520, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h2 style={{ marginBottom: 16 }}>Wagmi Write Demo</h2>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        {isConnected ? (
          <>
            <span style={{ fontSize: 14, color: "#4b5563" }}>Connected: {address}</span>
            <button onClick={() => disconnect()} style={{ padding: "6px 10px" }}>
              Disconnect
            </button>
          </>
        ) : (
          <button onClick={() => connect()} disabled={isConnecting} style={{ padding: "6px 10px" }}>
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </button>
        )}
        <button onClick={runDepositTest} disabled={isSubmitting} style={{ padding: "6px 10px" }}>Run Deposit Test</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          placeholder="Enter greeting"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={{ flex: 1, padding: 8, border: "1px solid #d1d5db", borderRadius: 4 }}
        />
        <button onClick={onWrite} disabled={!canWrite || isSubmitting} style={{ padding: "8px 12px" }}>
          {isSubmitting ? "Submitting..." : "Write"}
        </button>
      </div>

      {!greeterAddress && (
        <div style={{ color: "#b45309", fontSize: 13, marginBottom: 8 }}>
          Set VITE_GREETER_ADDRESS in your env to enable writes.
        </div>
      )}

      {txHash && (
        <div style={{ color: "#047857", fontSize: 13, marginTop: 8 }}>
          Tx sent: {txHash}
        </div>
      )}
      {error && (
        <div style={{ color: "#b91c1c", fontSize: 13, marginTop: 8 }}>
          {error}
        </div>
      )}
    </div>
  );
};