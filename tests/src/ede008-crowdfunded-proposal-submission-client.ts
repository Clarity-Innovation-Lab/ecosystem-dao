import {
  Tx,
  Chain,
  Account,
  types,
  ReadOnlyFn,
} from "https://deno.land/x/clarinet@v0.31.1/index.ts";


export enum EDE008CrowdfundedProposalSubmissionErrCode {
  err_unauthorised=3100,
  err_not_governance_token=3101,
  err_insufficient_balance=3102,
  err_unknown_parameter=3103,
  err_proposal_minimum_start_delay=3104,
  err_proposal_maximum_start_delay=3105
}

export class EDE008CrowdfundedProposalSubmissionClient {
  contractName = "";
  chain: Chain;
  deployer: Account;

  constructor(chain: Chain, deployer: Account, contractName: string) {
    this.contractName = contractName;
    this.chain = chain;
    this.deployer = deployer;
  }

  getParameter(parameter: string, ): ReadOnlyFn {
    return this.callReadOnlyFn("get-parameter", [types.ascii(parameter)]);
  }

  propose(proposal: string, votingExtension: string, startBlockHeight: number, txSender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "propose",
      [types.principal(proposal), types.principal(votingExtension), types.uint(startBlockHeight)], txSender);
  }

  fund(proposal: string, amount: number, txSender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "propose",
      [types.principal(proposal), types.uint(amount)], txSender);
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
