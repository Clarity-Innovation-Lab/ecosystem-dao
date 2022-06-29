;; Title: EDP010 Noop
;; Author: Mike Cohen
;; Synopsis:
;; This proposal signals the outcome of a vote.
;; Description:
;; This proposal is intended for votes in the community which have no on-chain
;; impacts. For example the community can use this proposal to signal support
;; or otherwise for some action to be taken.

(impl-trait .proposal-trait.proposal-trait)


(define-public (execute (sender principal))
	(ok true)
)
