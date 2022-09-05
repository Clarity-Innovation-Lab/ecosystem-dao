;; Title: EDE007 Stacking Snapshot Proposal Voting
;; Author: Marvin Janssen
;; Depends-On: 
;; Synopsis:
;; This extension is an EcosystemDAO concept that allows all STX holders to
;; vote on proposals based on the amount they were stacking at that time.
;; Description:
;; This extension allows anyone with STX to vote on proposals. The maximum upper
;; bound, or voting power, depends on the amount of STX tokens the tx-sender
;; was stacking at the start block height of the proposal. The name "snapshot"
;; comes from the fact that the extension effectively uses the stacking amount
;; at a specific block heights to determine voting power.

(impl-trait .extension-trait.extension-trait)
(use-trait proposal-trait .proposal-trait.proposal-trait)
(use-trait governance-token-trait .governance-token-trait.governance-token-trait)

(define-constant err-unauthorised (err u3000))
(define-constant err-proposal-already-executed (err u3001))
(define-constant err-proposal-already-exists (err u3002))
(define-constant err-unknown-proposal (err u3003))
(define-constant err-proposal-already-concluded (err u3004))
(define-constant err-proposal-inactive (err u3005))
(define-constant err-insufficient-voting-capacity (err u3006))
(define-constant err-end-block-height-not-reached (err u3007))
(define-constant err-no-voting-capacity (err u3008))

(define-map proposals
	principal
	{
		votes-for: uint,
		votes-against: uint,
		start-block-height: uint,
		end-block-height: uint,
		concluded: bool,
		passed: bool,
		proposer: principal
	}
)

(define-map member-total-votes {proposal: principal, voter: principal} uint)

;; --- Authorisation check

(define-public (is-dao-or-extension)
	(ok (asserts! (or (is-eq tx-sender .executor-dao) (contract-call? .executor-dao is-extension contract-caller)) err-unauthorised))
)

;; --- Internal DAO functions

;; Proposals

(define-public (add-proposal (proposal <proposal-trait>) (data {start-block-height: uint, end-block-height: uint, proposer: principal}))
	(begin
		(try! (is-dao-or-extension))
		(asserts! (is-none (contract-call? .executor-dao executed-at proposal)) err-proposal-already-executed)
		(print {event: "propose", proposal: proposal, proposer: tx-sender})
		(ok (asserts! (map-insert proposals (contract-of proposal) (merge {votes-for: u0, votes-against: u0, concluded: false, passed: false} data)) err-proposal-already-exists))
	)
)

;; --- Public functions

;; Proposals

(define-read-only (get-proposal-data (proposal principal))
	(map-get? proposals proposal)
)

;; Votes

;; get-stacker-info returns a tuple that looks like this:
;; (some (tuple (amount-ustx uint) (first-reward-cycle uint) (lock-period uint) (pox-addr (tuple (hashbytes (buff 20)) (version (buff 1))))))

(define-read-only (get-total-vote-capacity (voter principal) (height uint))
	(at-block (unwrap! (get-block-info? id-header-hash height) none)
		(get amount-ustx (contract-call? 'SP000000000000000000002Q6VF78.pox get-stacker-info voter))
	)
)

(define-read-only (get-current-total-votes (proposal principal) (voter principal))
	(default-to u0 (map-get? member-total-votes {proposal: proposal, voter: voter}))
)

(define-public (vote (amount uint) (for bool) (proposal principal))
	(let
		(
			(proposal-data (unwrap! (map-get? proposals proposal) err-unknown-proposal))
			(new-total-votes (+ (get-current-total-votes proposal tx-sender) amount))
		)
		(asserts! (>= block-height (get start-block-height proposal-data)) err-proposal-inactive)
		(asserts! (< block-height (get end-block-height proposal-data)) err-proposal-inactive)
		(asserts!
			(<= new-total-votes (unwrap! (get-total-vote-capacity tx-sender (get start-block-height proposal-data)) err-no-voting-capacity))
			err-insufficient-voting-capacity
		)
		(map-set member-total-votes {proposal: proposal, voter: tx-sender} new-total-votes)
		(map-set proposals proposal
			(if for
				(merge proposal-data {votes-for: (+ (get votes-for proposal-data) amount)})
				(merge proposal-data {votes-against: (+ (get votes-against proposal-data) amount)})
			)
		)
		(print {event: "vote", proposal: proposal, voter: tx-sender, for: for, amount: amount})
		(ok true)
	)
)

;; Conclusion

(define-public (conclude (proposal <proposal-trait>))
	(let
		(
			(proposal-data (unwrap! (map-get? proposals (contract-of proposal)) err-unknown-proposal))
			(passed (> (get votes-for proposal-data) (get votes-against proposal-data)))
		)
		(asserts! (not (get concluded proposal-data)) err-proposal-already-concluded)
		(asserts! (>= block-height (get end-block-height proposal-data)) err-end-block-height-not-reached)
		(map-set proposals (contract-of proposal) (merge proposal-data {concluded: true, passed: passed}))
		(print {event: "conclude", proposal: proposal, passed: passed})
		(and passed (try! (contract-call? .executor-dao execute proposal tx-sender)))
		(ok passed)
	)
)

;; --- Extension callback

(define-public (callback (sender principal) (memo (buff 34)))
	(ok true)
)
