
import { types, Clarinet, Chain, Account } from "https://deno.land/x/clarinet@v0.28.1/index.ts";
import { assert, assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';
import { EDE002ProposalSubmissionClient } from "./src/ede002-proposal-submission-client.ts";
import { EDE001ProposalVotingClient, EDE001ProposalVotingErrCode } from "./src/ede001-proposal-voting-client.ts";
import { Utils } from "./src/utils.ts";

const utils = new Utils();

const getDurations = (blockHeight: number, submissionClient: EDE002ProposalSubmissionClient): any => {
  const duration1 = submissionClient.getParameter('proposal-duration').result.split('ok u')[1]
  const proposalDuration = Number(duration1.split(')')[0])
  const proposalStartDelay = 144
  const startHeight = blockHeight + proposalStartDelay - 1
  const endHeight = startHeight + proposalDuration
  const emergencyProposalDuration = 144
  const emergencyStartHeight = blockHeight + emergencyProposalDuration - 1
  const emergencyEndHeight = blockHeight + emergencyProposalDuration - 1

  return {
    startHeight,
    endHeight,
    proposalDuration,
    proposalStartDelay,
    emergencyProposalDuration,
    emergencyEndHeight,
    emergencyStartHeight,
  }
}

const vote = (chain: Chain, accounts: Map<string, Account>, amount: number, voter: string, proposal1: string, proposal2: string, proposal3: string): any => {
  const {
    phil,
    daisy,
    ward,
    contractEDE000,
    ede001ProposalVotingClient,
    ede002ProposalSubmissionClient,
    ede000GovernanceTokenClient
  } = utils.setup(chain, accounts)

  const startHeight = getDurations(0, ede002ProposalSubmissionClient).startHeight + 2 + 144
  let block = chain.mineBlock([
    ede002ProposalSubmissionClient.propose(proposal1, startHeight, contractEDE000, phil.address),
    ede002ProposalSubmissionClient.propose(proposal2, startHeight, contractEDE000, phil.address),
    ede002ProposalSubmissionClient.propose(proposal3, startHeight, contractEDE000, phil.address)
  ]);
  block.receipts[0].result.expectOk().expectBool(true)
  block.receipts[1].result.expectOk().expectBool(true)
  block.receipts[2].result.expectOk().expectBool(true)
  chain.mineEmptyBlock(startHeight);
  block = chain.mineBlock([
    ede001ProposalVotingClient.vote(amount, true, proposal1, contractEDE000, voter),
    ede001ProposalVotingClient.vote(amount, false, proposal2, contractEDE000, voter),
    ede001ProposalVotingClient.vote(amount, true, proposal3, contractEDE000, voter)
  ]);
  block.receipts[0].result.expectOk().expectBool(true)
  block.receipts[1].result.expectOk().expectBool(true)
  block.receipts[2].result.expectOk().expectBool(true)
  ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(0)
  ede000GovernanceTokenClient.edgGetLocked(daisy.address).result.expectOk().expectUint(0)
  ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(1000)
  ede000GovernanceTokenClient.edgGetLocked(ward.address).result.expectOk().expectUint(900)
  ede000GovernanceTokenClient.edgGetTotalDelegated(daisy.address).result.expectOk().expectUint(0)
  ede000GovernanceTokenClient.edgGetTotalDelegated(ward.address).result.expectOk().expectUint(1000)
}
const assertProposal = (
    concluded: boolean, 
    passed: boolean, 
    votesFor: number, 
    votesAgainst: number, 
    startBlockHeight: number, 
    endBlockHeight: number, 
    proposer: string, 
    proposal: string, 
    ede001ProposalVotingClient: EDE001ProposalVotingClient
  // deno-lint-ignore no-explicit-any
  ): any => {
    const proposalData = ede001ProposalVotingClient.getProposalData(proposal).result.expectSome().expectTuple()
    assertEquals(proposalData, 
    {
      'concluded': types.bool(concluded),
      'passed': types.bool(passed),
      'votes-for':  types.uint(votesFor),
      'votes-against': types.uint(votesAgainst),
      'start-block-height': types.uint(startBlockHeight),
      'end-block-height': types.uint(endBlockHeight),
      proposer: proposer
  });
}

Clarinet.test({
  name: "Ensure can rescind delegated votes over several transactions from a live proposal but not more than was delegated",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      deployer, 
      exeDaoClient,
      phil,
      daisy,
      ward,
      contractEDE000,
      contractEDP000,
      contractEDP003, contractEDP004, contractEDP005,
      ede000GovernanceTokenClient,
      ede001ProposalVotingClient,
    } = utils.setup(chain, accounts)

    let block = chain.mineBlock([
      exeDaoClient.construct(contractEDP000, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(0)

    block = chain.mineBlock([
      ede000GovernanceTokenClient.edgDelegate(1000, ward.address, daisy.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(1000)

    // vote 50 tokens on each of three proposals
    vote(chain, accounts, 300, ward.address, contractEDP003, contractEDP004, contractEDP005)

    assertProposal(false, false, 300, 0, 289, 1729, phil.address, contractEDP003, ede001ProposalVotingClient)
    assertProposal(false, false, 0, 300, 289, 1729, phil.address, contractEDP004, ede001ProposalVotingClient)
    assertProposal(false, false, 300, 0, 289, 1729, phil.address, contractEDP005, ede001ProposalVotingClient)

    block = chain.mineBlock([
      ede001ProposalVotingClient.rescindVotes(25, true, ward.address, contractEDP003, contractEDE000, daisy.address),
      ede001ProposalVotingClient.rescindVotes(25, true, ward.address, contractEDP003, contractEDE000, daisy.address),
      ede001ProposalVotingClient.rescindVotes(25, true, ward.address, contractEDP003, contractEDE000, daisy.address),
      ede001ProposalVotingClient.rescindVotes(300, true, ward.address, contractEDP003, contractEDE000, daisy.address),
      ede001ProposalVotingClient.rescindVotes(1, true, ward.address, contractEDP003, contractEDE000, daisy.address)
    ]);
    // console.log(block.receipts[0])
    block.receipts[0].result.expectOk().expectUint(25)
    block.receipts[1].result.expectOk().expectUint(25)
    block.receipts[2].result.expectOk().expectUint(25)
    block.receipts[3].result.expectOk().expectUint(225)
    block.receipts[4].result.expectErr().expectUint(EDE001ProposalVotingErrCode.err_rescinding_more_than_cast)

    assert(block.receipts[0].events[0].contract_event.contract_identifier === 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.ede001-proposal-voting') 
    assert(block.receipts[0].events[1].ft_burn_event.amount == 25) 
    assert(block.receipts[0].events[2].ft_mint_event.amount == 25)
    assert(block.receipts[0].events[4].ft_transfer_event.amount == 25)

    assertProposal(false, false, 0, 0, 289, 1729, phil.address, contractEDP003, ede001ProposalVotingClient)

    ede000GovernanceTokenClient.edgGetTotalDelegated(daisy.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetTotalDelegated(ward.address).result.expectOk().expectUint(700)
    ede000GovernanceTokenClient.edgGetDelegating(daisy.address, ward.address).result.expectOk().expectUint(700)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(300)
    ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(700)
    ede000GovernanceTokenClient.edgGetLocked(ward.address).result.expectOk().expectUint(600)
  }
});

Clarinet.test({
  name: "Ensure cant rescind delegated votes if cast opposite way to request",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      deployer, 
      exeDaoClient,
      phil,
      daisy,
      ward,
      contractEDE000,
      contractEDP000,
      contractEDP003, contractEDP004, contractEDP005,
      ede000GovernanceTokenClient,
      ede001ProposalVotingClient,
    } = utils.setup(chain, accounts)

    let block = chain.mineBlock([
      exeDaoClient.construct(contractEDP000, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(0)

    block = chain.mineBlock([
      ede000GovernanceTokenClient.edgDelegate(1000, ward.address, daisy.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(1000)

    // vote 50 tokens on each of three proposals
    vote(chain, accounts, 300, ward.address, contractEDP003, contractEDP004, contractEDP005)

    assertProposal(false, false, 300, 0, 289, 1729, phil.address, contractEDP003, ede001ProposalVotingClient)
    assertProposal(false, false, 0, 300, 289, 1729, phil.address, contractEDP004, ede001ProposalVotingClient)
    assertProposal(false, false, 300, 0, 289, 1729, phil.address, contractEDP005, ede001ProposalVotingClient)

    block = chain.mineBlock([
      ede001ProposalVotingClient.rescindVotes(25, false, ward.address, contractEDP003, contractEDE000, daisy.address),
      ede001ProposalVotingClient.rescindVotes(25, true, ward.address, contractEDP004, contractEDE000, daisy.address),
      ede001ProposalVotingClient.rescindVotes(25, false, ward.address, contractEDP005, contractEDE000, daisy.address),
    ]);
    assert(block.receipts[0].events.length == 0)
    assert(block.receipts[1].events.length == 0)
    assert(block.receipts[2].events.length == 0)

    assertProposal(false, false, 300, 0, 289, 1729, phil.address, contractEDP003, ede001ProposalVotingClient)
    assertProposal(false, false, 0, 300, 289, 1729, phil.address, contractEDP004, ede001ProposalVotingClient)
    assertProposal(false, false, 300, 0, 289, 1729, phil.address, contractEDP005, ede001ProposalVotingClient)
    
    block.receipts[0].result.expectErr().expectUint(EDE001ProposalVotingErrCode.err_rescinding_more_than_cast)
    block.receipts[1].result.expectErr().expectUint(EDE001ProposalVotingErrCode.err_rescinding_more_than_cast)
    block.receipts[2].result.expectErr().expectUint(EDE001ProposalVotingErrCode.err_rescinding_more_than_cast)

    ede000GovernanceTokenClient.edgGetTotalDelegated(daisy.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetTotalDelegated(ward.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetDelegating(daisy.address, ward.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetLocked(ward.address).result.expectOk().expectUint(900)
  }
});

Clarinet.test({
  name: "Ensure voter rescind delegated votes from multiple live proposals",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      deployer, 
      exeDaoClient,
      phil,
      daisy,
      ward,
      contractEDE000,
      contractEDP000,
      contractEDP003, contractEDP004, contractEDP005,
      ede000GovernanceTokenClient,
      ede001ProposalVotingClient,
    } = utils.setup(chain, accounts)

    let block = chain.mineBlock([
      exeDaoClient.construct(contractEDP000, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(0)

    block = chain.mineBlock([
      ede000GovernanceTokenClient.edgDelegate(1000, ward.address, daisy.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(1000)

    // vote 50 tokens on each of three proposals
    vote(chain, accounts, 300, ward.address, contractEDP003, contractEDP004, contractEDP005)

    assertProposal(false, false, 300, 0, 289, 1729, phil.address, contractEDP003, ede001ProposalVotingClient)
    assertProposal(false, false, 0, 300, 289, 1729, phil.address, contractEDP004, ede001ProposalVotingClient)
    assertProposal(false, false, 300, 0, 289, 1729, phil.address, contractEDP005, ede001ProposalVotingClient)

    block = chain.mineBlock([
      ede001ProposalVotingClient.rescindVotes(25, true, ward.address, contractEDP003, contractEDE000, daisy.address),
      ede001ProposalVotingClient.rescindVotes(25, false, ward.address, contractEDP004, contractEDE000, daisy.address),
      ede001ProposalVotingClient.rescindVotes(25, true, ward.address, contractEDP005, contractEDE000, daisy.address),
    ]);
    //console.log(block.receipts[3])
    assert(block.receipts[0].events.length == 5)
    assert(block.receipts[1].events.length == 5)
    assert(block.receipts[2].events.length == 5)

    assertProposal(false, false, 275, 0, 289, 1729, phil.address, contractEDP003, ede001ProposalVotingClient)
    assertProposal(false, false, 0, 275, 289, 1729, phil.address, contractEDP004, ede001ProposalVotingClient)
    assertProposal(false, false, 275, 0, 289, 1729, phil.address, contractEDP005, ede001ProposalVotingClient)
    block.receipts[0].result.expectOk().expectUint(25)
    block.receipts[1].result.expectOk().expectUint(25)
    block.receipts[2].result.expectOk().expectUint(25)

    ede000GovernanceTokenClient.edgGetTotalDelegated(daisy.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetTotalDelegated(ward.address).result.expectOk().expectUint(925)
    ede000GovernanceTokenClient.edgGetDelegating(daisy.address, ward.address).result.expectOk().expectUint(925)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(75)
    ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(925)
    ede000GovernanceTokenClient.edgGetLocked(ward.address).result.expectOk().expectUint(825)
  }
});

Clarinet.test({
  name: "Ensure voter cant rescind delegated votes from concluded proposals",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      deployer, 
      exeDaoClient,
      phil,
      daisy,
      ward,
      contractEDE000,
      contractEDP000,
      contractEDP003, contractEDP004, contractEDP005,
      ede000GovernanceTokenClient,
      ede001ProposalVotingClient,
    } = utils.setup(chain, accounts)

    let block = chain.mineBlock([
      exeDaoClient.construct(contractEDP000, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(0)

    block = chain.mineBlock([
      ede000GovernanceTokenClient.edgDelegate(1000, ward.address, daisy.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(1000)

    // vote 50 tokens on each of three proposals
    vote(chain, accounts, 300, ward.address, contractEDP003, contractEDP004, contractEDP005)

    assertProposal(false, false, 300, 0, 289, 1729, phil.address, contractEDP003, ede001ProposalVotingClient)

    chain.mineEmptyBlock(1585);
    block = chain.mineBlock([
      ede001ProposalVotingClient.conclude(contractEDP004, ward.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(false)
    block = chain.mineBlock([
      ede001ProposalVotingClient.rescindVotes(25, true, ward.address, contractEDP004, contractEDE000, daisy.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(EDE001ProposalVotingErrCode.err_proposal_already_concluded)

    ede000GovernanceTokenClient.edgGetTotalDelegated(daisy.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetTotalDelegated(ward.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetDelegating(daisy.address, ward.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetLocked(ward.address).result.expectOk().expectUint(900)
  }
});

Clarinet.test({
  name: "Ensure voter can rescind delegated votes from concluded proposals once the proxy has reclaimed the votes",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      deployer, 
      exeDaoClient,
      phil,
      daisy,
      ward,
      contractEDE000,
      contractEDP000,
      contractEDP003, contractEDP004, contractEDP005,
      ede000GovernanceTokenClient,
      ede001ProposalVotingClient,
    } = utils.setup(chain, accounts)

    let block = chain.mineBlock([
      exeDaoClient.construct(contractEDP000, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(0)

    block = chain.mineBlock([
      ede000GovernanceTokenClient.edgDelegate(1000, ward.address, daisy.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(1000)

    // vote 50 tokens on each of three proposals
    vote(chain, accounts, 300, ward.address, contractEDP003, contractEDP004, contractEDP005)

    assertProposal(false, false, 300, 0, 289, 1729, phil.address, contractEDP003, ede001ProposalVotingClient)

    chain.mineEmptyBlock(1585);
    block = chain.mineBlock([
      ede001ProposalVotingClient.conclude(contractEDP004, ward.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(false)
    block = chain.mineBlock([
      ede001ProposalVotingClient.rescindVotes(25, true, ward.address, contractEDP004, contractEDE000, daisy.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(EDE001ProposalVotingErrCode.err_proposal_already_concluded)
    
    block = chain.mineBlock([
      ede001ProposalVotingClient.reclaimVotes(contractEDP004, contractEDE000, ward.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede000GovernanceTokenClient.edgGetLocked(ward.address).result.expectOk().expectUint(600)

    block = chain.mineBlock([
      ede001ProposalVotingClient.rescindVotes(400, true, ward.address, contractEDP004, contractEDE000, daisy.address),
      ede000GovernanceTokenClient.edgRescind(400, ward.address, daisy.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(EDE001ProposalVotingErrCode.err_proposal_already_concluded)
    block.receipts[1].result.expectOk().expectUint(400)

    ede000GovernanceTokenClient.edgGetTotalDelegated(daisy.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetTotalDelegated(ward.address).result.expectOk().expectUint(600)
    ede000GovernanceTokenClient.edgGetDelegating(daisy.address, ward.address).result.expectOk().expectUint(600)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(400)
    ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(600)
    ede000GovernanceTokenClient.edgGetLocked(ward.address).result.expectOk().expectUint(600)
  }
});

Clarinet.test({
  name: "Ensure voter cant rescind after block height reaches the rescind-time-lock from the end time",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      deployer, 
      exeDaoClient,
      phil,
      daisy,
      ward,
      contractEDE000,
      contractEDP000,
      contractEDP003, contractEDP004, contractEDP005,
      ede000GovernanceTokenClient,
      ede001ProposalVotingClient,
      ede002ProposalSubmissionClient
    } = utils.setup(chain, accounts)

    let block = chain.mineBlock([
      exeDaoClient.construct(contractEDP000, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(0)

    // proposal-duration=1440

    block = chain.mineBlock([
      ede002ProposalSubmissionClient.propose(contractEDP003, block.height + 144, contractEDE000, phil.address),
      ede000GovernanceTokenClient.edgDelegate(500, ward.address, daisy.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    block.receipts[1].result.expectOk().expectBool(true)
  
		chain.mineEmptyBlockUntil(block.height + 144);
    block = chain.mineBlock([
      ede001ProposalVotingClient.vote(500, true, contractEDP003, contractEDE000, ward.address)
    ])
    console.log(block.height)
    block.receipts[0].result.expectOk().expectBool(true)

    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(500)
    ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(500)
    ede000GovernanceTokenClient.edgGetLocked(daisy.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetLocked(ward.address).result.expectOk().expectUint(500)

    assertProposal(false, false, 500, 0, 146, 1586, phil.address, contractEDP003, ede001ProposalVotingClient)

		chain.mineEmptyBlockUntil(1586 - 289);

    block = chain.mineBlock([
      ede001ProposalVotingClient.rescindVotes(10, true, ward.address, contractEDP003, contractEDE000, ward.address),
      ede001ProposalVotingClient.rescindVotes(10, false, ward.address, contractEDP003, contractEDE000, daisy.address),
      ede001ProposalVotingClient.rescindVotes(10, true, ward.address, contractEDP003, contractEDE000, daisy.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(EDE001ProposalVotingErrCode.err_rescinding_more_than_delegated)
    block.receipts[1].result.expectErr().expectUint(EDE001ProposalVotingErrCode.err_rescinding_more_than_cast)
    block.receipts[2].result.expectOk().expectUint(10)

    block = chain.mineBlock([
      ede001ProposalVotingClient.rescindVotes(10, true, ward.address, contractEDP003, contractEDE000, daisy.address),
    ])
    block.receipts[0].result.expectErr().expectUint(EDE001ProposalVotingErrCode.err_rescind_time_lock_active)
    
    ede000GovernanceTokenClient.edgGetTotalDelegated(daisy.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetTotalDelegated(ward.address).result.expectOk().expectUint(490)
    ede000GovernanceTokenClient.edgGetDelegating(daisy.address, ward.address).result.expectOk().expectUint(490)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(510)
    ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(490)
    ede000GovernanceTokenClient.edgGetLocked(daisy.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetLocked(ward.address).result.expectOk().expectUint(490)
  }
});

