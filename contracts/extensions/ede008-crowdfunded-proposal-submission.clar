;; Title: EDE007 Crowdfunded Proposal Submission
;; Author: Mike Cohen
;; Depends-On: EDE008
;; Synopsis:
;; This extension part of the core of ExecutorDAO. It allows proposals to be submitted 
;; when supported by an amount of STX determined by parameter propose-factor.
;; Description:
;; Proposals may be submitted by anyone that holds at least n% of governance
;; tokens. Any submission is subject to a pre-defined start delay before voting
;; can begin, and will then run for a pre-defined duration. The percentage,
;; start delay, and proposal duration can all by changed by means of a future
;; proposal.
;; simple version: no attempt to refund if the proposal fails to reach the required level of support.

(impl-trait .extension-trait.extension-trait)
(use-trait proposal-trait .proposal-trait.proposal-trait)
(use-trait extension-trait .extension-trait.extension-trait)

(define-constant err-unauthorised (err u3100))
(define-constant err-insufficient-balance (err u3102))
(define-constant err-unknown-parameter (err u3103))
(define-constant err-proposal-minimum-start-delay (err u3104))
(define-constant err-proposal-maximum-start-delay (err u3105))
(define-constant err-draft-proposal-already-started (err u3106))
(define-constant err-draft-proposal-already-exists (err u3107))
(define-constant err-unknown-proposal (err u3108))
(define-constant err-voting-extension-not-valid (err u3109))

(define-map parameters (string-ascii 34) uint)

(map-set parameters "propose-factor" u100000) ;; 1% initially required to propose (100/n*1000).
(map-set parameters "proposal-duration" u1440) ;; ~10 days based on a ~10 minute block time.
(map-set parameters "minimum-proposal-start-delay" u144) ;; ~1 day minimum delay before voting on a proposal can start.
(map-set parameters "maximum-proposal-start-delay" u1008) ;; ~7 days maximum delay before voting on a proposal can start.

(define-map draft-proposals
	principal
	{
		start-block-height: uint,
		end-block-height: uint,
		proposer: principal,
		amount: uint
	}
)

;; --- Authorisation check

(define-public (is-dao-or-extension)
	(ok (asserts! (or (is-eq tx-sender .executor-dao) (contract-call? .executor-dao is-extension contract-caller)) err-unauthorised))
)

;; --- Internal DAO functions

;; Parameters

(define-public (set-parameter (parameter (string-ascii 34)) (value uint))
	(begin
		(try! (is-dao-or-extension))
		(try! (get-parameter parameter))
		(ok (map-set parameters parameter value))
	)
)

(define-private (set-parameters-iter (item {parameter: (string-ascii 34), value: uint}) (previous (response bool uint)))
	(begin
		(try! previous)
		(try! (get-parameter (get parameter item)))
		(ok (map-set parameters (get parameter item) (get value item)))
	)
)

(define-public (set-parameters (parameter-list (list 200 {parameter: (string-ascii 34), value: uint})))
	(begin
		(try! (is-dao-or-extension))
		(fold set-parameters-iter parameter-list (ok true))
	)
)

;; --- Public functions

;; Parameters

(define-read-only (get-parameter (parameter (string-ascii 34)))
	(ok (unwrap! (map-get? parameters parameter) err-unknown-parameter))
)

;; Proposals

(define-public (propose (proposal <proposal-trait>) (start-block-height uint))
	(begin
		(asserts! (>= start-block-height (+ block-height (try! (get-parameter "minimum-proposal-start-delay")))) err-proposal-minimum-start-delay)
		(asserts! (<= start-block-height (+ block-height (try! (get-parameter "maximum-proposal-start-delay")))) err-proposal-maximum-start-delay)
		(ok (asserts! (map-insert draft-proposals (contract-of proposal) 
			{ 
				start-block-height: start-block-height, 
				end-block-height: (+ start-block-height (try! (get-parameter "proposal-duration"))), 
				proposer: tx-sender,
				amount: u0
			}
		) err-draft-proposal-already-exists))
	)
)

(define-public (fund (proposal <proposal-trait>) (amount uint))
	(let
		(
			(proposal-data (unwrap! (map-get? draft-proposals (contract-of proposal)) err-unknown-proposal))
			(start-block-height (get start-block-height proposal-data))
			(new-amount (+ amount (get amount proposal-data)))
			(propose-factor (try! (get-parameter "propose-factor")))
		)
		(asserts! (< block-height (get start-block-height proposal-data)) err-draft-proposal-already-started)
		(map-set draft-proposals (contract-of proposal) (merge proposal-data {amount: new-amount}))
		(try! (stx-transfer? amount tx-sender .ede006-treasury))
		(if (>= new-amount propose-factor)
			(begin
				(map-delete draft-proposals (contract-of proposal))
				(try! (contract-call? .ede007-snapshot-proposal-voting add-proposal
					proposal
					{
						start-block-height: start-block-height,
						end-block-height: (+ start-block-height (try! (get-parameter "proposal-duration"))),
						proposer: tx-sender
					}))
			)
			true
		)
		(ok true)
	)
)

;; --- Extension callback

(define-public (callback (sender principal) (memo (buff 34)))
	(ok true)
)
