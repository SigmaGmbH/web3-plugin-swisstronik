import { Web3, Web3Context, Web3PluginBase } from "web3";
import { SWTRMiddleware } from "./SWTRMiddleware";
import { getNodePublicKey } from "@swisstronik/utils";

export class SwisstronikPlugin extends Web3PluginBase {
  public pluginNamespace = "swisstronik";
  public middleware: SWTRMiddleware;
  static web3: Web3;

  constructor(private rpcEndpoint: string) {
    super();
    this.middleware = new SWTRMiddleware(this.getNodePublicKey, rpcEndpoint);
  }

  public link(parentContext: Web3Context): void {
    parentContext.requestManager.setMiddleware(this.middleware);
    (parentContext as any).Web3Eth?.setTransactionMiddleware(this.middleware);

    console.log((parentContext.provider as any))
    super.link(parentContext);

    SwisstronikPlugin.web3 = new Web3(parentContext.provider);
    this.middleware.web3 = SwisstronikPlugin.web3;
  }

  public async getNodePublicKey(): Promise<string> {
    let {publicKey} = await getNodePublicKey(this.rpcEndpoint);
    return publicKey!;
  }
}

// Module Augmentation
declare module "web3" {
  interface Web3Context {
    swisstronik: SwisstronikPlugin;
  }
}
