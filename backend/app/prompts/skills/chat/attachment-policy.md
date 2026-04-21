Attachment policy for chat v1:

- Attachments are message-owned (`message_id`) and tied to the current turn.
- Only validated, same-org, same-user attachments can be used.
- Never leak attachment metadata from other users or organizations.
- If attachment context is insufficient, explicitly ask the user for clarification.
