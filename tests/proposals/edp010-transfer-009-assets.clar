;; Title: EDP010 Treasury STX Transfer
;; Author: Mike Cohen
;; Synopsis:
;; Proposal: Unit test proposal
;; Description:
;; see unit test: Ensure the dao can make sip009 transfers.

(impl-trait .proposal-trait.proposal-trait)

(define-public (execute (sender principal))
	(begin
		(try! (contract-call? .ede006-treasury sip009-transfer u1 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND .sip009-nft))
		(try! (contract-call? .ede006-treasury sip009-transfer u2 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND .sip009-nft))
		(ok true)
	)
)
