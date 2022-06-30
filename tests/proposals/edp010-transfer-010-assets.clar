;; Title: EDP010 Treasury STX Transfer
;; Author: Mike Cohen
;; Synopsis:
;; Proposal: Unit test proposal
;; Description:
;; see unit test: Ensure the dao can make sip009 transfers.

(impl-trait .proposal-trait.proposal-trait)

(define-public (execute (sender principal))
	(begin
		(try! (contract-call? .ede006-treasury sip010-transfer u100 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND (some 0x746573742064616f2073656e6420737478) .ede000-governance-token))
		(try! (contract-call? .ede006-treasury sip010-transfer u100 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND (some 0x746573742064616f2073656e6420737478) .ede000-governance-token))
		(ok true)
	)
)
