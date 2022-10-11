;; Title: EDP000 Bootstrap Minimal
;; Author: Marvin Janssen, Mike Cohen
;; Synopsis:
;; Boot proposal that sets the startup DAO configuration and extensions.
;; Description:
;; Enables the the following extensions;
;; "EDE004 Emergency Execute", "EDE006 Treasury". These represent the minimal conditions
;; for collective decision making on further development and evolution of the DAO.

(impl-trait .proposal-trait.proposal-trait)

(define-public (execute (sender principal))
	(begin
		;; Enable genesis extensions.
		(try! (contract-call? .ecosystem-dao set-extensions
			(list
				{extension: .ede004-emergency-execute, enabled: true}
				{extension: .ede006-treasury, enabled: true}
			)
		))
		;; Set executive team members.
		(try! (contract-call? .ede004-emergency-execute set-executive-team-member 'ST167Z6WFHMV0FZKFCRNWZ33WTB0DFBCW9M1FW3AY true))
		(try! (contract-call? .ede004-emergency-execute set-executive-team-member 'STDBEG5X8XD50SPM1JJH0E5CTXGDV5NJTJTTH7YB true))
		(try! (contract-call? .ede004-emergency-execute set-executive-team-member 'ST3CK642B6119EVC6CT550PW5EZZ1AJW6608HK60A true))
		(try! (contract-call? .ede004-emergency-execute set-signals-required u2)) ;; signal from 2 out of 3 team members required.

		(print "EcosystemDAO has risen.")
		(ok true)
	)
)
