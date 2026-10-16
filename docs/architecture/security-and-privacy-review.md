# Security and privacy review

This is an index. Read in order:
1. `../SECURITY_REVIEW.md`: controls for authentication, authorisation, input, payments, privacy and audit.
2. `../security/THREAT_MODEL.md`: threats and controls including the case simulator, support and assistant.
3. `../security/SECURITY_REVIEW.md`: defects found and fixed in the latest round, and checks run.

## Privacy summary
- **Synthetic data only.** Cases, library and lessons use fictional payers, providers and accounts; authoring screens refuse identifier-like content.
- **Minimisation.** Support and assistant text is masked for identifiers before storage; external AI receives no personal records.
- **Retention.** Support transcripts deleted after the configured period after closure (default 730 days); assistant conversations after 90 days of inactivity; users can delete their own assistant conversations.
- **Rights.** Learners request access, correction or deletion from Account; staff handle requests under `subscriber.privacy`.
- **No compliance claims.** Nothing in the product claims HIPAA, PCI or legal compliance.
