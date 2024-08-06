import {
  Web3,
  Web3BaseWalletAccount,
  DEFAULT_RETURN_FORMAT,
} from "web3";
import { Wallet } from "web3-eth-accounts";
import { SwisstronikPlugin } from "../src";
import { abi } from "./ERC20ABI";

describe("SwisstronikPlugin Tests", () => {
  let consoleSpy: jest.SpiedFunction<typeof global.console.log>;

  let web3: Web3;
  let wallet: Wallet<Web3BaseWalletAccount>;

  const NODE_HTTP_URL = "https://json-rpc.testnet.swisstronik.com";

  beforeAll(() => {
    web3 = new Web3(NODE_HTTP_URL);
    web3.registerPlugin(new SwisstronikPlugin());

    consoleSpy = jest.spyOn(global.console, "log").mockImplementation();
    wallet = web3.eth.accounts.wallet.add(
      "0x9a3247611b86ed89cc6c1cde251fcc29fd5624e93087968eb6d7be36c420a70a"
    ); //NEVER SHARE YOUR PRIVATE KEYS
  });

  afterAll(() => {
    consoleSpy.mockRestore();
  });

  it("should register Plugin on Web3Context instance", async () => {
    expect(web3.swisstronik).toBeDefined();
  });

  it("should call SwisstronikPlugin to request node public key", async () => {
    const resp = await web3.swisstronik.getNodePublicKey();
    expect(resp).toBeDefined();
  });

  describe("SwisstronikPlugin eth calls", () => {
    it("getStorageAt should error", async () => {
      await expect(async () => {
        await web3.eth.getStorageAt("0x0", 1);
      }).rejects.toThrow();
    });

    it("Call contract on testnet with encrypted data", async () => {
      let tx = {
        to: "0xF8bEB8c8Be514772097103e39C2ccE057117CC92",
        from: wallet[0].address,
        data: "0x61bc221a",
      };
      let res = await web3.eth.call(tx, "latest");
      expect(res).toEqual(
        "0x000000000000000000000000000000000000000000000000000000000000050b"
      );
    });

    it("Estimate gas for tx on testnet with encrypted data", async () => {
      let tx = {
        to: "0xF8bEB8c8Be514772097103e39C2ccE057117CC92",
        from: wallet[0].address,
        data: "0x61bc221a",
      };
      let res = await web3.eth.estimateGas(tx, "latest");
      expect(res).toEqual(23325n);
    });

    it("Send transaction on testnet with encrypted data", async () => {
      let tx = {
        to: "0xF8bEB8c8Be514772097103e39C2ccE057117CC92",
        from: wallet[0].address,
        data: "0x61bc221a",
      };

      let res = await web3.eth.sendTransaction(tx);
      expect(res.status).toEqual(1n);
    }, 20000);
  });

  describe("SwisstronikPlugin contract calls", () => {
    const ERC20_CONTRACT_ADDRESS = "0x22B01aa7E98dF5dF7C034689A300c6E06cc89Cb3";

    it("Should fetch ERC20 balanceOf", async () => {
      const contract = new web3.eth.Contract(abi, ERC20_CONTRACT_ADDRESS);

      const balanceOf = await contract.methods
        .balanceOf(wallet[0].address)
        .call();

      expect(Number(balanceOf)).toBeGreaterThanOrEqual(0);
    });

    it("Should estimate gas for ERC20 transfer ", async () => {
      const contract = new web3.eth.Contract(abi, ERC20_CONTRACT_ADDRESS);

      const gas = await contract.methods
        .transfer(wallet[0].address, 5n)
        .estimateGas({ from: wallet[0].address });

      expect(Number(gas)).toBeGreaterThanOrEqual(0);
    });

    it(
      "Should mint ERC20",
      async () => {
        const contract = new web3.eth.Contract(abi, ERC20_CONTRACT_ADDRESS);
        const res = await contract.methods.mint100tokens().send({from: wallet[0].address});

        expect(res.status).toEqual(1n);
      },
      5 * 60 * 1000
    );

    it(
      "Should transfer ERC20",
      async () => {
        const contract = new web3.eth.Contract(abi, ERC20_CONTRACT_ADDRESS);
        const res = await contract.methods.transfer(wallet[0].address, 5n).send({from: wallet[0].address});

        expect(res.status).toEqual(1n);
      },
      5 * 60 * 1000
    );
  });
});
