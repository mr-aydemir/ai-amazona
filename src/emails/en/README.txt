Email templates for English locale.

Available templates:
- order-received.html
- password-reset.html
- password-reset-success.html
- verify-email.html

Placeholders:
- {{orderId}}, {{userName}}, {{total}}, {{orderDate}}, {{orderUrl}}, {{itemsHtml}}
- {{resetUrl}}, {{userEmail}}, {{verificationUrl}}

Usage:
Use renderEmailTemplate('en', '<template>', variables) to render.