# Changelog

## 0.1.0

First version.

- Uptrack node: monitors (get many, get, create, update, pause, resume, delete) and incidents (get many, get, acknowledge, post update).
- Uptrack Trigger node: monitor down, monitor recovered, third-party status unreadable; checks the HMAC-SHA256 signature and refuses requests older than five minutes.
- Credentials: Uptrack API (API key) and Uptrack Webhook API (signing secret).
