import React, { useEffect, useState } from "react";

import { ERC1271_MAGIC_VALUE } from "./constants";
import { isErc1271MagicValue, useBytecodeSizeExperiment } from "./useBytecodeSizeExperiment";
import "./BytecodeSizeExperiment.css";

export const BytecodeSizeExperiment: React.FC = () => {
  const { state, actions, chainId, chains } = useBytecodeSizeExperiment();
  const activeChain = chains.find((chain) => chain.id === chainId);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

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
        throw new Error("Clipboard API недоступен");
      }
    } catch (error) {
      console.warn("Не удалось скопировать payload", error);
      setCopyState("error");
    }
  };

  return (
    <div className="bytecode-container">
      <h1 className="bytecode-title">Bytecode Size Playground</h1>
      <p className="bytecode-description">
        Восстановите адрес подписанта через EIP-712, получите байткод и определите, является ли он
        EOA или смарт-контракт. При необходимости дополнительно вызовите <code>isValidSignature</code>.
      </p>

      <div className="bytecode-card">
        <h2 className="bytecode-section-title">1. Восстановление EIP-712 подписанта</h2>
        <div className="bytecode-field">
          <label className="bytecode-label">Сеть для запросов</label>
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
              placeholder="Например, PermitSingle"
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
            {state.isRecovering ? "Восстановление..." : "Восстановить адрес"}
          </button>
          <button
            className="bytecode-ghost-button"
            onClick={actions.generatePayload}
            type="button"
          >
            Сформировать payload для подписи
          </button>
        </div>
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
                  ? "Скопировано"
                  : copyState === "error"
                    ? "Ошибка копирования"
                    : "Скопировать"}
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
              Подписант: <code>{state.claimedSigner}</code>
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
        <h2 className="bytecode-section-title">2. Получение байткода</h2>
        <p className="bytecode-hint">
          Адрес можно изменить вручную, например, чтобы проверить контракт, не связанный с подписью.
        </p>
        <div className="bytecode-field">
          <label className="bytecode-label">Адрес для проверки</label>
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
          {state.isFetchingBytecode ? "Запрос..." : "Получить байткод"}
        </button>
        {state.bytecodeError && (
          <div className="bytecode-error">{state.bytecodeError}</div>
        )}
        {state.bytecodeResult && (
          <div className="bytecode-summary">
            <div>
              Сеть: <strong>{activeChain?.name ?? "Unknown"}</strong>
            </div>
            <div>
              Адрес: <code>{state.bytecodeResult.address}</code>
            </div>
            <div>
              Размер байткода: <strong>{state.bytecodeResult.size}</strong> байт
            </div>
            <div>
              Тип подписанта: {state.bytecodeResult.isContract ? "смарт-контракт" : "EOA (externally owned account)"}
            </div>
            {state.bytecodeResult.bytecode && state.bytecodeResult.bytecode !== "0x" && (
              <details className="bytecode-details">
                <summary>Показать байткод</summary>
                <pre className="bytecode-pre">{state.bytecodeResult.bytecode}</pre>
              </details>
            )}
          </div>
        )}
      </div>

      <div className="bytecode-card">
        <h2 className="bytecode-section-title">3. Проверка ERC-1271 (опционально)</h2>
        <p className="bytecode-hint">
          Вызов <code>isValidSignature</code> полезен для контрактных кошельков. Ожидаемое magic значение —
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
          {state.isChecking1271 ? "Вызов..." : "Вызвать isValidSignature"}
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
            Контракт вернул: <code>{state.erc1271Result}</code>{" "}
            {isErc1271MagicValue(state.erc1271Result)
              ? "— подпись валидна"
              : "— значение отличается от magic"}
          </div>
        )}
      </div>
    </div>
  );
};
