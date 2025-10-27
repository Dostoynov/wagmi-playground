import React, { useState } from "react";

import "./DelegationExperiment.css";
import { Address, createPublicClient, createWalletClient, Hex, http, zeroAddress } from "viem";
import { mainnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { getDeleGatorEnvironment } from "@metamask/delegation-toolkit";
import { createBundlerClient } from "viem/account-abstraction";

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

const bundlerClient = createBundlerClient({
  client: publicClient,
  transport: http(),
});

export const account = privateKeyToAccount("0x5a5b424e91bbb6b349bc4632191709ea284f3c5938bd93feae02452a692f4b69");

export const walletClient = createWalletClient({
  account,
  chain: mainnet,
  transport: http(),
});


const environment = getDeleGatorEnvironment(mainnet.id);

export const DelegationUiExperiment: React.FC = () => {
  const [delegateContract, setDelegateContract] = useState<string>(environment.implementations.EIP7702StatelessDeleGatorImpl);
  const [delegateStatus, setDelegateStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [delegateError, setDelegateError] = useState<string | null>(null);
  const [delegateResponse, setDelegateResponse] = useState<string | null>(null);

  const handleDelegate = async () => {
    setDelegateStatus("pending");
    setDelegateError(null);
    setDelegateResponse(null);

    await handleSignAuthorization(delegateContract as Address);

    setDelegateStatus("success");
    setDelegateResponse("UI-only: delegation simulated.");
  };

  const handleSignAuthorization = async ( contractAddressSpecified: Address ) => {
    const contractAddress = contractAddressSpecified || environment.implementations.EIP7702StatelessDeleGatorImpl;

    const authorization = await walletClient.signAuthorization({
      account, 
      contractAddress,
      executor: "self", 
    });

    const hash = await walletClient.sendTransaction({ 
      authorizationList: [authorization], 
      data: "0x", 
      to: zeroAddress, 
    });
    console.log({
      hash,
      authorization,
    });
  };

  // const handleSignUndelegation = async ( contractAddressSpecified: Address ) => {
  //   const contractAddress = contractAddressSpecified || environment.implementations.EIP7702StatelessDeleGatorImpl;

  //   const authorization = await walletClient.signAuthorization({
  //     account, 
  //     contractAddress,
  //     executor: "self", 
  //   });
  // };

  // const handleSendTransaction = async ( authorization: Hex ) => {
  //   const hash = await walletClient.sendTransaction({ 
  //     authorizationList: [authorization], 
  //     data: "0x", 
  //     to: zeroAddress, 
  //   });
  // };

  return (
    <div className="delegation-wrapper">
      <h1 className="delegation-title">Delegation Toolkit Playground (UI only)</h1>
      <p className="delegation-description">
        Эта версия удаляет бизнес-логику и web3-взаимодействия. Оставлены только UI и состояния.
      </p>

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
          disabled={delegateStatus === "pending"}
        >
          {delegateStatus === "pending" ? "Отправка..." : "Delegate"}
        </button>
        {delegateError && <div className="delegation-error">{delegateError}</div>}
        {delegateResponse && (
          <div className="delegation-response">
            <div className="delegation-response-header">Ответ</div>
            <pre className="delegation-pre">{delegateResponse}</pre>
          </div>
        )}
      </div>
    </div>
  );
};


