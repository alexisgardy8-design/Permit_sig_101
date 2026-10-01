import { ethers } from "hardhat";

const MOCK = "0x1C9d04b35642801C8Ff4591B6E8ba49fCDF1Bb77";

async function main() {
  const evaluatorAddress = process.env.EVALUATOR_ADDRESS!;
  const [signer] = await ethers.getSigners();
  const me = signer.address;
  const chainId = (await ethers.provider.getNetwork()).chainId;

  const mock = await ethers.getContractAt(
    [
      "function name() view returns (string)",
      "function decimals() view returns (uint8)",
      "function nonces(address) view returns (uint256)",
      "function balanceOf(address) view returns (uint256)",
      "function getTokens(uint256)",
    ],
    MOCK,
    signer
  );
  const evaluator = await ethers.getContractAt(
    [
      "function ex6_permitMock(uint256,uint256,uint8,bytes32,bytes32)",
      "function ex7_permitAndPull(uint256,uint256,uint8,bytes32,bytes32)",
    ],
    evaluatorAddress,
    signer
  );

  const decimals = await mock.decimals();
  const value = ethers.parseUnits("10", decimals);

  // 1. Faucet : assez pour ex6/ex7 (et plus tard Permit2)
  const txFaucet = await mock.getTokens(ethers.parseUnits("100", decimals));
  await txFaucet.wait();
  console.log("balance MOCK :", await mock.balanceOf(me));

  const domain = {
    name: await mock.name(),   // "Mock Underlying"
    version: "1",
    chainId,
    verifyingContract: MOCK,
  };
  const types = {
    Permit: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };

  async function signPermit() {
    const nonce: bigint = await mock.nonces(me); // relu à chaque signature
    const deadline = Math.floor(Date.now() / 1000) + 30 * 60;
    const sig = await signer.signTypedData(domain, types, {
      owner: me,
      spender: evaluatorAddress,
      value,
      nonce,
      deadline,
    });
    const { v, r, s } = ethers.Signature.from(sig);
    return { deadline, v, r, s };
  }

  // 2. ex6
  let p = await signPermit();
  const tx6 = await evaluator.ex6_permitMock(value, p.deadline, p.v, p.r, p.s);
  await tx6.wait();
  console.log("ex6 OK", tx6.hash);

  // 3. ex7 : nonce incrémenté par ex6, donc nouvelle signature
  p = await signPermit();
  const tx7 = await evaluator.ex7_permitAndPull(value, p.deadline, p.v, p.r, p.s);
  await tx7.wait();
  console.log("ex7 OK", tx7.hash);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });