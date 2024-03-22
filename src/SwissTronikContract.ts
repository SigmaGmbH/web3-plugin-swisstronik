import { SwisstronikPlugin } from "./";
import {
  AbiInput,
  BlockNumberOrTag,
  Contract,
  ContractAbi,
  PayableCallOptions,
} from "web3";

export class SwissTronikContract extends Contract<any> {
  private readonly contractInstance;
  private readonly address;
  private readonly jsonInterface;
  private readonly plugin = new SwisstronikPlugin();

  constructor(jsonInterface: ContractAbi, address: string) {
    super(jsonInterface, address);

    this.jsonInterface = jsonInterface;
    this.address = address;

    this.plugin.setProvider(SwisstronikPlugin.web3.currentProvider);
    this.contractInstance = new Contract(jsonInterface, address);
  }

  public get methods(): any {
    return new Proxy(
      {},
      {
        get: (_, methodName: string) => {
          return (...args: any[]) => {
            const data = this.contractInstance.methods[methodName](
              ...args
            ).encodeABI();

            return {
              call: async (
                tx?: PayableCallOptions,
                block?: BlockNumberOrTag
              ) => {
                const responseMessage = await this.plugin.call(
                  {
                    to: this.address,
                    data,
                    ...tx,
                  },
                  block
                );

                const input = (
                  this.jsonInterface.find(
                    (x: any) => x.name === methodName
                  ) as any
                )?.outputs as AbiInput[];

                const decodedCall =
                  SwisstronikPlugin.web3.eth.abi.decodeParameters(
                    input,
                    responseMessage
                  );

                return decodedCall[0] as any;
              },
            };
          };
        },
      }
    );
  }
}
