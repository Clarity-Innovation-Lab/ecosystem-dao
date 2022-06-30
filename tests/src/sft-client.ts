import {
  Tx,
  Chain,
  Account,
  types,
  ReadOnlyFn,
} from "https://deno.land/x/clarinet@v0.28.1/index.ts";

export enum SftErrorCode {
  err_owner_only=100,
  err_token_id_failure=101,
  err_not_token_owner=102
}

export class SftClient {
  contractName = "";
  chain: Chain;
  deployer: Account;

  constructor(chain: Chain, deployer: Account, contractName: string) {
    this.contractName = contractName;
    this.chain = chain;
    this.deployer = deployer;
  }

  transfer(tokenId: number, amount: number, sender: string, recipient: string, txSender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "transfer",
      [types.uint(tokenId), types.uint(amount), types.principal(sender), types.principal(recipient)], txSender);
  }
  mint(tokenId: number, amount: number, recipient: string, txSender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "mint",
      [types.uint(tokenId), types.uint(amount), types.principal(recipient)], txSender);
  }
  getBalance(tokenId: number, who: string): ReadOnlyFn {
    return this.callReadOnlyFn("get-balance", [types.uint(tokenId), types.principal(who)]);
  }
  getOverallBalance(who: string): ReadOnlyFn {
    return this.callReadOnlyFn("get-overall-balance", [types.principal(who)]);
  }

  private callReadOnlyFn(
    method: string,
    // deno-lint-ignore no-explicit-any
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
