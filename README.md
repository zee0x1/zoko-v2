# Zoko Support Intelligence Tool

## Metrics assumption

For first-response-time calculations, a conversation-linked `FROM_STORE`
message with `senderAgentId = null` is classified as a bot response. This is
an inference from the observed test-store payloads. As a result, an outbound
message whose agent email cannot be matched to a synchronized agent can be
misclassified as a bot response.
