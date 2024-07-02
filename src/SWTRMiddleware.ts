import { JsonRpcRequest, Web3, Web3Context, Web3PluginBase } from "web3";
import {
  decryptNodeResponseWithPublicKey,
  encryptDataFieldWithPublicKey,
} from "@swisstronik/utils";
import {
  Bytes,
  Web3APIMethod,
  JsonRpcResponse,
  Web3APIReturnType,
} from "web3-types";
import { format, jsonRpc } from "web3-utils";
import {
  TransactionMiddleware,
  TransactionMiddlewareData,
} from "web3-eth/src/types";
import { RequestManagerMiddleware } from "web3-core";

export class SWTRMiddleware<API = any>
  implements RequestManagerMiddleware<API>, TransactionMiddleware
{
  web3!: Web3;

  private cachedRequestById: {
    [id: string]: {
      method: "eth_estimateGas" | "eth_call";
      nodePublicKey: string;
      encryptionKey: Uint8Array;
    };
  } = {};

  private isDataEncrypted: { [data: string]: boolean } = {};

  constructor(private getNodePublicKey: () => Promise<string>) {}

  public async processTransaction(
    transaction: TransactionMiddlewareData
  ): Promise<TransactionMiddlewareData> {
    if (transaction.data && transaction.to) {
      let nodePublicKey = await this.getNodePublicKey();
      let [encryptedData] = encryptDataFieldWithPublicKey(
        nodePublicKey,
        transaction.data
      );
      transaction.data = encryptedData;
      this.isDataEncrypted[encryptedData] = true;
    }

    return transaction;
  }

  public async processRequest(request: JsonRpcRequest<any>) {
    if (
      ["eth_estimateGas", "eth_call"].includes(request.method) &&
      Array.isArray(request.params)
    ) {
      const param = request.params[0];

      if (param.data && param.to && !this.isDataEncrypted[param.data]) {
        const nodePublicKey = await this.getNodePublicKey();

        const [encryptedData, encryptionKey] = encryptDataFieldWithPublicKey(
          nodePublicKey,
          param.data
        );

        this.cachedRequestById[request.id?.toString()!] = {
          method:
            request.method as (typeof this.cachedRequestById)[string]["method"],
          nodePublicKey,
          encryptionKey,
        };

        param.data = encryptedData;
        this.isDataEncrypted[encryptedData] = true;
      }
    }

    return Promise.resolve(request);
  }

  // eslint-disable-next-line class-methods-use-this
  public async processResponse<
    Method extends Web3APIMethod<API>,
    ResponseType = Web3APIReturnType<API, Method>,
  >(
    response: JsonRpcResponse<ResponseType>,
    options?: { [key: string]: unknown }
  ) {
    let responseObj = { ...response };

    const { result, id } = responseObj as any;

    const cachedRequest = this.cachedRequestById[id?.toString()];

    if (
      !jsonRpc.isBatchResponse(responseObj) &&
      cachedRequest?.method === "eth_call" &&
      result
    ) {
      const decrypted = decryptNodeResponseWithPublicKey(
        cachedRequest.nodePublicKey,
        result,
        cachedRequest.encryptionKey
      );

      delete this.cachedRequestById[id?.toString()]; // release memory

      responseObj = {
        ...responseObj,
        result: format({ format: "bytes" }, decrypted as Bytes) as any,
      };
    }

    return Promise.resolve(responseObj);
  }
}
