
import { Clarinet, Chain, Account } from "https://deno.land/x/clarinet@v0.31.1/index.ts";
import { EDE000GovernanceTokenErrCode } from "./src/ede000-governance-token-client.ts";
import { Utils } from "./src/utils.ts";

const utils = new Utils();

Clarinet.test({
    name: "Ensure transfer lock can't be changed by deployer.",
    fn(chain: Chain, accounts: Map<string, Account>) {
      const {
        deployer, 
        exeDaoClient,
        bobby,
        contractEDP000, 
        ede000GovernanceTokenClient
      } = utils.setup(chain, accounts)
  
      const block = chain.mineBlock([
        exeDaoClient.construct(contractEDP000, deployer.address),
        ede000GovernanceTokenClient.setTransferLock(true, bobby.address)
      ]);
      block.receipts[0].result.expectOk().expectBool(true)
      block.receipts[1].result.expectErr().expectUint(EDE000GovernanceTokenErrCode.err_unauthorised)
    }
});
  
Clarinet.test({
  name: "Ensure members can't transfer edg if token is locked",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const { contractEDE000, contractEDP000_1, bobby, daisy, ede000GovernanceTokenClient, ede001ProposalVotingClient } = utils.setup(chain, accounts)
    utils.passProposal(0, chain, accounts, contractEDP000_1)
    let block = chain.mineBlock([
      ede001ProposalVotingClient.reclaimVotes(contractEDP000_1, contractEDE000, bobby.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede000GovernanceTokenClient.edgGetBalance(bobby.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetLocked(bobby.address).result.expectOk().expectUint(0)

    block = chain.mineBlock([
      ede000GovernanceTokenClient.transfer(100, bobby.address, daisy.address, "for new batons", bobby.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(EDE000GovernanceTokenErrCode.err_transfer_is_locked)

  }
});

Clarinet.test({
  name: "Ensure dao can't transfer edg if token is locked",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const { contractEDE000, contractEDP000_3, contractEDP000_1, bobby, ede000GovernanceTokenClient, ede001ProposalVotingClient } = utils.setup(chain, accounts)

    let block = utils.passProposal(0, chain, accounts, contractEDP000_1)
    ede000GovernanceTokenClient.edgGetBalance(bobby.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetLocked(bobby.address).result.expectOk().expectUint(500)

    // proposal to do an edg-transfer - should fail.
    block = utils.passProposal(block.height, chain, accounts, contractEDP000_3)
    // see issue https://github.com/Clarity-Innovation-Lab/executor-dao/issues/4
    // block.receipts[0].result.expectErr().expectUint(EDE000GovernanceTokenErrCode.err_transfer_is_locked)
    block.receipts[0].result.expectOk().expectBool(false)

    ede000GovernanceTokenClient.edgGetBalance(bobby.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetLocked(bobby.address).result.expectOk().expectUint(1000)
    block = chain.mineBlock([
      ede001ProposalVotingClient.reclaimVotes(contractEDP000_1, contractEDE000, bobby.address),
      ede001ProposalVotingClient.reclaimVotes(contractEDP000_3, contractEDE000, bobby.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    block.receipts[1].result.expectOk().expectBool(true)
    // block.receipts[1].result.expectErr().expectUint(EDE001ProposalVotingErrCode.err_proposal_not_concluded)
  }
});

Clarinet.test({
  name: "Ensure dao can transfer edg if token is unlocked after being locked",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const { contractEDE000, contractEDP000_2, contractEDP000_3, contractEDP000_1, bobby, daisy, ede000GovernanceTokenClient, ede001ProposalVotingClient } = utils.setup(chain, accounts)

    let block = utils.passProposal(0, chain, accounts, contractEDP000_1)
    ede000GovernanceTokenClient.edgGetBalance(bobby.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetLocked(bobby.address).result.expectOk().expectUint(500)

    // proposal to do an edg-transfer - should fail.
    block = utils.passProposal(block.height, chain, accounts, contractEDP000_3)
    block.receipts[0].result.expectOk().expectBool(false)

    ede000GovernanceTokenClient.edgGetBalance(bobby.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetLocked(bobby.address).result.expectOk().expectUint(1000)
    block = chain.mineBlock([
      ede001ProposalVotingClient.reclaimVotes(contractEDP000_1, contractEDE000, bobby.address),
      ede001ProposalVotingClient.reclaimVotes(contractEDP000_3, contractEDE000, bobby.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    block.receipts[0].result.expectOk().expectBool(true)
    ede000GovernanceTokenClient.edgGetBalance(bobby.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetLocked(bobby.address).result.expectOk().expectUint(0)

    block = chain.mineBlock([
      ede000GovernanceTokenClient.transfer(100, bobby.address, daisy.address, "for new batons", bobby.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(EDE000GovernanceTokenErrCode.err_transfer_is_locked)
    ede000GovernanceTokenClient.edgGetBalance(bobby.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetLocked(bobby.address).result.expectOk().expectUint(0)

    block = utils.passProposal(block.height, chain, accounts, contractEDP000_2)
    block.receipts[0].result.expectOk().expectBool(true)

    block = chain.mineBlock([
      ede001ProposalVotingClient.reclaimVotes(contractEDP000_2, contractEDE000, bobby.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)

    ede000GovernanceTokenClient.edgGetBalance(bobby.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetLocked(bobby.address).result.expectOk().expectUint(0)

    block = chain.mineBlock([
      ede000GovernanceTokenClient.transfer(100, bobby.address, daisy.address, "for new batons", bobby.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede000GovernanceTokenClient.edgGetBalance(bobby.address).result.expectOk().expectUint(900)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(1100)
  }
});
