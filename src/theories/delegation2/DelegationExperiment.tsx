import React, { useMemo, useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useWalletClient,
} from "wagmi";
import { mainnet } from "wagmi/chains";
import { Address, zeroAddress } from "viem";
import { getDeleGatorEnvironment } from "@metamask/delegation-toolkit";

import "./DelegationExperiment.css";

const metamaskEnvironment = getDeleGatorEnvironment(mainnet.id);

const delegatePresets = [
  {
    id: "metamask",
    label: "MetaMask Smart Account",
    description: "Делегирует управление смарт-аккаунту MetaMask.",
    address: metamaskEnvironment.implementations.EIP7702StatelessDeleGatorImpl,
  },
  {
    id: "null",
    label: "Null address",
    description: "Отменяет текущую делегацию, отправляя её на нулевой адрес.",
    address: zeroAddress,
  },
  {
    id: "safepal",
    label: "SafePal account",
    description:
      "Используйте этот адрес, если нужно воспроизвести проблему с isValidSignature.",
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

  const handleConnect = async () => {
    if (!connectors?.length) {
      return;
    }

    try {
      setDelegateError(null);
      await connectAsync({ connector: connectors[0] });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось подключить кошелёк.";
      setDelegateError(message);
    }
  };

  const handleDelegate = async () => {
    if (!walletClient || !walletClient.account) {
      setDelegateStatus("error");
      setDelegateError("Подключите кошелёк, чтобы подписать делегацию.");
      return;
    }

    if (!currentContractAddress) {
      setDelegateStatus("error");
      setDelegateError("Введите адрес контракта для делегации.");
      return;
    }

    setDelegateStatus("pending");
    setDelegateError(null);
    setDelegateResponse(null);

    try {
      const authorization = await walletClient.signAuthorization({
        account: walletClient.account,
        contractAddress: currentContractAddress as Address,
        executor: "self",
      });

      const hash = await walletClient.sendTransaction({
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
          },
          null,
          2
        )
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Не удалось выполнить делегацию. Попробуйте ещё раз.";
      setDelegateStatus("error");
      setDelegateError(message);
    }
  };

  return (
    <div className="delegation-wrapper">
      <header className="delegation-header">
        <h1 className="delegation-title">Delegation Toolkit Playground</h1>
        <p className="delegation-description">
          Подключите кошелёк, выберите адрес делегата и подпишите EIP-7702 авторизацию.
        </p>
      </header>

      <div className="delegation-card">
        <section className="delegation-section">
          <h2 className="delegation-section-title">Подключение кошелька</h2>
          <div className="delegation-connect">
            {isConnected ? (
              <div className="delegation-connected">
                <span className="delegation-connected-label">{shortAddress}</span>
                <button
                  type="button"
                  className="delegation-button"
                  onClick={() => disconnect()}
                >
                  Отключить
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="delegation-button delegation-button--primary"
                onClick={handleConnect}
                disabled={connectStatus === "pending"}
              >
                {connectStatus === "pending" ? "Подключение..." : "Подключить кошелёк"}
              </button>
            )}
          </div>
          {connectError && (
            <div className="delegation-hint delegation-hint--error">{connectError.message}</div>
          )}
        </section>

        <section className="delegation-section">
          <h2 className="delegation-section-title">Адрес делегата</h2>
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
                <span className="delegation-option-label">Свой адрес</span>
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
          <button
            type="button"
            className="delegation-button delegation-button--primary"
            onClick={handleDelegate}
            disabled={delegateStatus === "pending"}
          >
            {delegateStatus === "pending" ? "Подписание..." : "Подписать делегацию"}
          </button>

          {delegateError && <div className="delegation-hint delegation-hint--error">{delegateError}</div>}

          {delegateResponse && (
            <div className="delegation-response">
              <span className="delegation-response-title">Ответ кошелька</span>
              <pre className="delegation-pre">{delegateResponse}</pre>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
