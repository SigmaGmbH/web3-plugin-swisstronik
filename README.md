# Swisstronik Web3 Plugin

[![npm version](https://img.shields.io/badge/npm-0.2.7-brightgreen)](https://www.npmjs.com/package/web3-plugin-swisstronik)

Swisstronik Web3.js Plugin allows the users to use Web3.js library with [Swisstronik](https://swisstronik.com)

### Supported methods:

- `eth_estimateGas`
- `eth_call`
- `eth_sendTransaction`
- Custom - `eth_getNodePublicKey`

## Installation

> Note: Make sure you are using `web3` version 4.10.0 or higher in your project.

```bash
npm install @swisstronik/web3-plugin-swisstronik web3@latest --save
```

## Usage

### Basic Usage

```js
import { Web3 } from "web3";
import { SwisstronikPlugin } from "@swisstronik/web3-plugin-swisstronik";

const web3 = new Web3("https://json-rpc.testnet.swisstronik.com/"); // Any RPC node you wanted to connect with
web3.registerPlugin(new SwisstronikPlugin());

// Get node public key
web3.swisstronik.getNodePublicKey().then((resp) => {
  console.log(resp);
});
```

### Sending transactions & performing calls

```js
import { Web3 } from "web3";
import { SwisstronikPlugin } from "web3-plugin-swisstronik";

const web3 = new Web3("https://json-rpc.testnet.swisstronik.com/"); // Any RPC node you wanted to connect with
web3.registerPlugin(new SwisstronikPlugin());
let wallet = web3.eth.accounts.wallet.add("0x..."); // Private Key
// Get node public key
let tx = {
  to: '0xF8bEB8c8Be514772097103e39C2ccE057117CC92',
  from: wallet[0].address,
  data: '0x61bc221a'
}
let callResult = await web3.eth.call(tx);
console.log(callResult);

let estimateGasResult = await web3.eth.estimateGas(tx);
console.log(estimateGasResult);

let sentTxReceipt = await web3.eth.sendTransaction(tx);
console.log(sentTxReceipt);

```

### Interacting with a Smart Contract

```js
import { Web3, DEFAULT_RETURN_FORMAT } from "web3";
import { SwisstronikPlugin } from "web3-plugin-swisstronik";

const web3 = new Web3("https://json-rpc.testnet.swisstronik.com/"); // Any RPC node you wanted to connect with
web3.registerPlugin(new SwisstronikPlugin());
let wallet = web3.eth.accounts.wallet.add("0x..."); // Private Key

const contract = new web3.eth.Contract(abi, ERC20_CONTRACT_ADDRESS);

const balanceOf = await contract.methods
  .balanceOf(wallet[0].address)
  .call();
console.log(balanceOf);

const gas = await contract.methods
  .transfer(wallet[0].address, 5n)
  .estimateGas({ from: wallet[0].address });
console.log(gas);

const sentTxReceipt = await contract.methods.transfer(wallet[0].address, 5n).send({from: wallet[0].address});
console.log(sentTxReceipt);


```

### Connecting Accounts to Web3

```js
import { Web3 } from "web3";
import { SwisstronikPlugin } from "@swisstronik/web3-plugin-swisstronik";

// With any RPC node and private key
const web3 = new Web3("https://json-rpc.testnet.swisstronik.com/");
const wallet = web3.eth.accounts.wallet.add("0x..."); // Private Key
const { address: account } = wallet[0];

// or with browser wallets
const web3 = new Web3(window.ethereum);
const [account] = await window.ethereum.request({
  method: "eth_requestAccounts"
});

web3.registerPlugin(new SwisstronikPlugin("https://json-rpc.testnet.swisstronik.com/"));
```

Refer to [Swisstronik Developer Docs](https://swisstronik.gitbook.io/swisstronik-docs/) for more information & usage scenarios.

### Publishing

To publish a new version of the package to npm, run the following command:

```bash
npm run build

npm publish
```

## Resources

- [Swisstronik Docs](https://swisstronik.gitbook.io/swisstronik-docs/)
- [Web3js Plugins Documentation](https://docs.web3js.org/guides/web3_plugin_guide/)
- [Swisstronik Website](https://swisstronik.com)

## Safety

This is experimental software and subject to change over time.

This package is not audited and has not been tested for security. Use at your own risk.
I do not give any warranties and will not be liable for any loss incurred through any use of this codebase.


Contributing
------------

Pull requests are welcome. For major changes, please open an issue first
to discuss what you would like to change.

Please make sure to update tests as appropriate.

License
-------

[MIT](https://choosealicense.com/licenses/mit/)
