
import { Clarinet, Chain, Account } from "https://deno.land/x/clarinet@v0.31.1/index.ts";
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
      ede008CrowdfundedProposalSubmissionClient
    } = utils.setup(chain, accounts)

    let block = chain.mineBlock([
      exeDaoClient.construct(contractEDP000, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)

    const startHeight = block.height + 143
    block = chain.mineBlock([
      ede008CrowdfundedProposalSubmissionClient.propose(contractEDP003, startHeight, phil.address)
    ]);
    //block.receipts[0].result.expectErr().expectUint(EDE008CrowdfundedProposalSubmissionErrCode.err_proposal_minimum_start_delay)
  }
});

