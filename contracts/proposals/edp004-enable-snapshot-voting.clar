;; Title: EDP004 Snapshot Voting
;; Author: Marvin Janssen, Mike Cohen
;; Synopsis:
;; This proposal enables snapshot voting with stx and a new proposal submission process.
;; Description:
;; If this proposal passes, enables two extensions;
;; EDE007 Snap shot voting allows voting based on stx balance at block height of the 
;; proposals start-block-height
;; EDE007 A mechanism that requires a levy to be paid for proposal submission. The object
;; of this is to prevent proposal spamming and filter out non-sensical proposals
;; EDE007 allows the levy to be set by the DAO and also enables crowd funding to pay the levy

(impl-trait .proposal-trait.proposal-trait)

(define-public (execute (sender principal))
	(try! (contract-call? .executor-dao set-extension .ede007-snapshot-proposal-voting true))
	(contract-call? .executor-dao set-extension .ede008-crowdfunded-proposal-submission true)
)
