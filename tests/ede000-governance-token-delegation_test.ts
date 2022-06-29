
import { Clarinet, Chain, Account } from "https://deno.land/x/clarinet@v0.28.1/index.ts";
import { EDE000GovernanceTokenErrCode } from "./src/ede000-governance-token-client.ts";
import { EDE002ProposalSubmissionClient } from "./src/ede002-proposal-submission-client.ts";
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

const vote = (chain: Chain, accounts: Map<string, Account>, amount: number, voter: string, proposal: string): any => {
    const {
      phil,
      contractEDE000,
      ede001ProposalVotingClient,
      ede002ProposalSubmissionClient
    } = utils.setup(chain, accounts)

  const startHeight = getDurations(0, ede002ProposalSubmissionClient).startHeight + 2 + 144
  let block = chain.mineBlock([
    ede002ProposalSubmissionClient.propose(proposal, startHeight, contractEDE000, phil.address)
  ]);
  block.receipts[0].result.expectOk().expectBool(true)
  chain.mineEmptyBlock(startHeight);
  block = chain.mineBlock([
    ede001ProposalVotingClient.vote(amount, true, proposal, contractEDE000, voter)
  ]);
  block.receipts[0].result.expectOk().expectBool(true)
}

Clarinet.test({
  name: "Ensure voter cant rescind without first delegating",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      deployer, 
      exeDaoClient,
      daisy,
      bobby,
      ward,
      contractEDP000, 
      ede000GovernanceTokenClient
    } = utils.setup(chain, accounts)

    let block = chain.mineBlock([
      exeDaoClient.construct(contractEDP000, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede000GovernanceTokenClient.edgGetBalance(bobby.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(0)

    block = chain.mineBlock([
      ede000GovernanceTokenClient.edgRescind(100, bobby.address, daisy.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(EDE000GovernanceTokenErrCode.err_rescinding_more_than_delegated)
  }
});

Clarinet.test({
  name: "Ensure voter cant rescind more than delegated",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      deployer, 
      exeDaoClient,
      daisy,
      bobby,
      ward,
      contractEDP000, 
      ede000GovernanceTokenClient
    } = utils.setup(chain, accounts)

    let block = chain.mineBlock([
      exeDaoClient.construct(contractEDP000, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede000GovernanceTokenClient.edgGetBalance(bobby.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(0)

    block = chain.mineBlock([
      ede000GovernanceTokenClient.edgDelegate(100, bobby.address, daisy.address),
      ede000GovernanceTokenClient.edgRescind(101, bobby.address, daisy.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    block.receipts[1].result.expectErr().expectUint(EDE000GovernanceTokenErrCode.err_rescinding_more_than_delegated)
    ede000GovernanceTokenClient.edgGetTotalDelegated(daisy.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetTotalDelegated(bobby.address).result.expectOk().expectUint(100)
    ede000GovernanceTokenClient.edgGetDelegating(daisy.address, bobby.address).result.expectOk().expectUint(100)
    ede000GovernanceTokenClient.edgGetDelegating(bobby.address, daisy.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(900)
    ede000GovernanceTokenClient.edgGetBalance(bobby.address).result.expectOk().expectUint(1100)
  }
});

Clarinet.test({
  name: "Ensure voter can rescind what they delegated",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      deployer, 
      exeDaoClient,
      daisy,
      bobby,
      ward,
      contractEDP000, 
      ede000GovernanceTokenClient
    } = utils.setup(chain, accounts)

    let block = chain.mineBlock([
      exeDaoClient.construct(contractEDP000, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede000GovernanceTokenClient.edgGetBalance(bobby.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(0)

    block = chain.mineBlock([
      ede000GovernanceTokenClient.edgDelegate(100, bobby.address, daisy.address),
      ede000GovernanceTokenClient.edgRescind(100, bobby.address, daisy.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    block.receipts[1].result.expectOk().expectUint(100)
    ede000GovernanceTokenClient.edgGetTotalDelegated(daisy.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetTotalDelegated(bobby.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetDelegating(daisy.address, bobby.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetDelegating(bobby.address, daisy.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetBalance(bobby.address).result.expectOk().expectUint(1000)
  }
});

Clarinet.test({
  name: "Ensure voter cant delegate more than they have",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      deployer, 
      exeDaoClient,
      daisy,
      bobby,
      contractEDP000, 
      ede000GovernanceTokenClient
    } = utils.setup(chain, accounts)

    let block = chain.mineBlock([
      exeDaoClient.construct(contractEDP000, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede000GovernanceTokenClient.edgGetBalance(bobby.address).result.expectOk().expectUint(1000)

    block = chain.mineBlock([
      ede000GovernanceTokenClient.edgDelegate(1001, bobby.address, daisy.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(EDE000GovernanceTokenErrCode.err_insufficient_undelegated_tokens)
  }
});

Clarinet.test({
  name: "Ensure delegate cant transfer delegated tokens",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      deployer, 
      exeDaoClient,
      daisy,
      bobby,
      ward,
      contractEDP000, 
      ede000GovernanceTokenClient
    } = utils.setup(chain, accounts)

    let block = chain.mineBlock([
      exeDaoClient.construct(contractEDP000, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede000GovernanceTokenClient.edgGetBalance(bobby.address).result.expectOk().expectUint(1000)

    block = chain.mineBlock([
      ede000GovernanceTokenClient.edgDelegate(1000, bobby.address, daisy.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede000GovernanceTokenClient.edgGetTotalDelegated(bobby.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetDelegating(daisy.address, bobby.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetBalance(bobby.address).result.expectOk().expectUint(2000)

    block = chain.mineBlock([
      ede000GovernanceTokenClient.edgTransfer(1001, bobby.address, ward.address, bobby.address),
      ede000GovernanceTokenClient.transfer(1001, bobby.address, ward.address, "no message", bobby.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(EDE000GovernanceTokenErrCode.err_unauthorised)
    block.receipts[1].result.expectErr().expectUint(EDE000GovernanceTokenErrCode.err_insufficient_undelegated_tokens)
  }
});

Clarinet.test({
  name: "Ensure delegate can transfer undelegated tokens",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      deployer,
      exeDaoClient,
      daisy,
      bobby,
      ward,
      contractEDP000,
      ede000GovernanceTokenClient
    } = utils.setup(chain, accounts)

    let block = chain.mineBlock([
      exeDaoClient.construct(contractEDP000, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede000GovernanceTokenClient.edgGetBalance(bobby.address).result.expectOk().expectUint(1000)

    block = chain.mineBlock([
      ede000GovernanceTokenClient.edgDelegate(1000, bobby.address, daisy.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede000GovernanceTokenClient.edgGetTotalDelegated(bobby.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetDelegating(daisy.address, bobby.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetBalance(bobby.address).result.expectOk().expectUint(2000)

    block = chain.mineBlock([
      ede000GovernanceTokenClient.edgTransfer(1000, bobby.address, ward.address, bobby.address),
      ede000GovernanceTokenClient.transfer(1000, bobby.address, ward.address, "no message", bobby.address)
    ]);
    block.receipts[0].result.expectErr().expectUint(EDE000GovernanceTokenErrCode.err_unauthorised)
    block.receipts[1].result.expectOk().expectBool(true)
  }
});

Clarinet.test({
  name: "Ensure delegate can vote with their own plus delegated tokens",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      deployer,
      exeDaoClient,
      daisy,
      bobby,
      contractEDP000,
      contractEDP003,
      ede000GovernanceTokenClient
    } = utils.setup(chain, accounts)

    let block = chain.mineBlock([
      exeDaoClient.construct(contractEDP000, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede000GovernanceTokenClient.edgGetBalance(bobby.address).result.expectOk().expectUint(1000)

    block = chain.mineBlock([
      ede000GovernanceTokenClient.edgDelegate(1000, bobby.address, daisy.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede000GovernanceTokenClient.edgGetTotalDelegated(bobby.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetDelegating(daisy.address, bobby.address).result.expectOk().expectUint(1000)
    
    vote(chain, accounts, 2000, bobby.address, contractEDP003)
    
    ede000GovernanceTokenClient.edgGetLocked(bobby.address).result.expectOk().expectUint(2000)
    ede000GovernanceTokenClient.edgGetBalance(bobby.address).result.expectOk().expectUint(2000)
  }
});

/**
 * Description: Proxy initially has 1000 tokens.
 *              Voter delegetes 100 tokens to proxy who votes with 1050 tokens on a proposal.
 *              The voter calls rescind for the full 100 tokens. 50 tokens are returned to the 
 *              voter 
 */
 Clarinet.test({
  name: "Ensure rescinding more than available returns as many unlocked tokens to the voter as possible",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      deployer, 
      exeDaoClient,
      daisy,
      ward,
      contractEDP000,
      contractEDP003,
      ede000GovernanceTokenClient
    } = utils.setup(chain, accounts)

    let block = chain.mineBlock([
      exeDaoClient.construct(contractEDP000, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(0)

    block = chain.mineBlock([
      ede000GovernanceTokenClient.edgDelegate(100, ward.address, daisy.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(900)
    ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(100)

    vote(chain, accounts, 50, ward.address, contractEDP003)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(900)
    ede000GovernanceTokenClient.edgGetLocked(daisy.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(100)
    ede000GovernanceTokenClient.edgGetLocked(ward.address).result.expectOk().expectUint(50)
    ede000GovernanceTokenClient.edgGetTotalDelegated(daisy.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetTotalDelegated(ward.address).result.expectOk().expectUint(100)

    block = chain.mineBlock([
      ede000GovernanceTokenClient.edgRescind(100, ward.address, daisy.address)
    ]);
    block.receipts[0].result.expectOk().expectUint(50)

    ede000GovernanceTokenClient.edgGetTotalDelegated(daisy.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetTotalDelegated(ward.address).result.expectOk().expectUint(50)
    ede000GovernanceTokenClient.edgGetDelegating(daisy.address, ward.address).result.expectOk().expectUint(50)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(950)
    ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(50)
  }
});

/**
 * Description: Proxy initially has 1000 tokens.
 *              Voter delegetes 100 tokens to proxy who votes with 1050 tokens on a proposal.
 *              The voter calls rescind for the full 100 tokens. 50 tokens are returned to the 
 *              voter 
 */
 Clarinet.test({
  name: "Ensure rescinding less than available returns the amount requested unlocked tokens to the voter",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      deployer, 
      exeDaoClient,
      daisy,
      ward,
      contractEDP000,
      contractEDP003,
      ede000GovernanceTokenClient
    } = utils.setup(chain, accounts)

    let block = chain.mineBlock([
      exeDaoClient.construct(contractEDP000, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(0)

    block = chain.mineBlock([
      ede000GovernanceTokenClient.edgDelegate(100, ward.address, daisy.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(900)
    ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(100)

    vote(chain, accounts, 50, ward.address, contractEDP003)

    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(900)
    ede000GovernanceTokenClient.edgGetLocked(daisy.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(100)
    ede000GovernanceTokenClient.edgGetLocked(ward.address).result.expectOk().expectUint(50)
    ede000GovernanceTokenClient.edgGetTotalDelegated(daisy.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetTotalDelegated(ward.address).result.expectOk().expectUint(100)

    block = chain.mineBlock([
      ede000GovernanceTokenClient.edgRescind(25, ward.address, daisy.address)
    ]);
    block.receipts[0].result.expectOk().expectUint(25)
    ede000GovernanceTokenClient.edgGetTotalDelegated(daisy.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetTotalDelegated(ward.address).result.expectOk().expectUint(75)
    ede000GovernanceTokenClient.edgGetDelegating(daisy.address, ward.address).result.expectOk().expectUint(75)
    ede000GovernanceTokenClient.edgGetDelegating(ward.address, daisy.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(925)
    ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(75)
  }
});
Clarinet.test({
  name: "Ensure rescinding multiple times returns correct amount the voter",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      deployer, 
      exeDaoClient,
      daisy,
      ward,
      contractEDP000,
      contractEDP003,
      ede000GovernanceTokenClient
    } = utils.setup(chain, accounts)

    let block = chain.mineBlock([
      exeDaoClient.construct(contractEDP000, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(0)

    block = chain.mineBlock([
      ede000GovernanceTokenClient.edgDelegate(100, ward.address, daisy.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(900)
    ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(100)

    vote(chain, accounts, 50, ward.address, contractEDP003)

    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(900)
    ede000GovernanceTokenClient.edgGetLocked(daisy.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(100)
    ede000GovernanceTokenClient.edgGetLocked(ward.address).result.expectOk().expectUint(50)
    ede000GovernanceTokenClient.edgGetTotalDelegated(daisy.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetTotalDelegated(ward.address).result.expectOk().expectUint(100)

    block = chain.mineBlock([
      ede000GovernanceTokenClient.edgRescind(25, ward.address, daisy.address),
      ede000GovernanceTokenClient.edgRescind(25, ward.address, daisy.address),
      ede000GovernanceTokenClient.edgRescind(1, ward.address, daisy.address)
    ]);
    block.receipts[0].result.expectOk().expectUint(25)
    block.receipts[1].result.expectOk().expectUint(25)
    block.receipts[2].result.expectErr().expectUint(EDE000GovernanceTokenErrCode.err_amount_to_send_is_non_positive)
    ede000GovernanceTokenClient.edgGetTotalDelegated(daisy.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetTotalDelegated(ward.address).result.expectOk().expectUint(50)
    ede000GovernanceTokenClient.edgGetDelegating(daisy.address, ward.address).result.expectOk().expectUint(50)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(950)
    ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(50)
  }
});

Clarinet.test({
  name: "Ensure rescind works when multiple voters delegate to phil",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      deployer, 
      exeDaoClient,
      phil,
      daisy,
      bobby,
      hunter,
      ward,
      contractEDP000,
      ede000GovernanceTokenClient
    } = utils.setup(chain, accounts)

    let block = chain.mineBlock([
      exeDaoClient.construct(contractEDP000, deployer.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(0)

    block = chain.mineBlock([
      ede000GovernanceTokenClient.edgDelegate(100, phil.address, daisy.address),
      ede000GovernanceTokenClient.edgDelegate(100, phil.address, bobby.address),
      ede000GovernanceTokenClient.edgDelegate(100, phil.address, hunter.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    block.receipts[1].result.expectOk().expectBool(true)
    block.receipts[2].result.expectOk().expectBool(true)

    ede000GovernanceTokenClient.edgGetBalance(phil.address).result.expectOk().expectUint(1300)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(900)
    ede000GovernanceTokenClient.edgGetBalance(bobby.address).result.expectOk().expectUint(900)
    ede000GovernanceTokenClient.edgGetBalance(hunter.address).result.expectOk().expectUint(900)

    ede000GovernanceTokenClient.edgGetTotalDelegated(phil.address).result.expectOk().expectUint(300)
    ede000GovernanceTokenClient.edgGetTotalDelegated(daisy.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetTotalDelegated(bobby.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetTotalDelegated(hunter.address).result.expectOk().expectUint(0)

    ede000GovernanceTokenClient.edgGetDelegating(ward.address, phil.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetDelegating(daisy.address, phil.address).result.expectOk().expectUint(100)
    ede000GovernanceTokenClient.edgGetDelegating(bobby.address, phil.address).result.expectOk().expectUint(100)
    ede000GovernanceTokenClient.edgGetDelegating(hunter.address, phil.address).result.expectOk().expectUint(100)

    block = chain.mineBlock([
      ede000GovernanceTokenClient.edgRescind(125, phil.address, daisy.address),
      ede000GovernanceTokenClient.edgRescind(100, phil.address, bobby.address),
      ede000GovernanceTokenClient.edgRescind(1, phil.address, hunter.address),
      ede000GovernanceTokenClient.edgRescind(1, phil.address, ward.address)
    ]);
    block.receipts[0].result.expectErr().expectUint(EDE000GovernanceTokenErrCode.err_rescinding_more_than_delegated)
    block.receipts[1].result.expectOk().expectUint(100)
    block.receipts[2].result.expectOk().expectUint(1)
    block.receipts[3].result.expectErr().expectUint(EDE000GovernanceTokenErrCode.err_rescinding_more_than_delegated)

    ede000GovernanceTokenClient.edgGetBalance(phil.address).result.expectOk().expectUint(1199)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(900)
    ede000GovernanceTokenClient.edgGetBalance(bobby.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetBalance(hunter.address).result.expectOk().expectUint(901)
    ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(0)

    ede000GovernanceTokenClient.edgGetTotalDelegated(phil.address).result.expectOk().expectUint(199)
    ede000GovernanceTokenClient.edgGetTotalDelegated(daisy.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetTotalDelegated(bobby.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetTotalDelegated(hunter.address).result.expectOk().expectUint(0)

    ede000GovernanceTokenClient.edgGetDelegating(ward.address, phil.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetDelegating(daisy.address, phil.address).result.expectOk().expectUint(100)
    ede000GovernanceTokenClient.edgGetDelegating(bobby.address, phil.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetDelegating(hunter.address, phil.address).result.expectOk().expectUint(99)
  }
});

Clarinet.test({
  name: "Ensure rescind works when multiple voters delegate to ward and ward has locked some of the delegated votes",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      deployer, 
      exeDaoClient,
      daisy,
      bobby,
      hunter,
      ward,
      contractEDP000,
      contractEDP003,
      ede000GovernanceTokenClient
    } = utils.setup(chain, accounts)

    let block = chain.mineBlock([
      exeDaoClient.construct(contractEDP000, deployer.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(0)

    block = chain.mineBlock([
      ede000GovernanceTokenClient.edgDelegate(100, ward.address, daisy.address),
      ede000GovernanceTokenClient.edgDelegate(100, ward.address, bobby.address),
      ede000GovernanceTokenClient.edgDelegate(100, ward.address, hunter.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    block.receipts[1].result.expectOk().expectBool(true)
    block.receipts[2].result.expectOk().expectBool(true)

    ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(300)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(900)
    ede000GovernanceTokenClient.edgGetBalance(bobby.address).result.expectOk().expectUint(900)
    ede000GovernanceTokenClient.edgGetBalance(hunter.address).result.expectOk().expectUint(900)

    ede000GovernanceTokenClient.edgGetTotalDelegated(ward.address).result.expectOk().expectUint(300)
    ede000GovernanceTokenClient.edgGetTotalDelegated(daisy.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetTotalDelegated(bobby.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetTotalDelegated(hunter.address).result.expectOk().expectUint(0)

    ede000GovernanceTokenClient.edgGetDelegating(ward.address, ward.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetDelegating(daisy.address, ward.address).result.expectOk().expectUint(100)
    ede000GovernanceTokenClient.edgGetDelegating(bobby.address, ward.address).result.expectOk().expectUint(100)
    ede000GovernanceTokenClient.edgGetDelegating(hunter.address, ward.address).result.expectOk().expectUint(100)

    vote(chain, accounts, 250, ward.address, contractEDP003)

    block = chain.mineBlock([
      ede000GovernanceTokenClient.edgRescind(10, ward.address, daisy.address),
      ede000GovernanceTokenClient.edgRescind(50, ward.address, bobby.address),
      ede000GovernanceTokenClient.edgRescind(5, ward.address, hunter.address),
    ]);
    block.receipts[0].result.expectOk().expectUint(10)
    block.receipts[1].result.expectOk().expectUint(40)
    block.receipts[2].result.expectErr().expectUint(EDE000GovernanceTokenErrCode.err_amount_to_send_is_non_positive)

    ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(250)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(910)
    ede000GovernanceTokenClient.edgGetBalance(bobby.address).result.expectOk().expectUint(940)
    ede000GovernanceTokenClient.edgGetBalance(hunter.address).result.expectOk().expectUint(900)

    ede000GovernanceTokenClient.edgGetTotalDelegated(ward.address).result.expectOk().expectUint(250)
    ede000GovernanceTokenClient.edgGetTotalDelegated(daisy.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetTotalDelegated(bobby.address).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetTotalDelegated(hunter.address).result.expectOk().expectUint(0)

    ede000GovernanceTokenClient.edgGetDelegating(daisy.address, ward.address).result.expectOk().expectUint(90)
    ede000GovernanceTokenClient.edgGetDelegating(bobby.address, ward.address).result.expectOk().expectUint(60)
    ede000GovernanceTokenClient.edgGetDelegating(hunter.address, ward.address).result.expectOk().expectUint(100)
  }
});
