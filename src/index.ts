import { Web3, Web3Context, Web3PluginBase } from "web3";
import { SWTRMiddleware } from "./SWTRMiddleware";
import { getNodePublicKey } from "@swisstronik/utils";

export class SwisstronikPlugin extends Web3PluginBase {
  public pluginNamespace = "swisstronik";
  public middleware: SWTRMiddleware;
  static web3: Web3;
  static rpcEndpoint?: string;

  constructor(rpcEndpoint?: string) {
    super();
    if (rpcEndpoint) SwisstronikPlugin.rpcEndpoint = rpcEndpoint;

    this.middleware = new SWTRMiddleware(this.getNodePublicKey);
  }

  public link(parentContext: Web3Context): void {
    parentContext.requestManager.setMiddleware(this.middleware);
    (parentContext as any).eth.setTransactionMiddleware(this.middleware);
    
    const clientUrl = (parentContext?.currentProvider as any)?.clientUrl;
    if (
      !SwisstronikPlugin.rpcEndpoint &&
      clientUrl &&
      typeof clientUrl === "string"
    ) {
      SwisstronikPlugin.rpcEndpoint = clientUrl;
    }

    SwisstronikPlugin.web3 = new Web3(parentContext.provider);
    this.middleware.web3 = SwisstronikPlugin.web3;

    super.link(parentContext);
  }

  public async getNodePublicKey(): Promise<string> {
    if (!SwisstronikPlugin.rpcEndpoint)
      throw new Error("RPC endpoint is not set");

    let { publicKey } = await getNodePublicKey(SwisstronikPlugin.rpcEndpoint);
    return publicKey!;
  }
}

// Module Augmentation
declare module "web3" {
  interface Web3Context {
    swisstronik: SwisstronikPlugin;
  }
}
