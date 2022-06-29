;; Title: EDE000 Governance Token
;; Author: Marvin Janssen
;; Depends-On: 
;; Synopsis:
;; This extension defines the governance token of ExecutorDAO.
;; Description:
;; The governance token is a simple SIP010-compliant fungible token
;; with some added functions to make it easier to manage by
;; ExecutorDAO proposals and extensions.

(impl-trait .governance-token-trait.governance-token-trait)
(impl-trait .sip010-ft-trait.sip010-ft-trait)
(impl-trait .extension-trait.extension-trait)

(define-constant err-unauthorised (err u3000))
(define-constant err-insufficient-balance-to-rescind (err u3001))
(define-constant err-rescinding-more-than-delegated (err u3002))
(define-constant err-insufficient-undelegated-tokens (err u3003))
(define-constant err-not-token-owner (err u4))

(define-fungible-token edg-token)
(define-fungible-token edg-token-locked)

(define-data-var token-name (string-ascii 32) "ExecutorDAO Governance Token")
(define-data-var token-symbol (string-ascii 10) "EDG")
(define-data-var token-uri (optional (string-utf8 256)) none)
(define-data-var token-decimals uint u6)

;; tracks total amount delegated to this user by this voter
(define-map delegation { voter: principal, proxy: principal } uint)
;; tracks total amount delegated to this user
(define-map proxy-balance principal uint)

;; --- Authorisation check

(define-public (is-dao-or-extension)
	(ok (asserts! (or (is-eq tx-sender .executor-dao) (contract-call? .executor-dao is-extension contract-caller)) err-unauthorised))
)

;; --- Internal DAO functions

;; governance-token-trait

(define-public (edg-transfer (amount uint) (sender principal) (recipient principal))
	(begin
		(try! (is-dao-or-extension))
		;; not allowed to transfer delegated tokens
		(asserts! (>= (- (ft-get-balance edg-token sender) (unwrap! (edg-get-total-delegated sender) err-insufficient-undelegated-tokens)) amount) err-insufficient-undelegated-tokens)
		(ft-transfer? edg-token amount sender recipient)
	)
)

(define-public (edg-lock (amount uint) (owner principal))
	(begin
		(try! (is-dao-or-extension))
		(try! (ft-burn? edg-token amount owner))
		(ft-mint? edg-token-locked amount owner)
	)
)

(define-public (edg-unlock (amount uint) (owner principal))
	(begin
		(try! (is-dao-or-extension))
		(try! (ft-burn? edg-token-locked amount owner))
		(ft-mint? edg-token amount owner)
	)
)

(define-public (edg-mint (amount uint) (recipient principal))
	(begin
		(try! (is-dao-or-extension))
		(ft-mint? edg-token amount recipient)
	)
)

(define-public (edg-burn (amount uint) (owner principal))
	(begin
		(try! (is-dao-or-extension))
		(ft-burn? edg-token amount owner)
		
	)
)

;; Other

(define-public (set-name (new-name (string-ascii 32)))
	(begin
		(try! (is-dao-or-extension))
		(ok (var-set token-name new-name))
	)
)

(define-public (set-symbol (new-symbol (string-ascii 10)))
	(begin
		(try! (is-dao-or-extension))
		(ok (var-set token-symbol new-symbol))
	)
)

(define-public (set-decimals (new-decimals uint))
	(begin
		(try! (is-dao-or-extension))
		(ok (var-set token-decimals new-decimals))
	)
)

(define-public (set-token-uri (new-uri (optional (string-utf8 256))))
	(begin
		(try! (is-dao-or-extension))
		(ok (var-set token-uri new-uri))
	)
)

(define-private (edg-mint-many-iter (item {amount: uint, recipient: principal}))
	(ft-mint? edg-token (get amount item) (get recipient item))
)

(define-public (edg-mint-many (recipients (list 200 {amount: uint, recipient: principal})))
	(begin
		(try! (is-dao-or-extension))
		(ok (map edg-mint-many-iter recipients))
	)
)

;; --- Public functions

;; sip010-ft-trait

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
	(begin
		(asserts! (or (is-eq tx-sender sender) (is-eq contract-caller sender)) err-not-token-owner)
		;; not allowed to transfer delegated tokens
		(asserts! (>= (- (ft-get-balance edg-token sender) (unwrap! (edg-get-total-delegated sender) err-insufficient-undelegated-tokens)) amount) err-insufficient-undelegated-tokens)
		(ft-transfer? edg-token amount sender recipient)
	)
)

(define-read-only (get-name)
	(ok (var-get token-name))
)

(define-read-only (get-symbol)
	(ok (var-get token-symbol))
)

(define-read-only (get-decimals)
	(ok (var-get token-decimals))
)

(define-read-only (get-balance (who principal))
	(ok (+ (ft-get-balance edg-token who) (ft-get-balance edg-token-locked who)))
)

(define-read-only (get-total-supply)
	(ok (+ (ft-get-supply edg-token) (ft-get-supply edg-token-locked)))
)

(define-read-only (get-token-uri)
	(ok (var-get token-uri))
)

;; governance-token-trait

(define-read-only (edg-get-balance (who principal))
	(get-balance who)
)

(define-read-only (edg-has-percentage-balance (who principal) (factor uint))
	(ok (>= (* (unwrap-panic (get-balance who)) factor) (* (unwrap-panic (get-total-supply)) u1000)))
)

(define-read-only (edg-get-locked (owner principal))
	(ok (ft-get-balance edg-token-locked owner))
)

;; --- Extension callback

(define-public (callback (sender principal) (memo (buff 34)))
	(ok true)
)

(define-public (edg-rescind (amount uint) (proxy principal))
	(let
		(
			(currently-delegating (unwrap! (edg-get-delegating tx-sender proxy) err-insufficient-balance-to-rescind))
			(balance (unwrap! (edg-get-total-delegated proxy) err-insufficient-undelegated-tokens))
			(available (min-of amount (ft-get-balance edg-token proxy)))
		)
		(asserts! (<= available currently-delegating) err-rescinding-more-than-delegated)
		(asserts! (<= available balance) err-insufficient-balance-to-rescind)
		(map-set proxy-balance proxy (- balance available))
		(map-set delegation {voter: tx-sender, proxy: proxy} (- currently-delegating available))
		(print {event: "rescind", who: tx-sender, proxy: proxy, amount: amount})
		(try! (ft-transfer? edg-token available proxy tx-sender))
		(ok available)
	)
)

(define-public (edg-delegate (amount uint) (proxy principal))
	(let
		(
			(currently-delegating (unwrap! (edg-get-delegating tx-sender proxy) err-insufficient-balance-to-rescind))
			(balance (unwrap! (edg-get-total-delegated proxy) err-insufficient-undelegated-tokens))
		)
		(map-set proxy-balance proxy (+ balance amount))
		(map-set delegation {voter: tx-sender, proxy: proxy} (+ amount currently-delegating))
		(print {event: "delegate", who: tx-sender, proxy: proxy, amount: amount})
		(try! (transfer amount tx-sender proxy none ))
		(ok true)
	)
)

(define-private (min-of (i1 uint) (i2 uint))
    (if (< i1 i2) i1 i2)
)
(define-read-only (edg-get-delegating (voter principal) (proxy principal))
	(ok (default-to u0 (map-get? delegation {voter: voter, proxy: proxy})))
)
(define-read-only (edg-get-total-delegated (proxy principal))
	(ok (default-to u0 (map-get? proxy-balance proxy)))
)