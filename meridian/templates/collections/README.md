# Collection templates

Drop Markdown files in this folder and use **Sync templates** on the collections desk. Files here are loaded into the template list. They are not sent until `counselReviewed: true`.

Do not put real consumer data in this folder. The repository is public.

```md
---
id: example-limited-voicemail
channel: voicemail
name: Limited-content example
counselReviewed: false
limitedContent: true
---
This is a placeholder, not a script to send. Counsel must replace it with a Reg F limited-content message.
```

`channel` is one of `letter`, `email`, `sms`, `voice`, `voicemail`, `validation`, `chat`.
