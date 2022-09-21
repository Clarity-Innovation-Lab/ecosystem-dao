import {
  Tx,
  Chain,
  Account,
  types,
  ReadOnlyFn,
} from "https://deno.land/x/clarinet@v0.31.1/index.ts";


export enum EDE008FundedProposalSubmissionErrCode {
  err_unauthorised=3100,
  err_not_governance_token=3101,
  err_insufficient_balance=3102,
  err_unknown_parameter=3103,
  err_proposal_minimum_start_delay=3104,
  err_proposal_maximum_start_delay=3105
}

export class EDE008FundedProposalSubmissionClient {
  contractName = "";
  chain: Chain;
  deployer: Account;

  constructor(chain: Chain, deployer: Account, contractName: string) {
    this.contractName = contractName;
    this.chain = chain;
    this.deployer = deployer;
  }

  getParameter(parameter: string): ReadOnlyFn {
    return this.callReadOnlyFn("get-parameter", [types.ascii(parameter)]);
  }

  isProposalFunded(proposal: string): ReadOnlyFn {
    return this.callReadOnlyFn("is-proposal-funded", [types.principal(proposal)]);
  }

  getProposalFunding(proposal: string): ReadOnlyFn {
    return this.callReadOnlyFn("get-proposal-funding", [types.principal(proposal)]);
  }

  getProposalFundingByPrincipal(proposal: string, funder: string): ReadOnlyFn {
    return this.callReadOnlyFn("get-proposal-funding-by-principal", [types.principal(proposal), types.principal(funder)]);
  }

  //(define-read-only (get-proposal-funding (proposal principal))

  fund(proposal: string, amount: number, majority: number|null, txSender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "fund",
      [types.principal(proposal), types.uint(amount), (majority && majority > 0) ? types.some(types.uint(majority)) : types.none()], txSender);
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
