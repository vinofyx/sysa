@echo off
rem Local dev-only launcher for the API workspace. This machine's antivirus
rem (Avast Web Shield) TLS-intercepts outbound HTTPS traffic; Node only
rem trusts that interception when NODE_EXTRA_CA_CERTS points at Avast's own
rem root CA, which some process trees (this one, spawned by the Claude Code
rem app directly) don't inherit even though it's set at the OS level. Without
rem it, every outbound HTTPS call from this API process (Razorpay included)
rem fails TLS verification. Conditional on the cert file actually existing,
rem so this is a harmless no-op on a machine without Avast.
if exist "C:\ProgramData\Avast Software\Avast\wscert.pem" (
  set "NODE_EXTRA_CA_CERTS=C:\ProgramData\Avast Software\Avast\wscert.pem"
)
npm run dev --workspace=api
