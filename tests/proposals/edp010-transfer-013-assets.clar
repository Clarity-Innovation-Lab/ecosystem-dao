;; Title: EDP010 Treasury STX Transfer
;; Author: Mike Cohen
;; Synopsis:
;; Proposal: Unit test proposal
;; Description:
;; see unit test: Ensure the dao can make sip009 transfers.

(impl-trait .proposal-trait.proposal-trait)

(define-public (execute (sender principal))
	(begin
		(try! (contract-call? .ede006-treasury sip013-transfer u1 u25 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND (some 0x746573742064616f2073656e6420737478) .sip013-nft))
		(try! (contract-call? .ede006-treasury sip013-transfer u2 u25 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND (some 0x746573742064616f2073656e6420737478) .sip013-nft))
		(ok true)
	)
)
