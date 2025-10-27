import React, { useMemo, useState } from "react";

import { BytecodeSizeExperiment } from "./theories/bytecode-size/BytecodeSizeExperiment";
import { DelegationUiExperiment } from "./theories/delegation2/DelegationExperiment";
import { IsValidSignaturePlayground } from "./theories/is-valid-signature/IsValidSignaturePlayground";
import "./App.css";

const experiments = [
  {
    id: "bytecode",
    label: "Bytecode Size",
    element: <BytecodeSizeExperiment />,
  },
  {
    id: "erc1271",
    label: "ERC-1271 Playground",
    element: <IsValidSignaturePlayground />,
  },
  {
    id: "delegation-ui",
    label: "EIP-7702 Delegation",
    element: <DelegationUiExperiment />,
  },
];

export const App: React.FC = () => {
  const [activeExperiment, setActiveExperiment] = useState<string>(experiments[0].id);

  const currentExperiment = useMemo(
    () => experiments.find((experiment) => experiment.id === activeExperiment),
    [activeExperiment]
  );

  return (
    <div className="app-wrapper">
      <nav className="app-nav">
        {experiments.map((experiment) => (
          <button
            key={experiment.id}
            onClick={() => setActiveExperiment(experiment.id)}
            className={
              experiment.id === activeExperiment
                ? "app-nav-button app-nav-button--active"
                : "app-nav-button"
            }
          >
            {experiment.label}
          </button>
        ))}
      </nav>
      <div className="app-content">{currentExperiment?.element}</div>
    </div>
  );
};
