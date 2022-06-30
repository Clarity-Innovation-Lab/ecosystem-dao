import {
  Tx,
  Chain,
  Account,
  types,
  ReadOnlyFn,
} from "https://deno.land/x/clarinet@v0.28.1/index.ts";

export enum EDE006TreasuryErrCode {
  err_unauthorised=3000
}

export class EDE006TreasuryClient {
  contractName = "";
  chain: Chain;
  deployer: Account;

  constructor(chain: Chain, deployer: Account, contractName: string) {
    this.contractName = contractName;
    this.chain = chain;
    this.deployer = deployer;
  }

stxTransfer(amount: number, recipient: string, memo: string, txSender: string): Tx {
  return Tx.contractCall(
    this.contractName,
    "stx-transfer",
    [types.uint(amount), types.principal(recipient), (memo && memo.length > 0) ? types.some(types.buff(memo)) : types.none()], txSender);
}
stxTransferMany(transfers: Array<{ amount: number; recipient: string, memo: string }>, sender: string): Tx {
  return Tx.contractCall(
    this.contractName,
    "stx-transfer-many",
    [
      types.list(
        transfers.map((entry) =>
          types.tuple({
            amount: types.uint(entry.amount),
            recipient: types.principal(entry.recipient),
            memo: (entry.memo && entry.memo.length > 0) ? types.some(types.buff(entry.memo)) : types.none()
          })
        )
      ),
    ],
    sender
  );
}

sip009Transfer(tokenId: number, recipient: string, asset: string, txSender: string): Tx {
  return Tx.contractCall(
    this.contractName,
    "sip009-transfer",
    [types.uint(tokenId), types.principal(recipient), types.principal(asset)], txSender);
}

sip009TransferMany(entries: Array<{ tokenId: number; recipient: string }>, asset: string, sender: string): Tx {
  return Tx.contractCall(
    this.contractName,
    "sip009-transfer-many",
    [
      types.list(
        entries.map((entry) =>
          types.tuple({
            'token-id': types.uint(entry.tokenId),
            recipient: types.principal(entry.recipient),
          })
        )
      ),  types.principal(asset)
    ],
    sender
  );
}

sip010Transfer(amount: number, recipient: string, memo: string, asset: string, txSender: string): Tx {
  return Tx.contractCall(
    this.contractName,
    "sip010-transfer",
    [types.uint(amount), types.principal(recipient), (memo && memo.length > 0) ? types.some(types.buff(memo)) : types.none(), types.principal(asset)], txSender);
}
sip010TransferMany(transfers: Array<{ amount: number; recipient: string, memo: string }>, asset: string, sender: string): Tx {
  return Tx.contractCall(
    this.contractName,
    "sip010-transfer-many",
    [
      types.list(
        transfers.map((entry) =>
          types.tuple({
            amount: types.uint(entry.amount),
            recipient: types.principal(entry.recipient),
            memo: (entry.memo && entry.memo.length > 0) ? types.some(types.buff(entry.memo)) : types.none()
          })
        )
      ),  types.principal(asset)
    ],
    sender
  );
}

sip013Transfer(tokenId: number, amount: number, recipient: string, memo: string, asset: string, txSender: string): Tx {
  return Tx.contractCall(
    this.contractName,
    "sip013-transfer",
    [types.uint(tokenId), types.uint(amount), types.principal(recipient), (memo && memo.length > 0) ? types.some(types.buff(memo)) : types.none(), types.principal(asset)], txSender);
}
sip013TransferMany(transfers: Array<{ 'token-id': number; amount: number; sender: string; recipient: string }>, asset: string, sender: string): Tx {
  return Tx.contractCall(
    this.contractName,
    "sip013-transfer-many",
    [
      types.list(
        transfers.map((entry) =>
          types.tuple({
            'token-id': types.uint(entry['token-id']),
            amount: types.uint(entry.amount),
            sender: types.principal(entry.sender),
            recipient: types.principal(entry.recipient),
          })
        )
      ),  types.principal(asset)
    ],
    sender
  );
}
sip013TransferManyMemo(transfers: Array<{ 'token-id': number; amount: number; sender: string; recipient: string; memo: string }>, asset: string, sender: string): Tx {
  return Tx.contractCall(
    this.contractName,
    "sip013-transfer-many-memo",
    [
      types.list(
        transfers.map((entry) =>
          types.tuple({
            'token-id': types.uint(entry['token-id']),
            amount: types.uint(entry.amount),
            sender: types.principal(entry.sender),
            recipient: types.principal(entry.recipient),
            memo: (entry.memo && entry.memo.length > 0) ? types.some(types.buff(entry.memo)) : types.none()
          })
        )
      ),  types.principal(asset)
    ],
    sender
  );
}

  private callReadOnlyFn(
    method: string,
    args: Array<any> = [],
    sender: Account = this.deployer
  ): ReadOnlyFn {
    const result = this.chain.callReadOnlyFn(
      this.contractName,
      method,
      args,
      sender?.address
    );

    return result;
  }
}
