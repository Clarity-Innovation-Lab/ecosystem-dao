
import { Clarinet, Chain, Account } from "https://deno.land/x/clarinet@v0.31.1/index.ts";
import { EDE002ProposalSubmissionErrCode } from "./src/ede002-threshold-proposal-submission-client.ts";
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
      ede002ProposalSubmissionClient
    } = utils.setup(chain, accounts)

    let block = chain.mineBlock([
      exeDaoClient.construct(contractEDP000, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)

    const startHeight = block.height + 143
    block = chain.mineBlock([
      ede002ProposalSubmissionClient.propose(contractEDP003, startHeight, phil.address)
    ]);
    block.receipts[0].result.expectErr().expectUint(EDE002ProposalSubmissionErrCode.err_proposal_minimum_start_delay)
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
      ede002ProposalSubmissionClient
    } = utils.setup(chain, accounts)

    let block = chain.mineBlock([
      exeDaoClient.construct(contractEDP000, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)

    const startHeight = block.height + 2000
    block = chain.mineBlock([
      ede002ProposalSubmissionClient.propose(contractEDP003, startHeight, phil.address)
    ]);
    block.receipts[0].result.expectErr().expectUint(EDE002ProposalSubmissionErrCode.err_proposal_maximum_start_delay)
  }
});

Clarinet.test({
  name: "Ensure only the dao or an extension can set a governance token.",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      deployer,
      exeDaoClient,
      contractEDP000,
    } = utils.setup(chain, accounts)

    const block = chain.mineBlock([
      exeDaoClient.construct(contractEDP000, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
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
      contractEDP000,
      contractEDP003,
      ede002ProposalSubmissionClient
    } = utils.setup(chain, accounts)

    let block = chain.mineBlock([
      exeDaoClient.construct(contractEDP000, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)

    const startHeight = block.height + 200
    block = chain.mineBlock([
      ede002ProposalSubmissionClient.propose(contractEDP003, startHeight, ward.address),
      ede002ProposalSubmissionClient.propose(contractEDP003, startHeight, hunter.address)
    ]);
    block.receipts[0].result.expectErr().expectUint(EDE002ProposalSubmissionErrCode.err_insufficient_balance)
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
      ede002ProposalSubmissionClient
    } = utils.setup(chain, accounts)

    const block = chain.mineBlock([
      exeDaoClient.construct(contractEDP000, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede002ProposalSubmissionClient.getParameter("some-param").result.expectErr().expectUint(EDE002ProposalSubmissionErrCode.err_unknown_parameter)
    ede002ProposalSubmissionClient.getParameter("propose-factor").result.expectOk().expectUint(100000)
    ede002ProposalSubmissionClient.getParameter("proposal-duration").result.expectOk().expectUint(1440)
    ede002ProposalSubmissionClient.getParameter("minimum-proposal-start-delay").result.expectOk().expectUint(144)
    ede002ProposalSubmissionClient.getParameter("maximum-proposal-start-delay").result.expectOk().expectUint(1008)
  }
});

Clarinet.test({
  name: "Ensure governance token and parameter values can be changed via a proposal.",
  fn() {
    console.log('see proposal-voting_test -> <Ensure a proposal can be voted in to e.g. change the governance token used by the dao and to change dao congiuration settings in general.>')
  }
});
