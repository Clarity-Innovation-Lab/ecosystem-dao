;; Title: EDP000 Bootstrap
;; Author: Clarity Lab
;; Synopsis:
;; Bootstrap proposal that sets up the minimal extensions
;; and executive team.
;; Description:
;; Activates emergency execute, treasury, snapshot voting
;; and proposal sbmission extensions.

(impl-trait .proposal-trait.proposal-trait)

(define-public (execute (sender principal))
	(begin
		;; Enable genesis extensions.
		(try! (contract-call? .executor-dao set-extensions
			(list
				{extension: .ede004-emergency-execute, enabled: true}
				{extension: .ede006-treasury, enabled: true}
				{extension: .ede007-snapshot-proposal-voting-v2, enabled: true}
				{extension: .ede008-funded-proposal-submission-v2, enabled: true}
			)
		))

		;; Set executive team members.
		(try! (contract-call? .ede004-emergency-execute set-executive-team-member 'SP167Z6WFHMV0FZKFCRNWZ33WTB0DFBCW9QRVJ627 true))
		(try! (contract-call? .ede004-emergency-execute set-executive-team-member 'SPND1YC648T2SDW26NACCB8GAY8KSZJPNBS26GFD true))
		(try! (contract-call? .ede004-emergency-execute set-executive-team-member 'marvin.btc? true))

		;; Set executive team signals required and sunset period.
		(try! (contract-call? .ede004-emergency-execute set-signals-required u2)) ;; signal from 2 out of 3 team members required.
		(try! (contract-call? .ede004-emergency-execute set-executive-team-sunset-height u13140)) ;; 3 months time.

		(print "EcosystemDAO has risen.")
		(ok true)
	)
)
