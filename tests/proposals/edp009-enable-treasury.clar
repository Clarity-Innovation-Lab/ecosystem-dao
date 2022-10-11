;; Title: EDP008 Enable Treasury
;; Author: Mike Cohen
;; Synopsis:
;; Proposal to activate the treasury.
;; Description:
;; Sets extensions: "EDE006 Treasury" and "EDE007 Governance Token Sale".

(impl-trait .proposal-trait.proposal-trait)

(define-public (execute (sender principal))
	(begin
		(try! (contract-call? .ecosystem-dao set-extension .ede006-treasury true))
		(try! (contract-call? .ecosystem-dao set-extension .ede009-governance-token-sale true))
		(ok true)
	)
)