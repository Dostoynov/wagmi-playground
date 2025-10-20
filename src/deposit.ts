export async function depositTest() {
  console.log('97-test started')

  const bodyObject = {
    "user_address": "0xBbDD5bBb360abb165EBeD301c3BFD14eF2072E5D",
    "from_token_address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "from_chain_id": 8453,
    "amount_in": "0.1234",
    "refund_address": "0xBbDD5bBb360abb165EBeD301c3BFD14eF2072E5D",
    "vault_id": "zLVQbgScIbXJuSz-NNsK-",
    "bridge_slippage": 500,
    "swap_slippage": 500,
    "route_type": "output",
    "exclude_ambs": [],
    "exclude_liquidity_providers": [],
    "exclude_dexes": [],
    "exclude_bridges": []
  }

  const body = JSON.stringify([bodyObject])

  try {
    const response = await fetch("/superform/deposit/calculate/", {
      "headers": {
        "SF-API-KEY": import.meta.env.VITE_SF_API_KEY!,
        "accept": "application/json",
        "content-type": "application/json"
      },
      "body": body,
      "method": "POST"
    });

    if (!response.ok) {
      throw new Error(`Network error: ${response.statusText}`);
    }
    const data = await response.json();
    console.log(data);


    const bodyStart = JSON.stringify(data)

    const responseStart = await fetch("/superform/deposit/start/", {
      "headers": {
        "SF-API-KEY": import.meta.env.VITE_SF_API_KEY!,
        "accept": "application/json",
        "content-type": "application/json"
      },
      "body": bodyStart as string,
      "method": "POST"
    });

    if (!responseStart.ok) {
      throw new Error(`Network error: ${responseStart.statusText}`);
    }
    const dataStart = await responseStart.json();
    console.log(dataStart);

  } catch (e) {
    console.error(e);
  }

  console.log('97-test finished')
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
// main().catch((error) => {
//   console.error(error)
//   process.exitCode = 1
// })