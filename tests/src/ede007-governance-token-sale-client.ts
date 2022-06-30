import {
  Tx,
  Chain,
  Account,
  types,
  ReadOnlyFn,
} from "https://deno.land/x/clarinet@v0.28.1/index.ts";

export enum EDE007GovernanceTokenSaleErrCode {
  err_unauthorised=3000,
  err_sale_already_started=3001,
  err_sale_ended=3002,
  err_sale_not_ended=3003,
  err_nothing_to_refund=3004,
  err_sale_succeeded=3005,
  err_maximum_amount_exceeded=3006,
  err_nothing_to_claim=3007,
  err_sale_failed=3008
}

export class EDE007GovernanceTokenSaleClient {
  contractName = "";
  chain: Chain;
  deployer: Account;

  constructor(chain: Chain, deployer: Account, contractName: string) {
    this.contractName = contractName;
    this.chain = chain;
    this.deployer = deployer;
  }

  start(txSender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "start",
      [], txSender);
  }

  buy(amount: number, txSender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "buy",
      [types.uint(amount)], txSender);
  }

  claim(txSender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "claim",
      [], txSender);
  }

  refund(txSender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "refund",
      [], txSender);
  }

  getStartHeight(): ReadOnlyFn {
    return this.callReadOnlyFn("get-start-height", []);
  }

  getEndHeight(): ReadOnlyFn {
    return this.callReadOnlyFn("get-end-height", []);
  }

  getTotalAllocation(): ReadOnlyFn {
    return this.callReadOnlyFn("get-total-allocation", []);
  }

  getUnclaimedAllocation(who: string): ReadOnlyFn {
    return this.callReadOnlyFn("get-unclaimed-allocation", [types.principal(who)]);
  }

  private callReadOnlyFn(
    method: string,
    args: Array<any> = [],
    sender: Account = this.deployer
  ): ReadOnlyFn {
    const result = this.chain.callReadOnlyFn(
      this.contractName,
      method,
      args,
      sender?.address
    );

    return result;
  }
}
