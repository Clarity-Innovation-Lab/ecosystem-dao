
import { Tx, Clarinet, Chain, Account } from "https://deno.land/x/clarinet@v0.28.1/index.ts";
import { Utils } from "./src/utils.ts";
import { EDE006TreasuryErrCode } from "./src/ede006-treasury-client.ts";
import { assert } from "https://deno.land/std@0.90.0/testing/asserts.ts";

const utils = new Utils();

Clarinet.test({
  name: "Ensure treasury is not a valid extension.",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      contractEDE006,
      exeDaoClient,
    } = utils.setup(chain, accounts);

    exeDaoClient.isExtension(contractEDE006).result.expectBool(false)
  }
});

Clarinet.test({
  name: "Ensure treasury is a valid extension after passing edp009-enable-treasury.",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      contractEDP009,
      contractEDE006,
      exeDaoClient,
    } = utils.setup(chain, accounts);

    utils.passProposal(0, chain, accounts, contractEDP009)
    exeDaoClient.isExtension(contractEDE006).result.expectBool(true)
  }
});

// --- stx ----------------------------------------------------------------------------------
Clarinet.test({
  name: "Ensure the dao deployer cannot do stx transfers.",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      deployer,
      phil,
      daisy,
      bobby,
      contractEDP009,
      ede006TreasuryClient
    } = utils.setup(chain, accounts);

    let block = utils.passProposal(0, chain, accounts, contractEDP009)
    const transfers = [
      { amount: 100, recipient: phil.address, memo: 'random memo'},
      { amount: 100, recipient: daisy.address, memo: 'random memo'},
      { amount: 100, recipient: bobby.address, memo: 'random memo'}
    ]
    block = chain.mineBlock([
      ede006TreasuryClient.stxTransfer(100, daisy.address, 'I claim the funds', deployer.address),
      ede006TreasuryClient.stxTransferMany(transfers, deployer.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(EDE006TreasuryErrCode.err_unauthorised)
    block.receipts[1].result.expectErr().expectUint(EDE006TreasuryErrCode.err_unauthorised)
  }
});

Clarinet.test({
  name: "Ensure the dao can make stx transfers.",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      daisy,
      contractEDE006,
      contractEDP009,
      contractEDP010
    } = utils.setup(chain, accounts);

    let block = utils.passProposal(0, chain, accounts, contractEDP009)

    block = chain.mineBlock([
      Tx.transferSTX(100000000, contractEDE006, daisy.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true)

    block = utils.passProposal(block.height, chain, accounts, contractEDP010)
    block.receipts[0].result.expectOk().expectBool(true)
  }
});

// --- sip009 ----------------------------------------------------------------------------------
Clarinet.test({
  name: "Ensure the dao deployer and nft owners cannot transfer sip009 assets using the dao.",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      deployer,
      phil,
      daisy,
      bobby,
      contractNft,
      contractEDP009,
      nftClient,
      ede006TreasuryClient
    } = utils.setup(chain, accounts);

    let block = utils.passProposal(0, chain, accounts, contractEDP009)

    block = chain.mineBlock([
      nftClient.mint(daisy.address, deployer.address),
      nftClient.mint(bobby.address, deployer.address)
    ]);
    block.receipts[0].result.expectOk().expectUint(1)
    block.receipts[1].result.expectOk().expectUint(2)
    nftClient.getOwner(1).result.expectOk().expectSome().expectPrincipal(daisy.address)
    nftClient.getOwner(2).result.expectOk().expectSome().expectPrincipal(bobby.address)

    const transfers = [
      { tokenId: 1, recipient: phil.address },
      { tokenId: 2, recipient: bobby.address }
    ]
    block = chain.mineBlock([
      ede006TreasuryClient.sip009Transfer(1, bobby.address, contractNft, deployer.address),
      ede006TreasuryClient.sip009Transfer(1, bobby.address, contractNft, daisy.address),
      ede006TreasuryClient.sip009TransferMany(transfers, contractNft, deployer.address),
      ede006TreasuryClient.sip009TransferMany(transfers, contractNft, daisy.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(EDE006TreasuryErrCode.err_unauthorised)
    block.receipts[1].result.expectErr().expectUint(EDE006TreasuryErrCode.err_unauthorised)
    assert(typeof(block.receipts[2]) === 'undefined')
    assert(typeof(block.receipts[3]) === 'undefined')
  }
});
Clarinet.test({
  name: "Ensure the dao can make sip009 transfers.",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      deployer,
      daisy,
      bobby,
      hunter,
      contractEDE006,
      contractEDP009,
      contractEDP011,
      nftClient
    } = utils.setup(chain, accounts);

    // -- preamble - run dao, mint some nfts send them to the nft contract ------
    let block = utils.passProposal(0, chain, accounts, contractEDP009)
    block = chain.mineBlock([
      nftClient.mint(daisy.address, deployer.address),
      nftClient.mint(bobby.address, deployer.address),
      nftClient.transfer(1, daisy.address, contractEDE006, daisy.address),
      nftClient.transfer(2, bobby.address, contractEDE006, bobby.address)
    ]);
    block.receipts[0].result.expectOk().expectUint(1)
    block.receipts[1].result.expectOk().expectUint(2)
    block.receipts[2].result.expectOk().expectBool(true)
    block.receipts[3].result.expectOk().expectBool(true)
    nftClient.getOwner(1).result.expectOk().expectSome().expectPrincipal(contractEDE006)
    nftClient.getOwner(2).result.expectOk().expectSome().expectPrincipal(contractEDE006)

    // -- body - run the proposal and check the DAO transfers the two nfts to Hunter ------

    block = utils.passProposal(block.height, chain, accounts, contractEDP011)
    block.receipts[0].result.expectOk().expectBool(true)
    nftClient.getOwner(1).result.expectOk().expectSome().expectPrincipal(hunter.address)
    nftClient.getOwner(2).result.expectOk().expectSome().expectPrincipal(hunter.address)
  }
});

// --- sip010 ----------------------------------------------------------------------------------
Clarinet.test({
  name: "Ensure the dao deployer and sip010 owners cannot do sip010 transfers through the dao.",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      deployer,
      phil,
      daisy,
      bobby,
      contractEDE000,
      contractEDP009,
      ede000GovernanceTokenClient,
      ede006TreasuryClient
    } = utils.setup(chain, accounts);

    let block = utils.passProposal(0, chain, accounts, contractEDP009)

    ede000GovernanceTokenClient.edgGetBalance(bobby.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(1000)

    const transfers = [
      { amount: 100, recipient: phil.address, memo: 'random memo'},
      { amount: 100, recipient: daisy.address, memo: 'random memo'},
      { amount: 100, recipient: bobby.address, memo: 'random memo'}
    ]
    block = chain.mineBlock([
      ede006TreasuryClient.sip010Transfer(1, bobby.address, 'send now', contractEDE000, deployer.address),
      ede006TreasuryClient.sip010Transfer(1, daisy.address, 'send now', contractEDE000, bobby.address),
      ede006TreasuryClient.sip010TransferMany(transfers, contractEDE000, deployer.address),
      ede006TreasuryClient.sip010TransferMany(transfers, contractEDE000, daisy.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(EDE006TreasuryErrCode.err_unauthorised)
    block.receipts[1].result.expectErr().expectUint(EDE006TreasuryErrCode.err_unauthorised)
    assert(typeof(block.receipts[2]) === 'undefined')
    assert(typeof(block.receipts[3]) === 'undefined')
  }
});
Clarinet.test({
  name: "Ensure the dao can make sip010 transfers.",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      phil,
      daisy,
      hunter,
      contractEDE006, // treasury contract
      contractEDP009, // enables treasury
      contractEDP012, // transfers 010
      ede000GovernanceTokenClient
    } = utils.setup(chain, accounts);

    let block = utils.passProposal(0, chain, accounts, contractEDP009)
    block.receipts[0].result.expectOk().expectBool(true)

    ede000GovernanceTokenClient.edgGetBalance(phil.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(1000)
    ede000GovernanceTokenClient.edgGetBalance(contractEDE006).result.expectOk().expectUint(0)
    ede000GovernanceTokenClient.edgGetBalance(hunter.address).result.expectOk().expectUint(1000)

    block = chain.mineBlock([
      ede000GovernanceTokenClient.transfer(200, phil.address, contractEDE006, 'send now', phil.address),
      ede000GovernanceTokenClient.transfer(200, daisy.address, contractEDE006, 'send now', daisy.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    block.receipts[1].result.expectOk().expectBool(true)
    ede000GovernanceTokenClient.edgGetBalance(contractEDE006).result.expectOk().expectUint(400)

    // -- body - run the proposal and check the DAO transfers the two nfts to Hunter ------

    block = utils.passProposal(block.height, chain, accounts, contractEDP012)
    block.receipts[0].result.expectOk().expectBool(true)

    ede000GovernanceTokenClient.edgGetBalance(hunter.address).result.expectOk().expectUint(1200)
    ede000GovernanceTokenClient.edgGetBalance(phil.address).result.expectOk().expectUint(800)
    ede000GovernanceTokenClient.edgGetBalance(daisy.address).result.expectOk().expectUint(800)
    ede000GovernanceTokenClient.edgGetBalance(contractEDE006).result.expectOk().expectUint(200)
  }
});

// --- sip013 ----------------------------------------------------------------------------------
Clarinet.test({
  name: "Ensure the dao deployer and nft owners cannot do sip013 transfers through the dao.",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const {
      deployer,
      hunter,
      daisy,
      bobby,
      contractEDE006,
      contractEDP009,
      contractEDP013,
      sftClient
    } = utils.setup(chain, accounts);

    // -- preamble - run dao, mint some nfts send them to the nft contract ------
    let block = utils.passProposal(0, chain, accounts, contractEDP009)
    block = chain.mineBlock([
      sftClient.mint(1, 100, daisy.address, deployer.address),
      sftClient.mint(2, 100, bobby.address, deployer.address),
      sftClient.transfer(1, 50, daisy.address, contractEDE006, daisy.address),
      sftClient.transfer(2, 50, bobby.address, contractEDE006, bobby.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true)
    block.receipts[1].result.expectOk().expectBool(true)
    block.receipts[2].result.expectOk().expectBool(true)
    block.receipts[3].result.expectOk().expectBool(true)
    sftClient.getBalance(1, daisy.address).result.expectOk().expectUint(50);
    sftClient.getBalance(1, contractEDE006).result.expectOk().expectUint(50);
    sftClient.getBalance(2, bobby.address).result.expectOk().expectUint(50);
    sftClient.getBalance(2, contractEDE006).result.expectOk().expectUint(50);


    block = utils.passProposal(block.height, chain, accounts, contractEDP013)
    block.receipts[0].result.expectOk().expectBool(true)
    sftClient.getBalance(1, daisy.address).result.expectOk().expectUint(50);
    sftClient.getBalance(1, contractEDE006).result.expectOk().expectUint(25);
    sftClient.getBalance(1, hunter.address).result.expectOk().expectUint(25);
    sftClient.getBalance(2, bobby.address).result.expectOk().expectUint(50);
    sftClient.getBalance(2, contractEDE006).result.expectOk().expectUint(25);
    sftClient.getBalance(2, hunter.address).result.expectOk().expectUint(25);
  }
});
