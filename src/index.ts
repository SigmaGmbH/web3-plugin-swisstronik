import { ETH_DATA_FORMAT, Web3, Web3Context, Web3EthPluginBase } from "web3";
import { decryptNodeResponseWithPublicKey, encryptDataFieldWithPublicKey } from "@swisstronik/utils";
import {
  Address,
  BlockNumberOrTag,
  Bytes,
  DataFormat,
  DEFAULT_RETURN_FORMAT,
  Numbers,
  Transaction,
  TransactionCall,
  TransactionWithFromAndToLocalWalletIndex,
  TransactionWithFromLocalWalletIndex,
  TransactionWithToLocalWalletIndex
} from "web3-types";
import {
  call as vanillaCall,
  estimateGas as vanillaEstimateGas,
  sendTransaction as vanillaSendTransaction
} from "web3-eth";
import { format } from "web3-utils";
import { SendTransactionOptions } from "web3-eth/src/types";
import { SwissTronikContract } from "./SwissTronikContract";

export class SwisstronikPlugin extends Web3EthPluginBase {
  public pluginNamespace = "swisstronik";
  static web3: Web3;

  public async getStorageAt<ReturnFormat extends DataFormat = typeof DEFAULT_RETURN_FORMAT>(
    address: Address,
    storageSlot: Numbers,
    blockNumber: BlockNumberOrTag = this.defaultBlock,
    returnFormat: ReturnFormat = DEFAULT_RETURN_FORMAT as ReturnFormat
  ) {
    throw new Error("getStorageAt is not available in Swisstronik due to all data in the EVM being encrypted");
  }

  public async sendTransaction<ReturnFormat extends DataFormat = typeof DEFAULT_RETURN_FORMAT>(
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
      let [encryptedData] = encryptDataFieldWithPublicKey(nodePublicKey, transaction.data);
      transaction.data = encryptedData;
    }
    return vanillaSendTransaction(this, transaction, returnFormat, options);
  }

  public async call<ReturnFormat extends DataFormat = typeof DEFAULT_RETURN_FORMAT>(
    transaction: TransactionCall,
    blockNumber: BlockNumberOrTag = this.defaultBlock,
    returnFormat: ReturnFormat = DEFAULT_RETURN_FORMAT as ReturnFormat
  ) {
    if (transaction.data && transaction.to) {
      let nodePublicKey = await this.getNodePublicKey();
      let [encryptedData, encryptionKey] = encryptDataFieldWithPublicKey(nodePublicKey, transaction.data);
      transaction.data = encryptedData;
      let result = await vanillaCall(this, transaction, blockNumber, returnFormat);
      let decrypted = decryptNodeResponseWithPublicKey(nodePublicKey, result, encryptionKey);
      return format({ format: "bytes" }, decrypted as Bytes, returnFormat);
    } else {
      return vanillaCall(this, transaction, blockNumber, returnFormat);
    }
  }

  public async estimateGas<ReturnFormat extends DataFormat = typeof DEFAULT_RETURN_FORMAT>(
    transaction: Transaction,
    blockNumber: BlockNumberOrTag = this.defaultBlock,
    returnFormat: ReturnFormat = DEFAULT_RETURN_FORMAT as ReturnFormat
  ) {
    if (transaction.data && transaction.to) {
      let nodePublicKey = await this.getNodePublicKey();
      let [encryptedData] = encryptDataFieldWithPublicKey(nodePublicKey, transaction.data);
      transaction.data = encryptedData;
    }
    return vanillaEstimateGas(this, transaction, blockNumber, returnFormat);
  }

  public link(parentContext: Web3Context) {
    super.link(parentContext);
    SwisstronikPlugin.web3 = new Web3(parentContext.provider);
  }

  public async getNodePublicKey(): Promise<string> {
    let blockNum = await SwisstronikPlugin.web3.eth.getBlockNumber(ETH_DATA_FORMAT);
    return await this.requestManager.send({
      method: "eth_getNodePublicKey",
      params: [blockNum]
    });
  }

  Contract = SwissTronikContract;
}

// Module Augmentation
declare module "web3" {
  interface Web3Context {
    swisstronik: SwisstronikPlugin;
  }
}
