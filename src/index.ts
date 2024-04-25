import { ETH_DATA_FORMAT, Web3, Web3Context, Web3PluginBase } from "web3";
import {
  decryptNodeResponseWithPublicKey,
  encryptDataFieldWithPublicKey,
} from "@swisstronik/utils";
import {
  Bytes,
  DataFormat,
  DEFAULT_RETURN_FORMAT,
  Transaction,
  TransactionWithFromAndToLocalWalletIndex,
  TransactionWithFromLocalWalletIndex,
  TransactionWithToLocalWalletIndex,
  Web3APIMethod,
  Web3APIRequest,
  JsonRpcResponse,
  Web3APIReturnType,
} from "web3-types";
import { sendTransaction as vanillaSendTransaction } from "web3-eth";
import { format } from "web3-utils";
import { SendTransactionOptions } from "web3-eth/src/types";
import { RequestManagerMiddleware } from "web3-core";
import { jsonRpc } from "web3-utils";

class Web3Middleware<API> implements RequestManagerMiddleware<API> {
  private nodePublicKey!: string;
  private method!: string;
  private encryptionKey!: Uint8Array;
  web3!: Web3;

  constructor(private getNodePublicKey: () => Promise<string>) {
    getNodePublicKey;
  }
  // eslint-disable-next-line class-methods-use-this
  public async processRequest<Method extends Web3APIMethod<API>>(
    request: Web3APIRequest<API, Method>
  ): Promise<Web3APIRequest<API, Method>> {
    console.log("--------------------");
    console.log("Request", request);

    this.method = request.method;

    if (
      ["eth_estimateGas", "eth_call", "eth_sendTransaction"].includes(
        request.method
      ) &&
      Array.isArray(request.params)
    ) {
      const param = request.params[0];

      if (param.data && param.to) {
        this.nodePublicKey = await this.getNodePublicKey();

        let [encryptedData, encryptionKey] = encryptDataFieldWithPublicKey(
          this.nodePublicKey,
          param.data
        );
        this.encryptionKey = encryptionKey;

        console.log("before encryption", request.params[0]);
        param.data = encryptedData;
        console.log("encrypted", request.params[0]);
      }
    }
    console.log("--------------------");

    return Promise.resolve(request);
  }

  // eslint-disable-next-line class-methods-use-this
  public async processResponse<
    Method extends Web3APIMethod<API>,
    ResponseType = Web3APIReturnType<API, Method>,
  >(
    response: JsonRpcResponse<ResponseType>
  ): Promise<JsonRpcResponse<ResponseType>> {
    let responseObj = { ...response };
    console.log("--------------------");
    console.log("Response");
    console.log("this.method", this.method);
    console.log("this.nodePublicKey", this.nodePublicKey);
    console.log("responseObj", responseObj);

    const { result } = responseObj as any;

    if (
      !jsonRpc.isBatchResponse(responseObj) &&
      this.method === "eth_call" &&
      result &&
      this.nodePublicKey &&
      this.encryptionKey
    ) {
      const decrypted = decryptNodeResponseWithPublicKey(
        this.nodePublicKey,
        result,
        this.encryptionKey
      );
      console.log("decrypted!");

      responseObj = {
        ...responseObj,
        result: format({ format: "bytes" }, decrypted as Bytes) as any,
      };
    }
    console.log("--------------------");

    return Promise.resolve(responseObj);
  }
}

export class SwisstronikPlugin extends Web3PluginBase {
  public pluginNamespace = "swisstronik";
  public web3Middleware: Web3Middleware<any>;
  static web3: Web3;

  constructor() {
    super();
    this.web3Middleware = new Web3Middleware<any>(this.getNodePublicKey);
  }

  public link(parentContext: Web3Context): void {
    parentContext.requestManager.setMiddleware(this.web3Middleware);

    super.link(parentContext);

    SwisstronikPlugin.web3 = new Web3(parentContext.provider);
    this.web3Middleware.web3 = SwisstronikPlugin.web3;
  }

  public async sendTransaction<
    ReturnFormat extends DataFormat = typeof DEFAULT_RETURN_FORMAT,
  >(
    transaction:
      | Transaction
      | TransactionWithFromLocalWalletIndex
      | TransactionWithToLocalWalletIndex
      | TransactionWithFromAndToLocalWalletIndex,
    returnFormat: ReturnFormat = DEFAULT_RETURN_FORMAT as ReturnFormat,
    options?: SendTransactionOptions
  ) {
    if (transaction.data && transaction.to) {
      let nodePublicKey = await this.getNodePublicKey();
      let [encryptedData] = encryptDataFieldWithPublicKey(
        nodePublicKey,
        transaction.data
      );
      transaction.data = encryptedData;
    }
    return vanillaSendTransaction(this, transaction, returnFormat, options);
  }

  public async getNodePublicKey(): Promise<string> {
    let blockNum =
      await SwisstronikPlugin.web3.eth.getBlockNumber(ETH_DATA_FORMAT);
    return await SwisstronikPlugin.web3.requestManager.send({
      method: "eth_getNodePublicKey",
      params: [blockNum],
    });
  }
}

// Module Augmentation
declare module "web3" {
  interface Web3Context {
    swisstronik: SwisstronikPlugin;
  }
}
