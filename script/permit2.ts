// script/permit2.ts
import { ethers } from "hardhat";

const MOCK = "0x1C9d04b35642801C8Ff4591B6E8ba49fCDF1Bb77";
const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

async function main() {
  const evaluatorAddress = process.env.EVALUATOR_ADDRESS!;
  const [signer] = await ethers.getSigners();
  const me = signer.address;
  const chainId = (await ethers.provider.getNetwork()).chainId;

  const mock = await ethers.getContractAt(
    [
      "function approve(address,uint256) returns (bool)",
      "function balanceOf(address) view returns (uint256)",
      "function decimals() view returns (uint8)",
    ],
    MOCK,
    signer
  );
  const permit2 = await ethers.getContractAt(
    ["function allowance(address,address,address) view returns (uint160,uint48,uint48)"],
    PERMIT2,
    signer
  );
  const evaluator = await ethers.getContractAt(
    [
      "function ex12_approvePermit2()",
      "function ex13_permit2SignatureTransfer(uint256,uint256,uint256,bytes)",
      "function ex14_permit2AllowanceTransfer(uint160,uint48,uint48,uint256,bytes)",
    ],
    evaluatorAddress,
    signer
  );

  const decimals = await mock.decimals();
  const amount = ethers.parseUnits("10", decimals);
  console.log("balance MOCK :", await mock.balanceOf(me));

  // ex12 : approve max vers Permit2 (une seule fois)
  const txA = await mock.approve(PERMIT2, ethers.MaxUint256);
  await txA.wait();
  const tx12 = await evaluator.ex12_approvePermit2();
  await tx12.wait();
  console.log("ex12 OK", tx12.hash);

  // Domaine Permit2 : pas de champ "version"
  const domain = { name: "Permit2", chainId, verifyingContract: PERMIT2 };

  // ex13 : SignatureTransfer
  {
    const types = {
      PermitTransferFrom: [
        { name: "permitted", type: "TokenPermissions" },
        { name: "spender", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
      TokenPermissions: [
        { name: "token", type: "address" },
        { name: "amount", type: "uint256" },
      ],
    };
    const nonce = BigInt(Date.now()); // bitmap : n'importe quelle valeur non consommée
    const deadline = Math.floor(Date.now() / 1000) + 30 * 60;
    const value = {
      permitted: { token: MOCK, amount },
      spender: evaluatorAddress,
      nonce,
      deadline,
    };
    const signature = await signer.signTypedData(domain, types, value);
    const tx13 = await evaluator.ex13_permit2SignatureTransfer(amount, nonce, deadline, signature);
    await tx13.wait();
    console.log("ex13 OK", tx13.hash);
  }

  // ex14 : AllowanceTransfer (PermitSingle)
  {
    const types = {
      PermitSingle: [
        { name: "details", type: "PermitDetails" },
        { name: "spender", type: "address" },
        { name: "sigDeadline", type: "uint256" },
      ],
      PermitDetails: [
        { name: "token", type: "address" },
        { name: "amount", type: "uint160" },
        { name: "expiration", type: "uint48" },
        { name: "nonce", type: "uint48" },
      ],
    };
    const [, , nonce] = await permit2.allowance(me, MOCK, evaluatorAddress); // nonce séquentiel
    const expiration = Math.floor(Date.now() / 1000) + 60 * 60;
    const sigDeadline = Math.floor(Date.now() / 1000) + 30 * 60;
    const value = {
      details: { token: MOCK, amount, expiration, nonce },
      spender: evaluatorAddress,
      sigDeadline,
    };
    const signature = await signer.signTypedData(domain, types, value);
    const tx14 = await evaluator.ex14_permit2AllowanceTransfer(amount, expiration, nonce, sigDeadline, signature);
    await tx14.wait();
    console.log("ex14 OK", tx14.hash);
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });