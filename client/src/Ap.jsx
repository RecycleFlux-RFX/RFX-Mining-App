import { useState } from "react";
import { BrowserProvider } from "ethers";

function App() {
  const [address, setAddress] = useState("");

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask not detected!");
      return;
    }

    const provider = new BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    const addr = await signer.getAddress();
    setAddress(addr);

    // Send address to backend
    const res = await fetch("http://localhost:3000/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: addr })
    });

    const data = await res.json();

  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Connect Wallet</h1>
      <button onClick={connectWallet}>Connect to MetaMask</button>
      <p>{address && `Connected Address: ${address}`}</p>
    </div>
  );
}

export default App;
