import React, { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSigner,
  useProvider,
} from "wagmi";
import { InjectedConnector } from "wagmi/connectors/injected";

const ERC1271_MAGIC_VALUE = "0x1626ba7e";
const DEFAULT_HELPER_ADDRESS = "0xae6040089b24610dc54c44fbe66db88230994cb5";
const DEFAULT_TARGET_ADDRESS = "0x3c7a81f664fbb49e78b1746ff4583bae00855dd4";

const HELPER_ABI = [
  "function isValidSignatureWithUser(bytes32 hash, bytes signature, address user) view returns (bytes4)",
];

const ERC1271_ABI = [
  "function isValidSignature(bytes32 hash, bytes signature) view returns (bytes4)",
];

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

export const App: React.FC = () => {
  const [message, setMessage] = useState("");
  const [hashInput, setHashInput] = useState("");
  const [rawKeccakHash, setRawKeccakHash] = useState("");
  const [signature, setSignature] = useState("");
  const [hashError, setHashError] = useState<string | null>(null);
  const [signError, setSignError] = useState<string | null>(null);
  const [helperAddress, setHelperAddress] = useState(DEFAULT_HELPER_ADDRESS);
  const [targetAddress, setTargetAddress] = useState(DEFAULT_TARGET_ADDRESS);
  const [userAddress, setUserAddress] = useState("");
  const [helperResult, setHelperResult] = useState<string | null>(null);
  const [helperError, setHelperError] = useState<string | null>(null);
  const [targetResult, setTargetResult] = useState<string | null>(null);
  const [targetError, setTargetError] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [isCallingHelper, setIsCallingHelper] = useState(false);
  const [isCallingTarget, setIsCallingTarget] = useState(false);

  const { address, isConnected } = useAccount();
  const provider = useProvider();
  const { connect, isLoading: isConnecting } = useConnect({
    connector: new InjectedConnector(),
  });
  const { disconnect } = useDisconnect();
  const { data: signer } = useSigner();

  useEffect(() => {
    if (address) {
      setUserAddress(address);
    }
  }, [address]);

  const parsedSignature = useMemo(() => {
    if (!signature) {
      return null;
    }
    try {
      return ethers.utils.splitSignature(signature);
    } catch (error) {
      console.warn("Failed to parse signature", error);
      return null;
    }
  }, [signature]);

  const canSign = isConnected && Boolean(signer) && message.length > 0;

  const computeHashes = () => {
    if (!message) {
      setHashError("Введите сообщение для хеширования");
      return;
    }

    try {
      const hashMessage = ethers.utils.hashMessage(message);
      const keccakHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(message));
      setHashInput(hashMessage);
      setRawKeccakHash(keccakHash);
      setHashError(null);
    } catch (error: any) {
      setHashError(error?.message ?? "Не удалось посчитать хеш");
    }
  };

  const handleSign = async () => {
    setSignError(null);
    if (!signer) {
      setSignError("Signer недоступен. Подключите кошелек");
      return;
    }
    if (!message) {
      setSignError("Введите сообщение для подписи");
      return;
    }

    try {
      setIsSigning(true);
      const sig = await signer.signMessage(message);
      const hashMessage = ethers.utils.hashMessage(message);
      const keccakHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(message));
      setSignature(sig);
      setHashInput(hashMessage);
      setRawKeccakHash(keccakHash);
      if (address) {
        setUserAddress(address);
      }
    } catch (error: any) {
      setSignError(error?.message ?? "Не удалось подписать сообщение");
    } finally {
      setIsSigning(false);
    }
  };

  const validateHashInput = (hash: string) => {
    if (!ethers.utils.isHexString(hash)) {
      return "Хеш должен быть hex-строкой";
    }
    if (!ethers.utils.isHexString(hash, 32)) {
      return "Хеш должен соответствовать bytes32";
    }
    return null;
  };

  const validateSignatureInput = (sig: string) => {
    if (!ethers.utils.isHexString(sig)) {
      return "Подпись должна быть hex-строкой";
    }
    if (!ethers.utils.isHexString(sig, 65)) {
      return "Подпись должна соответствовать 65 байтам";
    }
    return null;
  };

  const handleCallHelper = async () => {
    setHelperError(null);
    setHelperResult(null);

    if (!provider) {
      setHelperError("Провайдер не инициализирован");
      return;
    }
    if (!hashInput) {
      setHelperError("Укажите хеш");
      return;
    }
    const hashValidation = validateHashInput(hashInput);
    if (hashValidation) {
      setHelperError(hashValidation);
      return;
    }
    if (!signature) {
      setHelperError("Укажите подпись");
      return;
    }
    const sigValidation = validateSignatureInput(signature);
    if (sigValidation) {
      setHelperError(sigValidation);
      return;
    }
    if (!ethers.utils.isAddress(helperAddress)) {
      setHelperError("Укажите корректный адрес helper-контракта");
      return;
    }
    if (!ethers.utils.isAddress(userAddress)) {
      setHelperError("Укажите корректный адрес пользователя");
      return;
    }

    try {
      setIsCallingHelper(true);
      const contract = new ethers.Contract(helperAddress, HELPER_ABI, provider);
      const result: string = await contract.isValidSignatureWithUser(
        hashInput,
        signature,
        userAddress
      );
      setHelperResult(result);
    } catch (error: any) {
      setHelperError(error?.message ?? "Вызов завершился ошибкой");
    } finally {
      setIsCallingHelper(false);
    }
  };

  const handleCallTarget = async () => {
    setTargetError(null);
    setTargetResult(null);

    if (!provider) {
      setTargetError("Провайдер не инициализирован");
      return;
    }
    if (!hashInput) {
      setTargetError("Укажите хеш");
      return;
    }
    const hashValidation = validateHashInput(hashInput);
    if (hashValidation) {
      setTargetError(hashValidation);
      return;
    }
    if (!signature) {
      setTargetError("Укажите подпись");
      return;
    }
    const sigValidation = validateSignatureInput(signature);
    if (sigValidation) {
      setTargetError(sigValidation);
      return;
    }
    if (!ethers.utils.isAddress(targetAddress)) {
      setTargetError("Укажите корректный адрес контракта");
      return;
    }

    try {
      setIsCallingTarget(true);
      const contract = new ethers.Contract(targetAddress, ERC1271_ABI, provider);
      const result: string = await contract.isValidSignature(hashInput, signature);
      setTargetResult(result);
    } catch (error: any) {
      setTargetError(error?.message ?? "Вызов завершился ошибкой");
    } finally {
      setIsCallingTarget(false);
    }
  };

  const renderResult = (result: string | null, error: string | null) => {
    if (error) {
      return (
        <div style={{ color: "#b91c1c", fontSize: 13, marginTop: 8 }}>
          {error}
        </div>
      );
    }
    if (result) {
      const matchesMagic = result.toLowerCase() === ERC1271_MAGIC_VALUE;
      return (
        <div
          style={{
            marginTop: 8,
            fontSize: 13,
            color: matchesMagic ? "#047857" : "#92400e",
            fontWeight: 600,
          }}
        >
          Ответ: {result} {matchesMagic ? "(валидная подпись)" : "(значение отличается от magic)"}
        </div>
      );
    }
    return null;
  };

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
          value={message}
          onChange={(e) => setMessage(e.target.value)}
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
            onClick={computeHashes}
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
            onClick={handleSign}
            disabled={!canSign || isSigning}
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
            {isSigning ? "Подписание..." : "Подписать через кошелек"}
          </button>
        </div>

        {hashError && (
          <div style={{ color: "#b91c1c", fontSize: 13, marginTop: 8 }}>{hashError}</div>
        )}
        {signError && (
          <div style={{ color: "#b91c1c", fontSize: 13, marginTop: 8 }}>{signError}</div>
        )}

        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          <div>
            <label style={labelStyle}>hashMessage (EIP-191)</label>
            <input
              value={hashInput}
              onChange={(e) => setHashInput(e.target.value)}
              placeholder="0x..."
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>keccak256(utf8(message))</label>
            <input
              value={rawKeccakHash}
              readOnly
              placeholder="0x..."
              style={{ ...inputStyle, background: "#f3f4f6", color: "#374151" }}
            />
          </div>
          <div>
            <label style={labelStyle}>Подпись</label>
            <textarea
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
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
          Контракт <code>{DEFAULT_HELPER_ADDRESS}</code> проксирует вызов, позволяя передать адрес
          пользователя вручную.
        </p>
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <label style={labelStyle}>Helper контракт</label>
            <input
              value={helperAddress}
              onChange={(e) => setHelperAddress(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Адрес пользователя (user)</label>
            <input
              value={userAddress}
              onChange={(e) => setUserAddress(e.target.value)}
              placeholder="0x..."
              style={inputStyle}
            />
          </div>
        </div>
        <button
          onClick={handleCallHelper}
          disabled={isCallingHelper}
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
          {isCallingHelper ? "Запрос..." : "Вызвать isValidSignatureWithUser"}
        </button>
        {renderResult(helperResult, helperError)}
      </div>

      <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>3. Прямой вызов isValidSignature</h2>
        <p style={{ marginBottom: 12, fontSize: 13, color: "#4b5563" }}>
          Используйте для проверки других контрактов. Если вызов завершается revert-ом, значит
          подпись не поддерживается текущей реализацией.
        </p>
        <label style={labelStyle}>Адрес контракта</label>
        <input
          value={targetAddress}
          onChange={(e) => setTargetAddress(e.target.value)}
          style={inputStyle}
        />
        <button
          onClick={handleCallTarget}
          disabled={isCallingTarget}
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
          {isCallingTarget ? "Запрос..." : "Вызвать isValidSignature"}
        </button>
        {renderResult(targetResult, targetError)}
      </div>

      <div style={{ marginTop: 24, fontSize: 12, color: "#6b7280" }}>
        Ожидаемое magic значение: <code>{ERC1271_MAGIC_VALUE}</code>.
      </div>
    </div>
  );
};
