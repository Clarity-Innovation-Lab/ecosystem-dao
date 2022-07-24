import {
  Tx,
  Chain,
  Account,
  types,
  ReadOnlyFn,
} from "https://deno.land/x/clarinet@v0.31.1/index.ts";


export enum EDE001ProposalVotingErrCode {
  err_unauthorised=3000,
  err_not_governance_token=3001,
  err_proposal_already_executed=3002,
  err_proposal_already_exists=3003,
  err_unknown_proposal=3004,
  err_proposal_already_concluded=3005,
  err_proposal_inactive=3006,
  err_proposal_not_concluded=3007,
  err_no_votes_to_return=3008,
  err_end_block_height_not_reached=3009,
  err_disabled=3010
  }

export class EDE001ProposalVotingClient {
  contractName = "";
  chain: Chain;
  deployer: Account;

  constructor(chain: Chain, deployer: Account, contractName: string) {
    this.contractName = contractName;
    this.chain = chain;
    this.deployer = deployer;
  }
  
  getCurrentTotalVotes(proposal: string, voter: string): ReadOnlyFn {
    return this.callReadOnlyFn("get-current-total-votes", [types.principal(proposal), types.principal(voter)]);
  }

  getProposalData(proposal: string): ReadOnlyFn {
    return this.callReadOnlyFn("get-proposal-data", [types.principal(proposal)]);
  }

  vote(amount: number, _for: boolean, proposal: string, txSender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "vote",
      [types.uint(amount), types.bool(_for), types.principal(proposal)], txSender);
  }

  reclaimAndVote(amount: number, _for: boolean, proposal: string, reclaimFrom: string, txSender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "reclaim-and-vote",
      [types.uint(amount), types.bool(_for), types.principal(proposal), types.principal(reclaimFrom)], txSender);
  }

  reclaimVotes(proposal: string, txSender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "reclaim-votes",
      [types.principal(proposal)], txSender);
  }

  conclude(proposal: string, txSender: string): Tx {
    return Tx.contractCall(
      this.contractName,
      "conclude",
      [types.principal(proposal)], txSender);
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
