import { Web3, core, ETH_DATA_FORMAT, Web3BaseWallet } from "web3";
import { SwisstronikPlugin } from "../src";

describe("SwisstronikPlugin Tests", () => {
  it("should register TemplatePlugin plugin on Web3Context instance", () => {
    const web3Context = new core.Web3Context("https://json-rpc.testnet.swisstronik.com/");
    web3Context.registerPlugin(new SwisstronikPlugin());
    expect(web3Context.swisstronik).toBeDefined();
  });

  describe("SwisstronikPlugin method tests", () => {
    let consoleSpy: jest.SpiedFunction<typeof global.console.log>;

    let web3: Web3;
    let wallet: any;

    beforeAll(() => {
      web3 = new Web3("https://json-rpc.testnet.swisstronik.com/");
      web3.registerPlugin(new SwisstronikPlugin());
      consoleSpy = jest.spyOn(global.console, "log").mockImplementation();
      wallet = web3.eth.accounts.wallet.add("0x9a3247611b86ed89cc6c1cde251fcc29fd5624e93087968eb6d7be36c420a70a"); //NEVER SHARE YOUR PRIVATE KEYS
    });

    afterAll(() => {
      consoleSpy.mockRestore();
    });

    it("should call SwisstronikPlugin request node public key", async () => {

      let resp = await web3.swisstronik.getNodePublicKey();
      expect(resp).toBeDefined()
    });

    it("getStorageAt should error", async () => {
      await expect(async () => {await web3.swisstronik.getStorageAt("0x0",1)}).rejects.toThrow()
    });

    it("Call contract on testnet with encrypted data", async () => {
      let tx = {
        to: '0xF8bEB8c8Be514772097103e39C2ccE057117CC92',
        from: wallet[0].address,
        data: '0x61bc221a'
      }
      let res = await web3.swisstronik.call(tx,"latest",ETH_DATA_FORMAT);
      expect(res).toEqual("0x000000000000000000000000000000000000000000000000000000000000050b")
    });

    it("Estimate gas for tx on testnet with encrypted data", async () => {
      let tx = {
        to: '0xF8bEB8c8Be514772097103e39C2ccE057117CC92',
        from: wallet[0].address,
        data: '0x61bc221a'
      }
      let res = await web3.swisstronik.estimateGas(tx,"latest",ETH_DATA_FORMAT);
      expect(res).toEqual("0x5b1d")
    });

    it("Send transaction on testnet with encrypted data", async () => {
      let tx = {
        to: '0xF8bEB8c8Be514772097103e39C2ccE057117CC92',
        from: wallet[0].address,
        data: '0x61bc221a'
      }
      let res = await web3.swisstronik.sendTransaction(tx, ETH_DATA_FORMAT);
      expect(res.status).toEqual("0x1")
    }, 20000);
  });
});
