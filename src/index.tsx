import React from "react";
import ReactDOM from "react-dom/client";
import { WagmiConfig, createClient, configureChains } from "wagmi";
import { InjectedConnector } from "wagmi/connectors/injected";
import { mainnet } from "wagmi/chains";
import { publicProvider } from "wagmi/providers/public";

import { App } from "./App";

const { chains, provider, webSocketProvider } = configureChains(
  [mainnet],
  [publicProvider()]
);

const client = createClient({
  autoConnect: true,
  connectors: [new InjectedConnector({ chains })],
  provider,
  webSocketProvider,
});

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <WagmiConfig client={client}>
    <App />
  </WagmiConfig>
);
