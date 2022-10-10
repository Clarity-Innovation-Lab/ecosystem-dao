;; SIP-013 SFT Contract
;; Clarity Innovation Lab
;; https://github.com/Clarity-Innovation-Lab/stx-semi-fungible-market
;; Minting contract for SIP-013
;; Main differences with SIP-009 contracts
;; a) The transfer, mint and burn functions take an amount parameter
;; b) To issue post conditions the transfer burns all of the senders tokens and then remints the balance
;; c) To issue post conditions the transfer burns all of the recipients tokens and then remints the balance
;; d) Supply of NFTs is capped at 100 per artwork therefore total supply of the fungible is 100 x COLLECTION_MAX_SUPPLY

;; (impl-trait 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.nft-trait.nft-trait)
(impl-trait .sip013-semi-fungible-token-trait.sip013-semi-fungible-token-trait)
(impl-trait .sip013-transfer-many-trait.sip013-transfer-many-trait)

;; data structures
(define-fungible-token vote-power u100000)
(define-non-fungible-token vote-token {token-id: uint, owner: principal})
(define-map token-balances {token-id: uint, owner: principal} uint)
(define-map token-supplies uint uint)

;; contract variables
(define-data-var CONTRACT_OWNER principal tx-sender)
(define-data-var ADMIN_MINT_PASS principal 'SP2DDG43477A5ZAEJJ76FSYDY2J5XQYFP9HCGS8AM)
(define-data-var token-uri (string-ascii 246) "ipfs://QmXGq4Hp2cCmmXpCoF465WDkoseUBMoSh1v8yewoDkDNqL/wru-{id}.json")
(define-data-var metadata-frozen bool false)

;; constants
(define-constant COLLECTION_MAX_SUPPLY u20)

(define-constant ERR_TOKEN_ID_TAKEN (err u100))
(define-constant ERR_METADATA_FROZEN (err u101))
(define-constant ERR_AMOUNT_REQUESTED_GREATER_THAN_BALANCE (err u102))
(define-constant ERR_PRICE_WAS_ZERO (err u104))
(define-constant ERR_NFT_NOT_LISTED_FOR_SALE (err u105))
(define-constant ERR_NFT_LISTED (err u107))
(define-constant ERR_COLLECTION_LIMIT_REACHED (err u108))
(define-constant ERR_MINT_PASS_LIMIT_REACHED (err u109))
(define-constant ERR_WRONG_COMMISSION (err u111))
(define-constant ERR_WRONG_TOKEN (err u112))
(define-constant ERR_UNKNOWN_TENDER (err u113))
(define-constant ERR_BATCH_SIZE_EXCEEDED u114)
(define-constant ERR_NOT_ADMIN_MINT_PASS (err u115))
(define-constant ERR_INSUFFICIENT_BALANCE (err u116))
(define-constant ERR_LIMIT_PER_FT_EXCEEDED (err u117))

(define-constant ERR_NOT_AUTHORIZED (err u401))
(define-constant ERR_NOT_OWNER (err u402))
(define-constant ERR_NOT_ADMINISTRATOR (err u403))
(define-constant ERR_NOT_FOUND (err u404))

(define-public (is-dao-or-extension)
	(ok (asserts! (or (is-eq tx-sender .executor-dao) (contract-call? .executor-dao is-extension contract-caller)) err-unauthorised))
)

;; SIP-013: ------------------------------------------------------------------
(define-read-only (get-balance (token-id uint) (who principal))
	(ok (get-balance-uint token-id who))
)
(define-read-only (get-overall-balance (who principal))
	(ok (ft-get-balance vote-power who))
)
(define-read-only (get-total-supply (token-id uint))
	(ok (default-to u0 (map-get? token-supplies token-id)))
)
(define-read-only (get-overall-supply)
	(ok (ft-get-supply vote-power))
)
(define-read-only (get-decimals (token-id uint))
	(ok u0)
)
(define-read-only (get-token-uri (token-id uint))
	(ok (some (var-get token-uri)))
)
(define-public (transfer (token-id uint) (amount uint) (sender principal) (recipient principal))
	(ok false)
)
(define-public (transfer-memo (token-id uint) (amount uint) (sender principal) (recipient principal) (memo (buff 34)))
	(ok false)
)
(define-public (transfer-many (transfers (list 200 {token-id: uint, amount: uint, sender: principal, recipient: principal})))
	(ok false)
)
(define-public (transfer-many-memo (transfers (list 200 {token-id: uint, amount: uint, sender: principal, recipient: principal, memo: (buff 34)})))
	(ok false)
)

;; SIP013 Helpers
(define-private (get-balance-uint (token-id uint) (who principal))
	(default-to u0 (map-get? token-balances {token-id: token-id, owner: who}))
)
;; if minting - burns the original and remints a 
(define-private (tag-nft-token-id (nft-token-id {token-id: uint, owner: principal}))
    ;; burning then minting seems counter intuitive but makes possible post conditions for semi-fungible transfers
    ;; since post conditions can't currently be hooked onto custom events.
	(begin
		(and
			(is-some (nft-get-owner? vote-token nft-token-id))
            ;; the try! is only evaluated if nft-token-id has been minted i.e. has owner - i.e. we are in the transfer flow!
            ;; nft-burn returns an error (u1) - so control will exit here if the asset identified by nft-token-id doesn't exist
			(try! (nft-burn? vote-token nft-token-id (get owner nft-token-id)))
		)
		(nft-mint? vote-token nft-token-id (get owner nft-token-id))
	)
)
(define-private (set-balance (token-id uint) (balance uint) (owner principal))
	(map-set token-balances {token-id: token-id, owner: owner} balance)
)
;; ------------------------------------------------------------------------------------------

;; -- Minting / Burning functions -----------------------------------------------------------
(define-public (burn (token-id uint) (amount uint))
    (let (
            (owner (unwrap! (nft-get-owner? vote-token {token-id: token-id, owner: contract-caller}) ERR_NOT_OWNER))
			(sender-balance (get-balance-uint token-id contract-caller))
        )
		(asserts! (<= amount sender-balance) ERR_INSUFFICIENT_BALANCE)
		(set-balance token-id (- sender-balance amount) owner)
		(map-set token-supplies token-id (- (unwrap-panic (get-total-supply token-id)) amount))
        (try! (ft-burn? vote-power amount owner))
        (and (is-eq amount sender-balance) (try! (nft-burn? vote-token {token-id: token-id, owner: owner} owner)))
		(ok token-id)
    )
)
(define-public (dao-mint (token-id uint) (amount uint) (recipient principal))
	(begin
		(try! (is-dao-or-extension))
        (asserts! (and (> token-id u0) (<= token-id COLLECTION_MAX_SUPPLY)) ERR_COLLECTION_LIMIT_REACHED)
        (asserts! (is-eq contract-caller (var-get ADMIN_MINT_PASS)) ERR_NOT_ADMIN_MINT_PASS)
		(try! (ft-mint? vote-power amount recipient))
		(try! (tag-nft-token-id {token-id: token-id, owner: recipient}))
		(set-balance token-id (+ (get-balance-uint token-id recipient) amount) recipient)
		(map-set token-supplies token-id (+ (unwrap-panic (get-total-supply token-id)) amount))
		(print {type: "sft_mint_event", token-id: token-id, amount: amount, recipient: recipient})
		(ok token-id)
	)
)
(define-public (dao-mint-many (entries (list 200 {token-id: uint, amount: uint, recipient: principal})))
    (fold check-err
        (map dao-mint-next entries)
        (ok true)
    )
)
(define-private (dao-mint-next (entry {token-id: uint, amount: uint, recipient: principal}))
    (begin
        (try! (dao-mint (get token-id entry) (get amount entry) (get recipient entry)))
        (ok true)
    )
)
;; ------------------------------------------------------------------------------------------

;; -- Admin functions --------------------------------------------------
(define-public (set-administrator (new-administrator principal))
    (begin
        (asserts! (is-eq (var-get CONTRACT_OWNER) contract-caller) ERR_NOT_ADMINISTRATOR)
        (ok (var-set CONTRACT_OWNER new-administrator))
    )
)

(define-public (set-admin-mint-pass (new-admin-mint-pass principal))
    (begin
        (asserts! (is-eq (var-get CONTRACT_OWNER) contract-caller) ERR_NOT_ADMINISTRATOR)
        (ok (var-set ADMIN_MINT_PASS new-admin-mint-pass))
    )
)

(define-public (set-token-uri (new-token-uri (string-ascii 80)))
    (begin
        (asserts! (is-eq contract-caller (var-get CONTRACT_OWNER)) ERR_NOT_ADMINISTRATOR)
        (asserts! (not (var-get metadata-frozen)) ERR_METADATA_FROZEN)
        (var-set token-uri new-token-uri)
        (ok true))
)

(define-public (freeze-metadata)
    (begin
        (asserts! (is-eq contract-caller (var-get CONTRACT_OWNER)) ERR_NOT_ADMINISTRATOR)
        (var-set metadata-frozen true)
        (ok true)
    )
)
(define-private (check-err (result (response bool uint)) (prior (response bool uint)))
    (match prior 
        ok-value result
        err-value (err err-value)
    )
)
;; ------------------------------------------------------------------------------------------