import { ethers } from "hardhat";

async function main() {
  const evaluatorAddress = process.env.EVALUATOR_ADDRESS!;
  const [signer] = await ethers.getSigners();
  const me = signer.address;

  const evaluator = await ethers.getContractAt(
    [
      "function getContentFor(address) view returns (string)",
      "function evaluatorNonce(address) view returns (uint256)",
      "function ex4_rejectMalleable(string,uint256,uint256,uint8,bytes32,bytes32)",
      "function ex5_rejectExpired(string,uint256,uint8,bytes32,bytes32)",
    ],
    evaluatorAddress,
    signer
  );

  const chainId = (await ethers.provider.getNetwork()).chainId;
  const content: string = await evaluator.getContentFor(me);
  const nonce: bigint = await evaluator.evaluatorNonce(me); // relu après ex3
  const deadline = Math.floor(Date.now() / 1000) + 30 * 60;

  const domain = { name: "Permit101Evaluator", version: "1", chainId, verifyingContract: evaluatorAddress };
  const types = {
    Greeting: [
      { name: "who", type: "address" },
      { name: "content", type: "string" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };
  const sig = await signer.signTypedData(domain, types, { who: me, content, nonce, deadline });
  const { v, r, s } = ethers.Signature.from(sig);

  // Vérif low-s (ethers le garantit)
  const HALF_N = 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0n;
  console.log("s canonique :", BigInt(s) <= HALF_N);

  // ex4
  const tx4 = await evaluator.ex4_rejectMalleable(content, nonce, deadline, v, r, s);
  await tx4.wait();
  console.log("ex4 OK", tx4.hash);

  // ex5 : n'importe quel (v, r, s), le deadline est forcé à 0 par l'Evaluator
  const tx5 = await evaluator.ex5_rejectExpired(content, nonce, v, r, s);
  await tx5.wait();
  console.log("ex5 OK", tx5.hash);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });