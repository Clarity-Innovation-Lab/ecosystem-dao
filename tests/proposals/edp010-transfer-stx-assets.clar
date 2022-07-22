;; Title: EDP010 Treasury STX Transfer
;; Author: Mike Cohen
;; Synopsis:
;; Proposal: Unit test proposal
;; Description:
;; see unit test: Ensure the dao can make stx transfers.

(impl-trait .proposal-trait.proposal-trait)

(define-public (execute (sender principal))
	(begin
		(try! (contract-call? .ede006-treasury stx-transfer u500 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG (some 0x746573742064616f2073656e6420737478)))
		(ok true)
	)
)
