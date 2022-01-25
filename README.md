# Subscription Solidity Contract

Project made to create simple subscriptions solution in web3.
Made with Solidity, Hardhat and Typescript

## 1. Functions

- createPlan: create a new plan using the sender address
- subscribe: subscribe sender address to a plan
- cancel: cancel plan for sender address
- pay: receive the eth for plans

## 2. How to compile and test:

```bash
  npm install
  npm run compile
  npm run test
```

<br />

---

## 3. How to deploy to Rinkey network

- Copy .env.example to .env
- Edit .env file adding:
  - alchemy api key to RINKEBY_URL
  - PRIVATE_KEY

After compile and test execute the following command:

```bash
  npm run deploy-rinkeby
```

<br />

---

## 4. Deployed Contract Address to Rinkeby

Address:

Verified in Etherscan: https://rinkeby.etherscan.io/address/#code

<br />

---

<br />

---

## 5. Verify the contract in Etherscan

To verify deployed contract update .env file with etherscan api key in variable ETHERSCAN_KEY, then run the following command:

```bash
  npx hardhat verify CONTRACT_ADDRESS --network rinkeby
```
