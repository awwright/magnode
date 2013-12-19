## Authentication

Like authorization, Authentication handlers have `test` functions, which are used to perform sandboxing of permissions to a credential, and probabilistic denial and risk management (for example, denying risky modifications to an account from a new location). If the credential grants the permission, then the request is passed along to an upstream authorization provider for testing, if not, then the request is denied.
