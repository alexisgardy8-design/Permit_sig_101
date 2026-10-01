import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  const message = `I want Permit101 points at address: ${signer.address.toLowerCase()}`;
  console.log(`Signing: "${message}"`);
  const signature = await signer.signMessage(message);
  console.log(`\nSignature (bytes, pass to ex1_personalSign):`);
  console.log(signature);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});