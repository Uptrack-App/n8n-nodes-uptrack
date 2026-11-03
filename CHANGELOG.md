# Changelog

## 0.1.1

No code change. Published from GitHub Actions with npm provenance (0.1.0 was published from a local machine to create the package).

## 0.1.0

First version.

- Uptrack node: monitors (get many, get, create, update, pause, resume, delete) and incidents (get many, get, acknowledge, post update).
- Uptrack Trigger node: monitor down, monitor recovered, third-party status unreadable; checks the HMAC-SHA256 signature and refuses requests older than five minutes.
- Credentials: Uptrack API (API key) and Uptrack Webhook API (signing secret).
- Monitor and incident IDs must be UUIDs and are URL-encoded before they enter a request path (found by a security review before the first publish).
