
import { Clarinet, Chain, Account } from "https://deno.land/x/clarinet@v0.31.1/index.ts";
import { Utils } from "./src/utils.ts";
import { EDE008FundedProposalSubmissionErrCode } from "./src/ede008-funded-proposal-submission-client.ts";

const utils = new Utils();
const ONE_THOUSAND_STX = 1000000000;
const ONE_HUNDRED_STX =  100000000;
const NINE_HUNDRED_STX =  900000000;
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
    ede008FundedProposalSubmissionClient.getParameter("funding-cost").result.expectOk().expectUint(ONE_THOUSAND_STX)
    
    // Note: tests expect proposal-duration=1008

    ede008FundedProposalSubmissionClient.getParameter("proposal-duration").result.expectOk().expectUint(1008)
    ede008FundedProposalSubmissionClient.getParameter("proposal-start-delay").result.expectOk().expectUint(6)

    block = chain.mineBlock([
      ede008FundedProposalSubmissionClient.fund(contractEDP003, ONE_HUNDRED_STX, null, phil.address)
    ]);
    block.receipts[0].result.expectOk()
    ede008FundedProposalSubmissionClient.getProposalFunding(contractEDP000).result.expectUint(0)
    ede008FundedProposalSubmissionClient.getProposalFunding(contractEDP003).result.expectUint(ONE_HUNDRED_STX)
    ede008FundedProposalSubmissionClient.isProposalFunded(contractEDP003).result.expectBool(false)

    block = chain.mineBlock([
      ede008FundedProposalSubmissionClient.fund(contractEDP003, ONE_THOUSAND_STX, null, daisy.address)
    ]);
    block.receipts[0].result.expectOk()
    ede008FundedProposalSubmissionClient.getProposalFundingByPrincipal(contractEDP003, phil.address).result.expectUint(ONE_HUNDRED_STX)
    ede008FundedProposalSubmissionClient.getProposalFundingByPrincipal(contractEDP003, daisy.address).result.expectUint(NINE_HUNDRED_STX)
    ede008FundedProposalSubmissionClient.getProposalFunding(contractEDP003).result.expectUint(ONE_THOUSAND_STX)
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
      contractEDP000, 
      contractEDP003,
      ede008FundedProposalSubmissionClient
    } = utils.setup(chain, accounts)

    let block = chain.mineBlock([
      exeDaoClient.construct(contractEDP000, deployer.address),
    ]);

    block = chain.mineBlock([
      ede008FundedProposalSubmissionClient.fund(contractEDP003, ONE_HUNDRED_STX, 50, phil.address),
      ede008FundedProposalSubmissionClient.fund(contractEDP003, NINE_HUNDRED_STX, 50, phil.address),
      ede008FundedProposalSubmissionClient.fund(contractEDP003, NINE_HUNDRED_STX, 5000, phil.address),
      ede008FundedProposalSubmissionClient.fund(contractEDP003, NINE_HUNDRED_STX, 5001, phil.address)
    ]);
    // super majority only matters on the fully funded tx
    block.receipts[0].result.expectOk().expectBool(false)
    block.receipts[1].result.expectErr().expectUint(3008)
    block.receipts[2].result.expectErr().expectUint(3008)
    block.receipts[3].result.expectOk().expectBool(true)
    ede008FundedProposalSubmissionClient.getProposalFunding(contractEDP003).result.expectUint(ONE_THOUSAND_STX)
    ede008FundedProposalSubmissionClient.getProposalFundingByPrincipal(contractEDP003, phil.address).result.expectUint(ONE_THOUSAND_STX)
    ede008FundedProposalSubmissionClient.isProposalFunded(contractEDP003).result.expectBool(true)
  }
});

Clarinet.test({
  name: "Ensure daisy can claim a refund only if the proposal is marked as refundable.",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      deployer, 
      exeDaoClient,
      daisy,
      contractEDP000, 
      contractEDP003,
      contractEDP004,
      ede008FundedProposalSubmissionClient
    } = utils.setup(chain, accounts)

    let block = chain.mineBlock([
      exeDaoClient.construct(contractEDP000, deployer.address),
    ]);

    block = chain.mineBlock([
      ede008FundedProposalSubmissionClient.fund(contractEDP003, ONE_HUNDRED_STX, null, daisy.address),
      ede008FundedProposalSubmissionClient.fund(contractEDP004, ONE_HUNDRED_STX, null, daisy.address),
    ]);
    // super majority only matters on the fully funded tx
    block.receipts[0].result.expectOk().expectBool(false)
    block.receipts[1].result.expectOk().expectBool(false)

    ede008FundedProposalSubmissionClient.canRefund(contractEDP003, daisy).result.expectBool(true)
    ede008FundedProposalSubmissionClient.canRefund(contractEDP004, daisy).result.expectBool(true)
    ede008FundedProposalSubmissionClient.getProposalFundingByPrincipal(contractEDP003, daisy.address).result.expectUint(ONE_HUNDRED_STX)
    ede008FundedProposalSubmissionClient.getProposalFundingByPrincipal(contractEDP004, daisy.address).result.expectUint(ONE_HUNDRED_STX)
  }
});

Clarinet.test({
  name: "Ensure phil can reclaim on daisy's behalf for a refundable proposal after proposal is fully funded.",
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
      ede008FundedProposalSubmissionClient.fund(contractEDP003, ONE_THOUSAND_STX, null, daisy.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)

    ede008FundedProposalSubmissionClient.canRefund(contractEDP003, daisy).result.expectBool(true)
    ede008FundedProposalSubmissionClient.getProposalFundingByPrincipal(contractEDP003, daisy.address).result.expectUint(ONE_THOUSAND_STX)

    block = chain.mineBlock([
      ede008FundedProposalSubmissionClient.refund(contractEDP003, daisy.address, phil.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede008FundedProposalSubmissionClient.getProposalFundingByPrincipal(contractEDP003, daisy.address).result.expectUint(0)
  }
});
Clarinet.test({
  name: "Ensure daisy can reclaim for a non-refundable proposal before proposal is fully funded.",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      deployer, 
      exeDaoClient,
      daisy,
      contractEDP000, 
      contractEDP004,
      ede008FundedProposalSubmissionClient
    } = utils.setup(chain, accounts)

    let block = chain.mineBlock([
      exeDaoClient.construct(contractEDP000, deployer.address),
    ]);

    block = chain.mineBlock([
      ede008FundedProposalSubmissionClient.fund(contractEDP004, ONE_HUNDRED_STX, null, daisy.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(false)

    ede008FundedProposalSubmissionClient.isProposalFunded(contractEDP004).result.expectBool(false)
    ede008FundedProposalSubmissionClient.canRefund(contractEDP004, daisy).result.expectBool(true)
    ede008FundedProposalSubmissionClient.getProposalFundingByPrincipal(contractEDP004, daisy.address).result.expectUint(ONE_HUNDRED_STX)

    block = chain.mineBlock([
      ede008FundedProposalSubmissionClient.refund(contractEDP004, daisy.address, daisy.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede008FundedProposalSubmissionClient.getProposalFundingByPrincipal(contractEDP004, daisy.address).result.expectUint(0)
  }
});
Clarinet.test({
  name: "Ensure phil can't reclaim on daisy's behalf for a non-refundable proposal after proposal is fully funded.",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      deployer, 
      exeDaoClient,
      phil,
      daisy,
      contractEDP000, 
      contractEDP004,
      ede008FundedProposalSubmissionClient
    } = utils.setup(chain, accounts)

    let block = chain.mineBlock([
      exeDaoClient.construct(contractEDP000, deployer.address),
    ]);

    block = chain.mineBlock([
      ede008FundedProposalSubmissionClient.fund(contractEDP004, ONE_THOUSAND_STX, null, daisy.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)

    ede008FundedProposalSubmissionClient.canRefund(contractEDP004, daisy).result.expectBool(false)
    ede008FundedProposalSubmissionClient.getProposalFundingByPrincipal(contractEDP004, daisy.address).result.expectUint(ONE_THOUSAND_STX)

    block = chain.mineBlock([
      ede008FundedProposalSubmissionClient.refund(contractEDP004, daisy.address, phil.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(EDE008FundedProposalSubmissionErrCode.err_refund_not_allowed)
    ede008FundedProposalSubmissionClient.getProposalFundingByPrincipal(contractEDP004, daisy.address).result.expectUint(ONE_THOUSAND_STX)
  }
});

Clarinet.test({
  name: "Ensure daisy can reclaim her funding before and after the refundable proposal is funded.",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      deployer, 
      exeDaoClient,
      daisy,
      contractEDP000, 
      contractEDP003,
      ede008FundedProposalSubmissionClient
    } = utils.setup(chain, accounts)

    let block = chain.mineBlock([
      exeDaoClient.construct(contractEDP000, deployer.address),
    ]);

    block = chain.mineBlock([
      ede008FundedProposalSubmissionClient.fund(contractEDP003, ONE_HUNDRED_STX, null, daisy.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(false)

    ede008FundedProposalSubmissionClient.canRefund(contractEDP003, daisy).result.expectBool(true)
    ede008FundedProposalSubmissionClient.getProposalFundingByPrincipal(contractEDP003, daisy.address).result.expectUint(ONE_HUNDRED_STX)

    block = chain.mineBlock([
      ede008FundedProposalSubmissionClient.refund(contractEDP003, null, daisy.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede008FundedProposalSubmissionClient.getProposalFundingByPrincipal(contractEDP003, daisy.address).result.expectUint(0)


    block = chain.mineBlock([
      ede008FundedProposalSubmissionClient.fund(contractEDP003, ONE_THOUSAND_STX, null, daisy.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede008FundedProposalSubmissionClient.isProposalFunded(contractEDP003).result.expectBool(true)
    ede008FundedProposalSubmissionClient.canRefund(contractEDP003, daisy).result.expectBool(true)
    ede008FundedProposalSubmissionClient.getProposalFundingByPrincipal(contractEDP003, daisy.address).result.expectUint(ONE_THOUSAND_STX)

    block = chain.mineBlock([
      ede008FundedProposalSubmissionClient.refund(contractEDP003, null, daisy.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    ede008FundedProposalSubmissionClient.getProposalFundingByPrincipal(contractEDP003, daisy.address).result.expectUint(0)
  }
});

