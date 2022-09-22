import {
  Tx,
  Chain,
  Account,
  types,
  ReadOnlyFn,
} from "https://deno.land/x/clarinet@v0.31.1/index.ts";


export enum EDE007SnapshotProposalVotingErrCode {
  err_unauthorised=3000,
  err_proposal_already_executed=3001,
  err_proposal_already_exists=3002,
  err_unknown_proposal=3003,
  err_proposal_already_concluded=3004,
  err_proposal_inactive=3005,
  err_insufficient_voting_capacity=3006,
  err_end_block_height_not_reached=3007,
  err_not_majority=3008
  }

export class EDE007SnapshotProposalVotingClient {
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

  getTotalVoteCapacity(voter: string, height: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-total-vote-capacity", [types.principal(voter), types.uint(height)]);
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
