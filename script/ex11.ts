// script/ex11.ts
import { ethers } from "hardhat";

async function main() {
  const evaluatorAddress = process.env.EVALUATOR_ADDRESS!;
  const tokenAddress = process.env.TOKEN!;
  const [signer] = await ethers.getSigners();
  const me = signer.address;
  const chainId = (await ethers.provider.getNetwork()).chainId;

  const token = await ethers.getContractAt(
    ["function name() view returns (string)", "function nonces(address) view returns (uint256)"],
    tokenAddress,
    signer
  );
  const evaluator = await ethers.getContractAt(
    ["function ex11_rejectReplayOnStudentToken(uint256,uint256,uint8,bytes32,bytes32)"],
    evaluatorAddress,
    signer
  );

  const domain = { name: await token.name(), version: "1", chainId, verifyingContract: tokenAddress };
  const types = {
    Permit: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };
  const value = ethers.parseUnits("10", 18);
  const nonce: bigint = await token.nonces(me); // relu : ex9 l'a incrémenté
  const deadline = Math.floor(Date.now() / 1000) + 30 * 60;

  const sig = await signer.signTypedData(domain, types, {
    owner: me, spender: evaluatorAddress, value, nonce, deadline,
  });
  const { v, r, s } = ethers.Signature.from(sig);

  const tx = await evaluator.ex11_rejectReplayOnStudentToken(value, deadline, v, r, s);
  await tx.wait();
  console.log("ex11 OK", tx.hash);
}
main().catch((e) => { console.error(e); process.exitCode = 1; });