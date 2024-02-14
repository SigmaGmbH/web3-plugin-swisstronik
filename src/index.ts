import { Web3EthPluginBase, Web3, FMT_BYTES, FMT_NUMBER, ETH_DATA_FORMAT } from "web3";
import {
  decryptECDH,
  deriveEncryptionKey,
  encryptECDH, hexToU8a,
  stringToU8a, u8aToHex,
  USER_KEY_PREFIX
} from "@swisstronik/utils";
import { randomBytes } from "tweetnacl";
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
  sendTransaction as vanillaSendTransaction,
  call as vanillaCall,
  estimateGas as vanillaEstimateGas
} from "web3-eth";
import { format } from "web3-utils";
import { SendTransactionOptions } from "web3-eth/src/types";

export class SwisstronikPlugin extends Web3EthPluginBase {
  public pluginNamespace = "swisstronik";
  public defaultNodeUrl = "https://json-rpc.testnet.swisstronik.com/";

  web3;

  constructor(nodeUrl: string = "") {
    super();
    if (!nodeUrl || nodeUrl === "") {
      nodeUrl = this.defaultNodeUrl;
    }
    this.web3 = new Web3(nodeUrl);
  }

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
      let [encryptedData] = await this.encryptDataField(transaction.data);
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
      let [encryptedData, encryptionKey] = await this.encryptDataField(transaction.data);
      transaction.data = encryptedData;
      let result = await vanillaCall(this, transaction, blockNumber, returnFormat);
      let decrypted = await this.decryptNodeResponse(result, encryptionKey);
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
      let [encryptedData] = await this.encryptDataField(transaction.data);
      transaction.data = encryptedData;
    }
    return vanillaEstimateGas(this, transaction, blockNumber, returnFormat);
  }

  public async getNodePublicKey(): Promise<string> {
    let blockNum = await this.web3.eth.getBlockNumber(ETH_DATA_FORMAT);
    return await this.requestManager.send({
      method: "eth_getNodePublicKey",
      params: [blockNum]
    });
  }

  async encryptDataField(data: string | Uint8Array, userEncryptionKey?: Uint8Array): Promise<[string, Uint8Array]> {
    let nodePublicKey = await this.getNodePublicKey();
    // Generate random user encryption key if is not provided
    userEncryptionKey = userEncryptionKey ?? randomBytes(32);

    // Create encryption key using KDF
    const encryptionPrivateKey = deriveEncryptionKey(
      userEncryptionKey,
      stringToU8a(USER_KEY_PREFIX)
    );
    let dataEncoded = typeof data === "string" ? hexToU8a(data) : data;
    // Encrypt data
    const encryptionResult = encryptECDH(
      encryptionPrivateKey,
      hexToU8a(nodePublicKey),
      dataEncoded
    );
    if (!encryptionResult.result) {
      throw new Error(`Encryption error. Reason: ${encryptionResult.error}`);
    }
    return [u8aToHex(encryptionResult.result), userEncryptionKey];
  }

  async decryptNodeResponse(encryptedResponse: string | Uint8Array, encryptionKey: Uint8Array): Promise<Uint8Array> {
    let nodePublicKey = await this.getNodePublicKey();
    // Create encryption key using KDF
    const encryptionPrivateKey = deriveEncryptionKey(
      encryptionKey,
      stringToU8a(USER_KEY_PREFIX)
    );


    let responseEncoded = typeof encryptedResponse === "string" ? hexToU8a(encryptedResponse) : encryptedResponse;
    const decryptionResult = decryptECDH(
      encryptionPrivateKey,
      hexToU8a(nodePublicKey),
      responseEncoded
    );
    if (!decryptionResult.result) {
      throw new Error(`Decryption error. Reason: ${decryptionResult.error}`);
    }

    return decryptionResult.result;
  }


}

// Module Augmentation
declare module "web3" {
  interface Web3Context {
    swisstronik: SwisstronikPlugin;
  }
}
