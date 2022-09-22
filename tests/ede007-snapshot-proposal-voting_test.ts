
import { types, Clarinet, Chain, Account } from "https://deno.land/x/clarinet@v0.31.1/index.ts";
import { Utils } from "./src/utils.ts";
import { EDE007SnapshotProposalVotingClient, EDE007SnapshotProposalVotingErrCode } from "./src/ede007-snapshot-proposal-voting-client.ts";
import { EDE008FundedProposalSubmissionClient } from "./src/ede008-funded-proposal-submission-client.ts";
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

const getDurations = (blockHeight: number, submissionClient: EDE008FundedProposalSubmissionClient): any => {
    const duration1 = submissionClient.getParameter('proposal-duration').result.split('ok u')[1]
    const proposalDuration = Number(duration1.split(')')[0])
    const proposalStartDelay = 144
    const startHeight = blockHeight + proposalStartDelay - 1
    const endHeight = startHeight + proposalDuration
    const emergencyProposalDuration = 144
    const emergencyStartHeight = blockHeight + emergencyProposalDuration
    const emergencyEndHeight = blockHeight + emergencyProposalDuration - 1

    return {
        startHeight: startHeight + 2,
        endHeight: endHeight + 2,
        proposalDuration,
        proposalStartDelay,
        emergencyProposalDuration,
        emergencyEndHeight,
        emergencyStartHeight,
    }
}
      
const assertProposal = (
    customMajority: number,
    concluded: boolean,
    passed: boolean, 
    votesAgainst: number, 
    votesFor: number, 
    startBlockHeight: number, 
    endBlockHeight: number, 
    proposer: string, 
    proposal: string, 
    ede007SnapshotProposalVotingClient: EDE007SnapshotProposalVotingClient
    ): any => {
    const proposalData = ede007SnapshotProposalVotingClient.getProposalData(proposal).result.expectSome().expectTuple()
    assertEquals(proposalData, 
    {
    'concluded': types.bool(concluded),
    'passed': types.bool(passed),
    'votes-against': types.uint(votesAgainst),
    'votes-for':  types.uint(votesFor),
    'start-block-height': types.uint(startBlockHeight),
    'end-block-height': types.uint(endBlockHeight),
    'custom-majority': types.some(types.uint(customMajority)),
    proposer: proposer
    });
}
  
const utils = new Utils();
const ONE_THOUSAND_STX = 1000000000;
const ONE_HUNDRED_STX =  100000000;
const NINE_HUNDRED_STX =  900000000;

Clarinet.test({
    name: "Ensure proposal can be directly added.",
    fn(chain: Chain, accounts: Map<string, Account>) {
      const {
        deployer, 
        exeDaoClient,
        phil,
        contractEDP000, 
        ede007SnapshotProposalVotingClient
      } = utils.setup(chain, accounts)
  
      const block = chain.mineBlock([
        exeDaoClient.construct(contractEDP000, deployer.address),
      ]);
      block.receipts[0].result.expectOk().expectBool(true)
      ede007SnapshotProposalVotingClient.getTotalVoteCapacity(phil.address, 1).result.expectSome().expectUint(100000000000000)
    }
  });
  
  Clarinet.test({
    name: "Ensure proposal data is set as expected.",
    fn(chain: Chain, accounts: Map<string, Account>) {
      const {
        deployer, 
        exeDaoClient,
        phil,
        daisy,
        contractEDP000,
        contractEDP003,
        ede007SnapshotProposalVotingClient,
        ede008FundedProposalSubmissionClient
      } = utils.setup(chain, accounts)

      let block = chain.mineBlock([
        exeDaoClient.construct(contractEDP000, deployer.address),
      ]);
      block.receipts[0].result.expectOk().expectBool(true)

      const majority = 8000;
      block = chain.mineBlock([
        ede008FundedProposalSubmissionClient.fund(contractEDP003, NINE_HUNDRED_STX, majority, phil.address),
      ]);
      block.receipts[0].result.expectOk().expectBool(false)
      ede007SnapshotProposalVotingClient.getProposalData(contractEDP003).result.expectNone();

      block = chain.mineBlock([
        ede008FundedProposalSubmissionClient.fund(contractEDP003, ONE_HUNDRED_STX, majority, daisy.address),
      ]);
      block.receipts[0].result.expectOk().expectBool(true)
      assertProposal(8000, false, false, 0, 0, 10, 1018, daisy.address, contractEDP003, ede007SnapshotProposalVotingClient);
    }
  });  
  
  Clarinet.test({
    name: "Ensure voting cant start before the start height.",
    fn(chain: Chain, accounts: Map<string, Account>) {
      const {
        deployer, 
        exeDaoClient,
        daisy,
        contractEDP000,
        contractEDP003,
        ede007SnapshotProposalVotingClient,
        ede008FundedProposalSubmissionClient
      } = utils.setup(chain, accounts)

      let block = chain.mineBlock([
        exeDaoClient.construct(contractEDP000, deployer.address),
      ]);
      block.receipts[0].result.expectOk().expectBool(true)

      const majority = 8000;
      block = chain.mineBlock([
        ede008FundedProposalSubmissionClient.fund(contractEDP003, ONE_THOUSAND_STX, majority, daisy.address),
      ]);
      block.receipts[0].result.expectOk().expectBool(true)
      assertProposal(8000, false, false, 0, 0, 9, 1017, daisy.address, contractEDP003, ede007SnapshotProposalVotingClient);

      block = chain.mineBlock([
        ede007SnapshotProposalVotingClient.vote(500, true, contractEDP003, daisy.address),
      ]);
      block.receipts[0].result.expectErr().expectUint(EDE007SnapshotProposalVotingErrCode.err_proposal_inactive)
  
    }
  });  
  
  Clarinet.test({
    name: "Ensure proposal fails if votes for equals the custom majority.",
    fn(chain: Chain, accounts: Map<string, Account>) {
      const {
        deployer, 
        exeDaoClient,
        daisy,
        phil,
        bobby,
        ward,
        hunter,
        contractEDP000,
        contractEDP003,
        ede007SnapshotProposalVotingClient,
        ede008FundedProposalSubmissionClient
      } = utils.setup(chain, accounts)

      let block = chain.mineBlock([
        exeDaoClient.construct(contractEDP000, deployer.address),
      ]);
      block.receipts[0].result.expectOk().expectBool(true)

      const majority = 8000;
      block = chain.mineBlock([
        ede008FundedProposalSubmissionClient.fund(contractEDP003, ONE_THOUSAND_STX, majority, daisy.address),
      ]);
      block.receipts[0].result.expectOk().expectBool(true)
      assertProposal(8000, false, false, 0, 0, 9, 1017, daisy.address, contractEDP003, ede007SnapshotProposalVotingClient);

      ede008FundedProposalSubmissionClient.getParameter("proposal-start-delay").result.expectOk().expectUint(6)
      ede008FundedProposalSubmissionClient.getParameter("proposal-duration").result.expectOk().expectUint(1008)

      chain.mineEmptyBlock(block.height + 6);

      block = chain.mineBlock([
        ede007SnapshotProposalVotingClient.vote(20, true, contractEDP003, daisy.address),
        ede007SnapshotProposalVotingClient.vote(20, true, contractEDP003, phil.address),
        ede007SnapshotProposalVotingClient.vote(20, true, contractEDP003, ward.address),
        ede007SnapshotProposalVotingClient.vote(20, true, contractEDP003, bobby.address),
        ede007SnapshotProposalVotingClient.vote(20, false, contractEDP003, hunter.address),
      ]);
      block.receipts[0].result.expectOk().expectBool(true)
      block.receipts[1].result.expectOk().expectBool(true)
      block.receipts[2].result.expectOk().expectBool(true)
      block.receipts[3].result.expectOk().expectBool(true)
      block.receipts[4].result.expectOk().expectBool(true)

      chain.mineEmptyBlock(block.height + 1008);

      block = chain.mineBlock([
        ede007SnapshotProposalVotingClient.conclude(contractEDP003, daisy.address),
      ]);
      block.receipts[0].result.expectOk().expectBool(false)

      assertProposal(8000, true, false, 20, 80, 9, 1017, daisy.address, contractEDP003, ede007SnapshotProposalVotingClient);
  
    }
  });

  Clarinet.test({
    name: "Ensure proposal passes if votes for greater the custom majority.",
    fn(chain: Chain, accounts: Map<string, Account>) {
      const {
        deployer, 
        exeDaoClient,
        daisy,
        phil,
        bobby,
        ward,
        hunter,
        contractEDP000,
        contractEDP004,
        ede007SnapshotProposalVotingClient,
        ede008FundedProposalSubmissionClient
      } = utils.setup(chain, accounts)

      let block = chain.mineBlock([
        exeDaoClient.construct(contractEDP000, deployer.address),
      ]);
      block.receipts[0].result.expectOk().expectBool(true)

      const majority = 8000;
      block = chain.mineBlock([
        ede008FundedProposalSubmissionClient.fund(contractEDP004, ONE_THOUSAND_STX, majority, daisy.address),
      ]);
      block.receipts[0].result.expectOk().expectBool(true)
      assertProposal(8000, false, false, 0, 0, 9, 1017, daisy.address, contractEDP004, ede007SnapshotProposalVotingClient);

      ede008FundedProposalSubmissionClient.getParameter("proposal-start-delay").result.expectOk().expectUint(6)
      ede008FundedProposalSubmissionClient.getParameter("proposal-duration").result.expectOk().expectUint(1008)

      chain.mineEmptyBlock(block.height + 6);

      block = chain.mineBlock([
        ede007SnapshotProposalVotingClient.vote(21, true, contractEDP004, daisy.address),
        ede007SnapshotProposalVotingClient.vote(20, true, contractEDP004, phil.address),
        ede007SnapshotProposalVotingClient.vote(20, true, contractEDP004, ward.address),
        ede007SnapshotProposalVotingClient.vote(20, true, contractEDP004, bobby.address),
        ede007SnapshotProposalVotingClient.vote(19, false, contractEDP004, hunter.address),
      ]);
      block.receipts[0].result.expectOk().expectBool(true)
      block.receipts[1].result.expectOk().expectBool(true)
      block.receipts[2].result.expectOk().expectBool(true)
      block.receipts[3].result.expectOk().expectBool(true)
      block.receipts[4].result.expectOk().expectBool(true)

      chain.mineEmptyBlock(block.height + 1008);

      block = chain.mineBlock([
        ede007SnapshotProposalVotingClient.conclude(contractEDP004, daisy.address),
      ]);
      block.receipts[0].result.expectOk().expectBool(true)

      assertProposal(8000, true, true, 19, 81, 9, 1017, daisy.address, contractEDP004, ede007SnapshotProposalVotingClient);
  
    }
  });