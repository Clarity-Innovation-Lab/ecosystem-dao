
import { Clarinet, Chain, Account } from "https://deno.land/x/clarinet@v0.31.1/index.ts";
import { Utils } from "./src/utils.ts";

const utils = new Utils();

Clarinet.test({
  name: "Ensure proposal can be funded and can't be over funded.",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      deployer, 
      exeDaoClient,
      phil,
      daisy,
      contractEDP000, 
      contractEDP003,
      ede008FundedProposalSubmissionClient
    } = utils.setup(chain, accounts)

    let block = chain.mineBlock([
      exeDaoClient.construct(contractEDP000, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede008FundedProposalSubmissionClient.getParameter("funding-cost").result.expectOk().expectUint(1000000000)
    ede008FundedProposalSubmissionClient.getParameter("proposal-duration").result.expectOk().expectUint(1008)
    ede008FundedProposalSubmissionClient.getParameter("proposal-start-delay").result.expectOk().expectUint(6)

    block = chain.mineBlock([
      ede008FundedProposalSubmissionClient.fund(contractEDP003, 100000000, null, phil.address)
    ]);
    block.receipts[0].result.expectOk()
    ede008FundedProposalSubmissionClient.getProposalFunding(contractEDP000).result.expectUint(0)
    ede008FundedProposalSubmissionClient.getProposalFunding(contractEDP003).result.expectUint(100000000)
    ede008FundedProposalSubmissionClient.isProposalFunded(contractEDP003).result.expectBool(false)

    block = chain.mineBlock([
      ede008FundedProposalSubmissionClient.fund(contractEDP003, 1000000000, null, daisy.address)
    ]);
    block.receipts[0].result.expectOk()
    ede008FundedProposalSubmissionClient.getProposalFundingByPrincipal(contractEDP003, phil.address).result.expectUint(100000000)
    ede008FundedProposalSubmissionClient.getProposalFundingByPrincipal(contractEDP003, daisy.address).result.expectUint(900000000)
    ede008FundedProposalSubmissionClient.getProposalFunding(contractEDP003).result.expectUint(1000000000)
    ede008FundedProposalSubmissionClient.isProposalFunded(contractEDP003).result.expectBool(true)
  }
});

Clarinet.test({
  name: "Ensure bounds on setting proposal super majority.",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      deployer, 
      exeDaoClient,
      phil,
      daisy,
      contractEDP000, 
      contractEDP003,
      ede008FundedProposalSubmissionClient
    } = utils.setup(chain, accounts)

    let block = chain.mineBlock([
      exeDaoClient.construct(contractEDP000, deployer.address),
    ]);

    block = chain.mineBlock([
      ede008FundedProposalSubmissionClient.fund(contractEDP003, 100000000, 50, phil.address),
      ede008FundedProposalSubmissionClient.fund(contractEDP003, 900000000, 50, phil.address),
      ede008FundedProposalSubmissionClient.fund(contractEDP003, 900000000, 5000, phil.address),
      ede008FundedProposalSubmissionClient.fund(contractEDP003, 900000000, 5001, phil.address)
    ]);
    // super majority only matters on the fully funded tx
    block.receipts[0].result.expectOk().expectBool(false)
    block.receipts[1].result.expectErr().expectUint(3109)
    block.receipts[2].result.expectErr().expectUint(3109)
    block.receipts[3].result.expectOk().expectBool(true)
    ede008FundedProposalSubmissionClient.getProposalFunding(contractEDP003).result.expectUint(1000000000)
    ede008FundedProposalSubmissionClient.getProposalFundingByPrincipal(contractEDP003, phil.address).result.expectUint(1000000000)
    ede008FundedProposalSubmissionClient.isProposalFunded(contractEDP003).result.expectBool(true)
  }
});

