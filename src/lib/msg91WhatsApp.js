import axios from 'axios';

function normalizePhoneToMsg91(phone) {
  return String(phone || '').replace('+', '').trim();
}

/**
 * MSG91 WhatsApp template send.
 * Note: WhatsApp "attachments" are template-media headers (image/document) or a link in body text.
 */
export async function sendMsg91WhatsAppTemplate({
  phone,
  message,
  mediaUrl,
}) {
  const authKey = process.env.MSG91_AUTH_KEY;
  const integratedNumber = process.env.MSG91_INTEGRATED_NUMBER;
  const templateName = process.env.MSG91_TEMPLATE_NAME || 'comman_message_user';
  const namespace = process.env.MSG91_NAMESPACE;

  if (!authKey || !integratedNumber || !namespace) {
    throw new Error('Missing MSG91 env vars: MSG91_AUTH_KEY, MSG91_INTEGRATED_NUMBER, MSG91_NAMESPACE');
  }

  const toNumber = normalizePhoneToMsg91(phone);
  if (!toNumber) {
    throw new Error('Missing phone');
  }

  const headers = {
    'Content-Type': 'application/json',
    authkey: authKey,
  };

  // Conservative payload (text-only). If you have an approved template with an image header,
  // set MSG91_TEMPLATE_HAS_MEDIA_HEADER=true to include a header component.
  const hasMediaHeader = String(process.env.MSG91_TEMPLATE_HAS_MEDIA_HEADER || '').toLowerCase() === 'true';

  const components = {
    body_1: {
      type: 'text',
      value: message || 'Hello, your ID card is ready.',
    },
  };

  if (hasMediaHeader && mediaUrl) {
    // Many WABA template APIs model header media separately; MSG91 supports header components
    // for media templates in some accounts. If your template expects a header image, this field
    // must match your template configuration.
    components.header_1 = {
      type: 'image',
      value: mediaUrl,
    };
  }

  const data = {
    integrated_number: integratedNumber,
    content_type: 'template',
    payload: {
      messaging_product: 'whatsapp',
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'en', policy: 'deterministic' },
        namespace,
        to_and_components: [
          {
            to: [toNumber],
            components,
          },
        ],
      },
    },
  };

  await axios.post(
    'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/',
    data,
    { headers }
  );
}

