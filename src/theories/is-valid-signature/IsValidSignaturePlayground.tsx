import React from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useProvider,
  useSigner,
} from "wagmi";
import { InjectedConnector } from "wagmi/connectors/injected";

import { ERC1271_MAGIC_VALUE } from "./constants.general";
import { useIsValidSignaturePlayground } from "./useIsValidSignaturePlayground";

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#374151",
  textTransform: "uppercase",
  letterSpacing: 0.6,
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 16,
  marginTop: 16,
  background: "#fff",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontFamily: "monospace",
  fontSize: 13,
  background: "#f9fafb",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  marginBottom: 12,
  color: "#111827",
};

const ResultMessage: React.FC<{ value: string | null; error: string | null; matched: boolean }>
  = ({ value, error, matched }) => {
    if (error) {
      return (
        <div style={{ color: "#b91c1c", fontSize: 13, marginTop: 8 }}>{error}</div>
      );
    }

    if (value) {
      return (
        <div
          style={{
            marginTop: 8,
            fontSize: 13,
            color: matched ? "#047857" : "#92400e",
            fontWeight: 600,
          }}
        >
          Ответ: {value}{" "}
          {matched ? "(валидная подпись)" : "(значение отличается от magic)"}
        </div>
      );
    }

    return null;
  };

export const IsValidSignaturePlayground: React.FC = () => {
  const { address, isConnected } = useAccount();
  const provider = useProvider();
  const { connect, isLoading: isConnecting } = useConnect({
    connector: new InjectedConnector(),
  });
  const { disconnect } = useDisconnect();
  const { data: signer } = useSigner();

  const { state, actions, parsedSignature, canSign, matchesMagic } =
    useIsValidSignaturePlayground({
      address: address ?? undefined,
      signer: signer ?? undefined,
      provider,
      isConnected,
    });

  return (
    <div
      style={{
        maxWidth: 820,
        margin: "32px auto 64px",
        fontFamily: "Inter, system-ui, sans-serif",
        color: "#1f2937",
        padding: "0 16px",
      }}
    >
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
        ERC-1271 Playground
      </h1>
      <p style={{ color: "#4b5563", marginBottom: 24 }}>
        Подпишите сообщение и проверьте работу <code>isValidSignature</code> на подготовленном helper
        контракте или на любом другом адресе.
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {isConnected ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "#f3f4f6",
              padding: "8px 12px",
              borderRadius: 999,
            }}
          >
            <span style={{ fontSize: 13, color: "#4b5563" }}>Подключен: {address}</span>
            <button
              onClick={() => disconnect()}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: "none",
                background: "#f87171",
                color: "white",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={() => connect()}
            disabled={isConnecting}
            style={{
              padding: "8px 18px",
              borderRadius: 999,
              border: "none",
              background: "#2563eb",
              color: "white",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {isConnecting ? "Подключение..." : "Подключить кошелек"}
          </button>
        )}
      </div>

      <div style={{ ...cardStyle, marginTop: 24 }}>
        <h2 style={sectionTitleStyle}>1. Формирование данных для подписи</h2>
        <label style={labelStyle}>Сообщение</label>
        <textarea
          placeholder="Введите произвольную строку"
          value={state.message}
          onChange={(e) => actions.setMessage(e.target.value)}
          rows={3}
          style={{
            ...inputStyle,
            fontFamily: "Inter, system-ui, sans-serif",
            resize: "vertical",
            minHeight: 80,
          }}
        />

        <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
          <button
            onClick={actions.computeHashes}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "#f9fafb",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Посчитать хеши
          </button>
          <button
            onClick={actions.signMessage}
            disabled={!canSign || state.isSigning}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "none",
              background: canSign ? "#10b981" : "#9ca3af",
              color: "white",
              cursor: canSign ? "pointer" : "not-allowed",
              fontWeight: 600,
            }}
          >
            {state.isSigning ? "Подписание..." : "Подписать через кошелек"}
          </button>
        </div>

        {state.hashError && (
          <div style={{ color: "#b91c1c", fontSize: 13, marginTop: 8 }}>{state.hashError}</div>
        )}
        {state.signError && (
          <div style={{ color: "#b91c1c", fontSize: 13, marginTop: 8 }}>{state.signError}</div>
        )}

        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          <div>
            <label style={labelStyle}>hashMessage (EIP-191)</label>
            <input
              value={state.hashMessage}
              onChange={(e) => actions.setHashMessage(e.target.value)}
              placeholder="0x..."
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>keccak256(utf8(message))</label>
            <input
              value={state.rawKeccakHash}
              readOnly
              placeholder="0x..."
              style={{ ...inputStyle, background: "#f3f4f6", color: "#374151" }}
            />
          </div>
          <div>
            <label style={labelStyle}>Подпись</label>
            <textarea
              value={state.signature}
              onChange={(e) => actions.setSignature(e.target.value)}
              placeholder="0x..."
              rows={2}
              style={{ ...inputStyle, minHeight: 68, resize: "vertical" }}
            />
          </div>
        </div>

        {parsedSignature && (
          <div
            style={{
              marginTop: 12,
              fontFamily: "monospace",
              fontSize: 12,
              background: "#f3f4f6",
              borderRadius: 6,
              padding: 12,
              color: "#374151",
            }}
          >
            <div>r: {parsedSignature.r}</div>
            <div>s: {parsedSignature.s}</div>
            <div>v: {parsedSignature.v}</div>
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>2. Проверка через helper контракт</h2>
        <p style={{ marginBottom: 12, fontSize: 13, color: "#4b5563" }}>
          Контракт проксирует вызов, позволяя передать адрес пользователя вручную.
        </p>
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <label style={labelStyle}>Helper контракт</label>
            <input
              value={state.helperAddress}
              onChange={(e) => actions.setHelperAddress(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Адрес пользователя (user)</label>
            <input
              value={state.userAddress}
              onChange={(e) => actions.setUserAddress(e.target.value)}
              placeholder="0x..."
              style={inputStyle}
            />
          </div>
        </div>
        <button
          onClick={actions.callHelper}
          disabled={state.isCallingHelper}
          style={{
            marginTop: 16,
            padding: "10px 16px",
            borderRadius: 8,
            border: "none",
            background: "#2563eb",
            color: "white",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {state.isCallingHelper ? "Запрос..." : "Вызвать isValidSignatureWithUser"}
        </button>
        <ResultMessage
          value={state.helperResult}
          error={state.helperError}
          matched={matchesMagic.helper}
        />
      </div>

      <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>3. Прямой вызов isValidSignature</h2>
        <p style={{ marginBottom: 12, fontSize: 13, color: "#4b5563" }}>
          Используйте для проверки других контрактов. Если вызов завершается revert-ом, значит подпись не
          поддерживается текущей реализацией.
        </p>
        <label style={labelStyle}>Адрес контракта</label>
        <input
          value={state.targetAddress}
          onChange={(e) => actions.setTargetAddress(e.target.value)}
          style={inputStyle}
        />
        <button
          onClick={actions.callTarget}
          disabled={state.isCallingTarget}
          style={{
            marginTop: 16,
            padding: "10px 16px",
            borderRadius: 8,
            border: "none",
            background: "#111827",
            color: "white",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {state.isCallingTarget ? "Запрос..." : "Вызвать isValidSignature"}
        </button>
        <ResultMessage
          value={state.targetResult}
          error={state.targetError}
          matched={matchesMagic.target}
        />
      </div>

      <div style={{ marginTop: 24, fontSize: 12, color: "#6b7280" }}>
        Ожидаемое magic значение: <code>{ERC1271_MAGIC_VALUE}</code>.
      </div>
    </div>
  );
};
