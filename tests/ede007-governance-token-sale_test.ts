
import { Clarinet, Chain, Account } from "https://deno.land/x/clarinet@v0.28.1/index.ts";
import { Utils } from "./src/utils.ts";
import { EDE007GovernanceTokenSaleErrCode } from "./src/ede007-governance-token-sale-client.ts";

const utils = new Utils();

Clarinet.test({
    name: "Ensure token sale is not a valid extension.",
    fn(chain: Chain, accounts: Map<string, Account>) {
      const {
        contractEDE006,
        exeDaoClient,
      } = utils.setup(chain, accounts);
  
      exeDaoClient.isExtension(contractEDE006).result.expectBool(false)
    }
  });
  
  Clarinet.test({
    name: "Ensure token sale is a valid extension after passing edp009-enable-treasury.",
    fn(chain: Chain, accounts: Map<string, Account>) {
      const {
        contractEDP009,
        contractEDE007,
        exeDaoClient
      } = utils.setup(chain, accounts);
  
      utils.passProposal(0, chain, accounts, contractEDP009)
      exeDaoClient.isExtension(contractEDE007).result.expectBool(true)
    }
  });

  Clarinet.test({
    name: "Check initial token sale data.",
    fn(chain: Chain, accounts: Map<string, Account>) {
      const {
        daisy,
        contractEDP009,
        contractEDE007,
        exeDaoClient,
        ede007GovernanceTokenSaleClient
      } = utils.setup(chain, accounts);
  
      utils.passProposal(0, chain, accounts, contractEDP009)
      exeDaoClient.isExtension(contractEDE007).result.expectBool(true)
      ede007GovernanceTokenSaleClient.getEndHeight().result.expectNone()
      ede007GovernanceTokenSaleClient.getStartHeight().result.expectNone()
      ede007GovernanceTokenSaleClient.getUnclaimedAllocation(daisy.address).result.expectUint(0)
      ede007GovernanceTokenSaleClient.getTotalAllocation().result.expectUint(0)
    }
  });
  Clarinet.test({
    name: "Ensure cant do anything before start.",
    fn(chain: Chain, accounts: Map<string, Account>) {
      const {
        daisy,
        contractEDP009,
        contractEDE007,
        exeDaoClient,
        ede007GovernanceTokenSaleClient
      } = utils.setup(chain, accounts);
  
      utils.passProposal(0, chain, accounts, contractEDP009)
      exeDaoClient.isExtension(contractEDE007).result.expectBool(true)

      const block = chain.mineBlock([
        ede007GovernanceTokenSaleClient.buy(1000, daisy.address),
        ede007GovernanceTokenSaleClient.refund(daisy.address),
        ede007GovernanceTokenSaleClient.claim(daisy.address),
      ]);
      block.receipts[0].result.expectErr().expectUint(EDE007GovernanceTokenSaleErrCode.err_sale_ended)
      block.receipts[1].result.expectErr().expectUint(EDE007GovernanceTokenSaleErrCode.err_sale_succeeded)
      block.receipts[2].result.expectErr().expectUint(EDE007GovernanceTokenSaleErrCode.err_nothing_to_claim)
    }
  });
  Clarinet.test({
    name: "Ensure able to buy once started but tokens are not transferred.",
    fn(chain: Chain, accounts: Map<string, Account>) {
      const {
        ward,
        contractEDP009,
        contractEDE007,
        exeDaoClient,
        ede007GovernanceTokenSaleClient,
        ede000GovernanceTokenClient
      } = utils.setup(chain, accounts);
  
      utils.passProposal(0, chain, accounts, contractEDP009)
      exeDaoClient.isExtension(contractEDE007).result.expectBool(true)

      const block = chain.mineBlock([
        ede007GovernanceTokenSaleClient.start(ward.address),
        ede007GovernanceTokenSaleClient.buy(1000, ward.address)
      ]);
      block.receipts[0].result.expectOk().expectBool(true)
      block.receipts[1].result.expectOk().expectBool(true)
      ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(0)
      ede007GovernanceTokenSaleClient.getUnclaimedAllocation(ward.address).result.expectUint(1000)
      ede007GovernanceTokenSaleClient.getTotalAllocation().result.expectUint(1000)
    }
  });
  Clarinet.test({
    name: "Ensure cant claim while sale is running.",
    fn(chain: Chain, accounts: Map<string, Account>) {
      const {
        daisy,
        contractEDP009,
        contractEDE007,
        exeDaoClient,
        ede007GovernanceTokenSaleClient
      } = utils.setup(chain, accounts);
  
      utils.passProposal(0, chain, accounts, contractEDP009)
      exeDaoClient.isExtension(contractEDE007).result.expectBool(true)

      const block = chain.mineBlock([
        ede007GovernanceTokenSaleClient.start(daisy.address),
        ede007GovernanceTokenSaleClient.buy(1000, daisy.address),
        ede007GovernanceTokenSaleClient.claim(daisy.address),
      ]);
      block.receipts[0].result.expectOk().expectBool(true)
      block.receipts[1].result.expectOk().expectBool(true)
      block.receipts[2].result.expectErr().expectUint(EDE007GovernanceTokenSaleErrCode.err_sale_not_ended)
    }
  });
  Clarinet.test({
    name: "Ensure cant get a refund after buying while sale is running.",
    fn(chain: Chain, accounts: Map<string, Account>) {
      const {
        daisy,
        ward,
        contractEDP009,
        contractEDE007,
        exeDaoClient,
        ede007GovernanceTokenSaleClient,
        ede000GovernanceTokenClient
      } = utils.setup(chain, accounts);
  
      utils.passProposal(0, chain, accounts, contractEDP009)
      exeDaoClient.isExtension(contractEDE007).result.expectBool(true)

      const block = chain.mineBlock([
        ede007GovernanceTokenSaleClient.start(daisy.address),
        ede007GovernanceTokenSaleClient.buy(1000, daisy.address),
        ede007GovernanceTokenSaleClient.refund(daisy.address)
      ]);
      block.receipts[0].result.expectOk().expectBool(true)
      block.receipts[1].result.expectOk().expectBool(true)
      block.receipts[2].result.expectErr().expectUint(EDE007GovernanceTokenSaleErrCode.err_sale_not_ended)
      ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(0)
      ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(1000)
      ede007GovernanceTokenSaleClient.getUnclaimedAllocation(ward.address).result.expectUint(0)
      ede007GovernanceTokenSaleClient.getUnclaimedAllocation(daisy.address).result.expectUint(1000)
      ede007GovernanceTokenSaleClient.getTotalAllocation().result.expectUint(1000)
    }
  });
  Clarinet.test({
    name: "Ensure can buy twice during sale period.",
    fn(chain: Chain, accounts: Map<string, Account>) {
      const {
        daisy,
        ward,
        contractEDP009,
        contractEDE007,
        exeDaoClient,
        ede007GovernanceTokenSaleClient,
        ede000GovernanceTokenClient
      } = utils.setup(chain, accounts);
  
      utils.passProposal(0, chain, accounts, contractEDP009)
      exeDaoClient.isExtension(contractEDE007).result.expectBool(true)

      const block = chain.mineBlock([
        ede007GovernanceTokenSaleClient.start(daisy.address),
        ede007GovernanceTokenSaleClient.buy(1000, daisy.address),
        ede007GovernanceTokenSaleClient.buy(1000, daisy.address),
        ede007GovernanceTokenSaleClient.buy(1000, ward.address),
        ede007GovernanceTokenSaleClient.buy(1000, ward.address),
      ]);
      block.receipts[0].result.expectOk().expectBool(true)
      block.receipts[1].result.expectOk().expectBool(true)
      block.receipts[2].result.expectOk().expectBool(true)
      block.receipts[3].result.expectOk().expectBool(true)
      block.receipts[4].result.expectOk().expectBool(true)

      ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(0)
      ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(1000)
      ede007GovernanceTokenSaleClient.getUnclaimedAllocation(ward.address).result.expectUint(2000)
      ede007GovernanceTokenSaleClient.getUnclaimedAllocation(daisy.address).result.expectUint(2000)
      ede007GovernanceTokenSaleClient.getTotalAllocation().result.expectUint(4000)
    }
  });

  Clarinet.test({
    name: "Ensure cant buy after block height reaches sale duration.",
    fn(chain: Chain, accounts: Map<string, Account>) {
      const {
        daisy,
        ward,
        contractEDP009,
        contractEDE007,
        exeDaoClient,
        ede007GovernanceTokenSaleClient,
        ede000GovernanceTokenClient
      } = utils.setup(chain, accounts);
  
      utils.passProposal(0, chain, accounts, contractEDP009)
      exeDaoClient.isExtension(contractEDE007).result.expectBool(true)

      let block = chain.mineBlock([
        ede007GovernanceTokenSaleClient.start(daisy.address),
        ede007GovernanceTokenSaleClient.buy(1000, daisy.address),
        ede007GovernanceTokenSaleClient.buy(1000, ward.address),
      ]);
      block.receipts[0].result.expectOk().expectBool(true)
      block.receipts[1].result.expectOk().expectBool(true)
      block.receipts[2].result.expectOk().expectBool(true)
      
      chain.mineEmptyBlock(1585);

      block = chain.mineBlock([
        ede007GovernanceTokenSaleClient.start(daisy.address),
        ede007GovernanceTokenSaleClient.buy(1000, daisy.address),
        ede007GovernanceTokenSaleClient.buy(1000, ward.address),
      ]);
      block.receipts[0].result.expectErr().expectUint(EDE007GovernanceTokenSaleErrCode.err_sale_already_started)
      block.receipts[1].result.expectErr().expectUint(EDE007GovernanceTokenSaleErrCode.err_sale_ended)
      block.receipts[2].result.expectErr().expectUint(EDE007GovernanceTokenSaleErrCode.err_sale_ended)

      ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(0)
      ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(1000)
      ede007GovernanceTokenSaleClient.getUnclaimedAllocation(ward.address).result.expectUint(1000)
      ede007GovernanceTokenSaleClient.getUnclaimedAllocation(daisy.address).result.expectUint(1000)
      ede007GovernanceTokenSaleClient.getTotalAllocation().result.expectUint(2000)
    }
  });
  Clarinet.test({
    name: "Ensure a buy cant exceed maximum allowed.",
    fn() {
      console.log('test requires changing the contract - this should be revisited if we give maximum-sale-value and value grater than 0')
    }
  });

  Clarinet.test({
    name: "Ensure can claim after block height reaches sale duration.",
    fn(chain: Chain, accounts: Map<string, Account>) {
      const {
        daisy,
        ward,
        contractEDP009,
        contractEDE007,
        exeDaoClient,
        ede007GovernanceTokenSaleClient,
        ede000GovernanceTokenClient
      } = utils.setup(chain, accounts);
  
      utils.passProposal(0, chain, accounts, contractEDP009)
      exeDaoClient.isExtension(contractEDE007).result.expectBool(true)

      let block = chain.mineBlock([
        ede007GovernanceTokenSaleClient.start(daisy.address),
        ede007GovernanceTokenSaleClient.buy(1000, daisy.address),
        ede007GovernanceTokenSaleClient.buy(1000, ward.address),
      ]);
      block.receipts[0].result.expectOk().expectBool(true)
      block.receipts[1].result.expectOk().expectBool(true)
      block.receipts[2].result.expectOk().expectBool(true)
      
      chain.mineEmptyBlock(1585);

      block = chain.mineBlock([
        ede007GovernanceTokenSaleClient.start(daisy.address),
        ede007GovernanceTokenSaleClient.claim(daisy.address),
        ede007GovernanceTokenSaleClient.claim(ward.address),
      ]);
      block.receipts[0].result.expectErr().expectUint(EDE007GovernanceTokenSaleErrCode.err_sale_already_started)
      block.receipts[1].result.expectOk().expectBool(true)
      block.receipts[2].result.expectOk().expectBool(true)

      ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(1000)
      ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(2000)
      ede007GovernanceTokenSaleClient.getUnclaimedAllocation(ward.address).result.expectUint(0)
      ede007GovernanceTokenSaleClient.getUnclaimedAllocation(daisy.address).result.expectUint(0)
      ede007GovernanceTokenSaleClient.getTotalAllocation().result.expectUint(2000)
    }
  });

  Clarinet.test({
    name: "Ensure can refund after block height reaches sale duration if sale is unsuccessful.",
    fn(chain: Chain, accounts: Map<string, Account>) {
      const {
        contractEDP009,
        contractEDE007,
        exeDaoClient,
      } = utils.setup(chain, accounts);
  
      utils.passProposal(0, chain, accounts, contractEDP009)
      exeDaoClient.isExtension(contractEDE007).result.expectBool(true)

      console.log('see comment on https://github.com/Clarity-Innovation-Lab/executor-dao/pull/9')
      console.log('uncomment test and set in ede007-governance-token-sale.clar')
      console.log('(define-constant minimum-sale-amount u3000) ;; Minimum number of tokens to sell for the sale to be successful.')
      
      /**
      let block = chain.mineBlock([
        ede007GovernanceTokenSaleClient.start(daisy.address),
        ede007GovernanceTokenSaleClient.buy(1000, daisy.address),
        ede007GovernanceTokenSaleClient.buy(1000, bobby.address),
        ede007GovernanceTokenSaleClient.buy(999, ward.address),
      ]);
      block.receipts[0].result.expectOk().expectBool(true)
      block.receipts[1].result.expectOk().expectBool(true)
      block.receipts[2].result.expectOk().expectBool(true)
      
      chain.mineEmptyBlock(1585);

      block = chain.mineBlock([
        ede007GovernanceTokenSaleClient.claim(daisy.address),
        ede007GovernanceTokenSaleClient.refund(daisy.address),
      ]);
      block.receipts[0].result.expectOk().expectBool(true)
      block.receipts[1].result.expectErr().expectUint(EDE007GovernanceTokenSaleErrCode.err_sale_failed)

      ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(1000)
      ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(2000)
      ede007GovernanceTokenSaleClient.getUnclaimedAllocation(ward.address).result.expectUint(0)
      ede007GovernanceTokenSaleClient.getUnclaimedAllocation(daisy.address).result.expectUint(0)
      ede007GovernanceTokenSaleClient.getTotalAllocation().result.expectUint(2000)
      **/
    }
  });

  Clarinet.test({
    name: "Ensure can claim but cant refund after block height reaches sale duration if sale is successful.",
    fn(chain: Chain, accounts: Map<string, Account>) {
      const {
        daisy,
        bobby,
        ward,
        contractEDP009,
        contractEDE007,
        exeDaoClient,
        ede007GovernanceTokenSaleClient,
        ede000GovernanceTokenClient
      } = utils.setup(chain, accounts);
  
      utils.passProposal(0, chain, accounts, contractEDP009)
      exeDaoClient.isExtension(contractEDE007).result.expectBool(true)

      let block = chain.mineBlock([
        ede007GovernanceTokenSaleClient.start(daisy.address),
        ede007GovernanceTokenSaleClient.buy(1000, daisy.address),
        ede007GovernanceTokenSaleClient.buy(1000, bobby.address),
        ede007GovernanceTokenSaleClient.buy(999, ward.address),
      ]);
      block.receipts[0].result.expectOk().expectBool(true)
      block.receipts[1].result.expectOk().expectBool(true)
      block.receipts[2].result.expectOk().expectBool(true)
      
      chain.mineEmptyBlock(1585);

      block = chain.mineBlock([
        ede007GovernanceTokenSaleClient.refund(daisy.address),
        ede007GovernanceTokenSaleClient.claim(daisy.address),
        ede007GovernanceTokenSaleClient.claim(bobby.address),
        ede007GovernanceTokenSaleClient.claim(ward.address),
      ]);
      block.receipts[0].result.expectErr().expectUint(EDE007GovernanceTokenSaleErrCode.err_sale_succeeded)
      block.receipts[1].result.expectOk().expectBool(true)
      block.receipts[2].result.expectOk().expectBool(true)
      block.receipts[2].result.expectOk().expectBool(true)

      ede000GovernanceTokenClient.edgGetBalance(ward.address).result.expectOk().expectUint(999)
      ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(2000)
      ede000GovernanceTokenClient.edgGetBalance(bobby.address).result.expectOk().expectUint(2000)
      ede007GovernanceTokenSaleClient.getUnclaimedAllocation(ward.address).result.expectUint(0)
      ede007GovernanceTokenSaleClient.getUnclaimedAllocation(daisy.address).result.expectUint(0)
      ede007GovernanceTokenSaleClient.getUnclaimedAllocation(bobby.address).result.expectUint(0)
      ede007GovernanceTokenSaleClient.getTotalAllocation().result.expectUint(2999)
    }
  });
