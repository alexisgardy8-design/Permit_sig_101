import { ethers } from "hardhat";

async function main() {
  const evaluatorAddress = process.env.EVALUATOR_ADDRESS!;
  const tokenAddress = process.env.TOKEN!;
  const [signer] = await ethers.getSigners();
  const me = signer.address;
  const chainId = (await ethers.provider.getNetwork()).chainId;

  const token = await ethers.getContractAt(
    [
      "function name() view returns (string)",
      "function nonces(address) view returns (uint256)",
      "function DOMAIN_SEPARATOR() view returns (bytes32)",
    ],
    tokenAddress,
    signer
  );
  const evaluator = await ethers.getContractAt(
    [
      "function ex8_deployedPermitToken()",
      "function ex9_permitOnStudentToken(uint256,uint256,uint8,bytes32,bytes32)",
      "function ex10_rejectExpiredOnStudentToken(uint256,uint8,bytes32,bytes32)",
    ],
    evaluatorAddress,
    signer
  );

  const domain = {
    name: await token.name(),
    version: "1",
    chainId,
    verifyingContract: tokenAddress,
  };
  // Contrôle : doit être identique au DOMAIN_SEPARATOR on-chain
  console.log("domain OK :", ethers.TypedDataEncoder.hashDomain(domain) === (await token.DOMAIN_SEPARATOR()));

  // ex8
  const tx8 = await evaluator.ex8_deployedPermitToken();
  await tx8.wait();
  console.log("ex8 OK", tx8.hash);

  // ex9
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
  const nonce: bigint = await token.nonces(me);
  const deadline = Math.floor(Date.now() / 1000) + 30 * 60;
  const sig = await signer.signTypedData(domain, types, {
    owner: me,
    spender: evaluatorAddress,
    value,
    nonce,
    deadline,
  });
  const { v, r, s } = ethers.Signature.from(sig);

  const tx9 = await evaluator.ex9_permitOnStudentToken(value, deadline, v, r, s);
  await tx9.wait();
  console.log("ex9 OK", tx9.hash);

  // ex10 : n'importe quel (v, r, s), l'Evaluator force deadline = 0
  const tx10 = await evaluator.ex10_rejectExpiredOnStudentToken(value, v, r, s);
  await tx10.wait();
  console.log("ex10 OK", tx10.hash);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });