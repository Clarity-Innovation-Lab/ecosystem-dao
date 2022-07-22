
import { Clarinet, Chain, Account } from "https://deno.land/x/clarinet@v0.31.1/index.ts";
import { EDE008CrowdfundedProposalSubmissionErrCode } from "./src/ede008-crowdfunded-proposal-submission-client.ts";
import { Utils } from "./src/utils.ts";

const utils = new Utils();

Clarinet.test({
  name: "Ensure proposal rejected if it starts too soon.",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      deployer, 
      exeDaoClient,
      phil,
      contractEDP000, 
      contractEDP003,
      contractEDE007,
      ede008CrowdfundedProposalSubmissionClient
    } = utils.setup(chain, accounts)

    let block = chain.mineBlock([
      exeDaoClient.construct(contractEDP000, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)

    const startHeight = block.height + 143
    block = chain.mineBlock([
      ede008CrowdfundedProposalSubmissionClient.propose(contractEDP003, contractEDE007, startHeight, phil.address)
    ]);
    block.receipts[0].result.expectErr().expectUint(EDE008CrowdfundedProposalSubmissionErrCode.err_proposal_minimum_start_delay)
  }
});

Clarinet.test({
  name: "Ensure proposal rejected if it ends too late.",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      deployer, 
      exeDaoClient,
      phil,
      contractEDP000, 
      contractEDP003,
      contractEDE007,
      ede008CrowdfundedProposalSubmissionClient
    } = utils.setup(chain, accounts)

    let block = chain.mineBlock([
      exeDaoClient.construct(contractEDP000, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)

    const startHeight = block.height + 2000
    block = chain.mineBlock([
      ede008CrowdfundedProposalSubmissionClient.propose(contractEDP003, contractEDE007, startHeight, phil.address)
    ]);
    block.receipts[0].result.expectErr().expectUint(EDE008CrowdfundedProposalSubmissionErrCode.err_proposal_maximum_start_delay)
  }
});

Clarinet.test({
  name: "Ensure the dao only accepts proposals with the active governance token.",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      deployer,
      exeDaoClient,
      contractEDE007,
      contractEDP000,
      contractEDP003,
      ede008CrowdfundedProposalSubmissionClient
    } = utils.setup(chain, accounts)

    let block = chain.mineBlock([
      exeDaoClient.construct(contractEDP000, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)

    const startHeight = block.height + 200
    block = chain.mineBlock([
      ede008CrowdfundedProposalSubmissionClient.propose(contractEDP003, contractEDE007, startHeight, deployer.address)
    ]);
    block.receipts[0].result.expectErr().expectUint(EDE008CrowdfundedProposalSubmissionErrCode.err_not_governance_token)
  }
});

Clarinet.test({
  name: "Ensure the dao rejects proposals from users whose governance token balance is less than propose-factor.",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      deployer,
      hunter,
      ward,
      exeDaoClient,
      contractEDE007,
      contractEDP000,
      contractEDP003,
      ede008CrowdfundedProposalSubmissionClient
    } = utils.setup(chain, accounts)

    let block = chain.mineBlock([
      exeDaoClient.construct(contractEDP000, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)

    const startHeight = block.height + 200
    block = chain.mineBlock([
      ede008CrowdfundedProposalSubmissionClient.propose(contractEDP003, contractEDE007, startHeight, ward.address),
      ede008CrowdfundedProposalSubmissionClient.propose(contractEDP003, contractEDE007, startHeight, hunter.address)
    ]);
    block.receipts[0].result.expectErr().expectUint(EDE008CrowdfundedProposalSubmissionErrCode.err_insufficient_balance)
    block.receipts[1].result.expectOk().expectBool(true)
  }
});

Clarinet.test({
  name: "Ensure initial parameter setup as bootstrapped .",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      deployer,
      exeDaoClient,
      contractEDP000,
      ede008CrowdfundedProposalSubmissionClient
    } = utils.setup(chain, accounts)

    let block = chain.mineBlock([
      exeDaoClient.construct(contractEDP000, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede008CrowdfundedProposalSubmissionClient.getParameter("some-param").result.expectErr().expectUint(EDE008CrowdfundedProposalSubmissionErrCode.err_unknown_parameter)
    ede008CrowdfundedProposalSubmissionClient.getParameter("propose-factor").result.expectOk().expectUint(100000)
    ede008CrowdfundedProposalSubmissionClient.getParameter("proposal-duration").result.expectOk().expectUint(1440)
    ede008CrowdfundedProposalSubmissionClient.getParameter("minimum-proposal-start-delay").result.expectOk().expectUint(144)
    ede008CrowdfundedProposalSubmissionClient.getParameter("maximum-proposal-start-delay").result.expectOk().expectUint(1008)
  }
});

Clarinet.test({
  name: "Ensure governance token and parameter values can be changed via a proposal.",
  fn() {
    console.log('see proposal-voting_test -> <Ensure a proposal can be voted in to e.g. change the governance token used by the dao and to change dao congiuration settings in general.>')
  }
});
