# Subscription Solidity Contract

Try running some of the following tasks:

```shell
npx hardhat compile
npx hardhat test
npx hardhat node
```

# Etherscan verification

```shell
hardhat run --network ropsten scripts/sample-script.ts
```

Then, copy the deployment address and paste it in to replace `PAYMENT_CONTRACT_ADDRESS` in this command:

```shell
npx hardhat verify --network ropsten PAYMENT_CONTRACT_ADDRESS
```
