import React, { useState } from "react";
import {
  injected,
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useWalletClient,
} from "wagmi";
import { isAddress, numberToHex } from "viem";

import "./DelegationExperiment.css";

type SendCallsParams = {
  from: `0x${string}`;
  chainId?: `0x${string}`;
  delegations?: Record<string, unknown>[];
  revocations?: Record<string, unknown>[];
  calls?: Record<string, unknown>[];
};

const toHexChainId = (chainId?: number) =>
  chainId ? (numberToHex(BigInt(chainId)) as `0x${string}`) : undefined;

const sanitizeContractAddress = (value: string) => value.trim();

export const DelegationExperiment: React.FC = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: walletClient } = useWalletClient();

  const [delegateContract, setDelegateContract] = useState<string>("");
  const [delegateStatus, setDelegateStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [delegateError, setDelegateError] = useState<string | null>(null);
  const [delegateResponse, setDelegateResponse] = useState<string | null>(null);

  const [undelegateContract, setUndelegateContract] = useState<string>("");
  const [undelegateStatus, setUndelegateStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [undelegateError, setUndelegateError] = useState<string | null>(null);
  const [undelegateResponse, setUndelegateResponse] = useState<string | null>(null);

  const canInteract = isConnected && Boolean(address);

  const resolvedChainId = walletClient?.chain?.id ?? chainId ?? undefined;
  const chainIdHex = toHexChainId(resolvedChainId);

  const handleDelegate = async () => {
    const client = walletClient;

    if (!address || !client?.request) {
      setDelegateError("Кошелек не подключен или не поддерживает wallet_sendCalls");
      setDelegateStatus("error");
      return;
    }

    const contract = sanitizeContractAddress(delegateContract);
    if (!isAddress(contract)) {
      setDelegateError("Введите корректный адрес контракта для делегации");
      setDelegateStatus("error");
      return;
    }

    setDelegateStatus("pending");
    setDelegateError(null);
    setDelegateResponse(null);

    const payload: SendCallsParams = {
      from: address,
      chainId: chainIdHex,
      delegations: [
        {
          delegate: contract,
          authorityAddress: address,
          caveats: [],
        },
      ],
      calls: [],
    };

    try {
      const response = await client.request({
        method: "wallet_sendCalls",
        params: [payload],
      });
      setDelegateStatus("success");
      setDelegateResponse(JSON.stringify(response, null, 2));
    } catch (error) {
      console.error("Delegation failed", error);
      setDelegateStatus("error");
      setDelegateError((error as Error)?.message ?? "Не удалось выполнить делегацию");
    }
  };

  const handleUndelegate = async () => {
    const client = walletClient;

    if (!address || !client?.request) {
      setUndelegateError("Кошелек не подключен или не поддерживает wallet_sendCalls");
      setUndelegateStatus("error");
      return;
    }

    const contract = sanitizeContractAddress(undelegateContract);
    if (!isAddress(contract)) {
      setUndelegateError("Введите корректный адрес контракта для отзыва делегации");
      setUndelegateStatus("error");
      return;
    }

    setUndelegateStatus("pending");
    setUndelegateError(null);
    setUndelegateResponse(null);

    const payload: SendCallsParams = {
      from: address,
      chainId: chainIdHex,
      revocations: [
        {
          delegate: contract,
          authorityAddress: address,
        },
      ],
      calls: [],
    };

    try {
      const response = await client.request({
        method: "wallet_sendCalls",
        params: [payload],
      });
      setUndelegateStatus("success");
      setUndelegateResponse(JSON.stringify(response, null, 2));
    } catch (error) {
      console.error("Undelegation failed", error);
      setUndelegateStatus("error");
      setUndelegateError((error as Error)?.message ?? "Не удалось отозвать делегацию");
    }
  };

  return (
    <div className="delegation-wrapper">
      <h1 className="delegation-title">Delegation Toolkit Playground</h1>
      <p className="delegation-description">
        Эксперимент с EIP-7702 делегациями: подключите кошелек, укажите адрес смарт-контракта и
        выполните действия Delegate или Undelegate через <code>wallet_sendCalls</code>.
      </p>

      <div className="delegation-connection">
        {isConnected ? (
          <div className="delegation-connected">
            <span className="delegation-connected-label">Подключен: {address}</span>
            <button className="delegation-button delegation-button--ghost" onClick={() => disconnect()}>
              Disconnect
            </button>
          </div>
        ) : (
          <button
            className="delegation-button delegation-button--primary"
            onClick={() => connect({ connector: injected() })}
            disabled={isConnecting}
          >
            {isConnecting ? "Подключение..." : "Подключить кошелек"}
          </button>
        )}
      </div>

      <div className="delegation-card">
        <h2 className="delegation-section-title">1. Delegate</h2>
        <p className="delegation-hint">
          Делегация закрепляется за конкретным адресом контракта. Для успешного отзыва нужно будет
          указать тот же адрес.
        </p>
        <label className="delegation-label" htmlFor="delegate-contract">
          Адрес контракта для делегации
        </label>
        <input
          id="delegate-contract"
          className="delegation-input"
          value={delegateContract}
          onChange={(event) => setDelegateContract(event.target.value)}
          placeholder="0x..."
          spellCheck={false}
        />
        <button
          className="delegation-button delegation-button--primary"
          onClick={handleDelegate}
          disabled={!canInteract || delegateStatus === "pending"}
        >
          {delegateStatus === "pending" ? "Отправка..." : "Delegate"}
        </button>
        {delegateError && <div className="delegation-error">{delegateError}</div>}
        {delegateResponse && (
          <div className="delegation-response">
            <div className="delegation-response-header">Ответ провайдера</div>
            <pre className="delegation-pre">{delegateResponse}</pre>
          </div>
        )}
      </div>

      <div className="delegation-card">
        <h2 className="delegation-section-title">2. Undelegate</h2>
        <p className="delegation-hint">
          Отзыв делегации требует указать адрес контракта, который ранее был делегирован.
        </p>
        <label className="delegation-label" htmlFor="undelegate-contract">
          Адрес контракта для отзыва делегации
        </label>
        <input
          id="undelegate-contract"
          className="delegation-input"
          value={undelegateContract}
          onChange={(event) => setUndelegateContract(event.target.value)}
          placeholder="0x..."
          spellCheck={false}
        />
        <button
          className="delegation-button delegation-button--secondary"
          onClick={handleUndelegate}
          disabled={!canInteract || undelegateStatus === "pending"}
        >
          {undelegateStatus === "pending" ? "Отправка..." : "Undelegate"}
        </button>
        {undelegateError && <div className="delegation-error">{undelegateError}</div>}
        {undelegateResponse && (
          <div className="delegation-response">
            <div className="delegation-response-header">Ответ провайдера</div>
            <pre className="delegation-pre">{undelegateResponse}</pre>
          </div>
        )}
      </div>
    </div>
  );
};
