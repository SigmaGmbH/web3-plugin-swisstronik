import { Web3, Web3Context, Web3PluginBase } from "web3";
import { SWTRMiddleware } from "./SWTRMiddleware";

export class SwisstronikPlugin extends Web3PluginBase {
  public pluginNamespace = "swisstronik";
  public middleware: SWTRMiddleware;
  static web3: Web3;

  constructor() {
    super();
    this.middleware = new SWTRMiddleware(this.getNodePublicKey);
  }

  public link(parentContext: Web3Context): void {
    parentContext.requestManager.setMiddleware(this.middleware);
    (parentContext as any).Web3Eth.setTransactionMiddleware(this.middleware);

    super.link(parentContext);

    SwisstronikPlugin.web3 = new Web3(parentContext.provider);
    this.middleware.web3 = SwisstronikPlugin.web3;
  }

  public async getNodePublicKey(): Promise<string> {
    return await SwisstronikPlugin.web3.requestManager.send({
      method: "eth_getNodePublicKey",
      params: ["latest"],
    });
  }
}

// Module Augmentation
declare module "web3" {
  interface Web3Context {
    swisstronik: SwisstronikPlugin;
  }
}
