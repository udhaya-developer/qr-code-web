import axios from 'axios';

let _graphTokenCache = {
  accessToken: '',
  expiresAt: 0,
};

export async function getGraphAccessToken() {
  const now = Date.now();
  if (_graphTokenCache.accessToken && now < _graphTokenCache.expiresAt) {
    return _graphTokenCache.accessToken;
  }

  const tenantId = process.env.MS_TENANT_ID;
  const clientId = process.env.MS_CLIENT_ID;
  const clientSecret = process.env.MS_CLIENT_SECRET;
  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Missing Microsoft Graph env vars: MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET');
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const params = new URLSearchParams();
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('grant_type', 'client_credentials');
  params.append('scope', 'https://graph.microsoft.com/.default');

  const response = await axios.post(tokenUrl, params);
  const { access_token, expires_in } = response.data;
  _graphTokenCache = {
    accessToken: access_token,
    expiresAt: now + (Number(expires_in) - 60) * 1000,
  };
  return access_token;
}

export async function sendGraphEmail({
  toEmail,
  name,
  subject,
  html,
  attachmentFilename,
  attachmentContentType,
  attachmentBase64,
}) {
  const senderEmail = process.env.MS_SENDER_EMAIL;
  const senderName = process.env.MS_SENDER_NAME || 'Event Team';
  if (!senderEmail) {
    throw new Error('Missing Microsoft Graph env var: MS_SENDER_EMAIL');
  }

  const accessToken = await getGraphAccessToken();
  const url = `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`;

  const emailPayload = {
    message: {
      subject: subject || `Your ID Card - ${name || ''}`.trim(),
      body: {
        contentType: 'HTML',
        content:
          html ||
          `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
              <h2>Hello ${name || 'there'}!</h2>
              <p>Your event ID card is attached with this email.</p>
              <br/>
              <p>Best regards,<br/><b>${senderName}</b></p>
            </div>
          `,
      },
      toRecipients: [
        {
          emailAddress: {
            address: toEmail,
          },
        },
      ],
      attachments: attachmentBase64
        ? [
            {
              '@odata.type': '#microsoft.graph.fileAttachment',
              name: attachmentFilename || `${String(name || 'Attendee').replace(/\s+/g, '_')}_ID.png`,
              contentType: attachmentContentType || 'image/png',
              contentBytes: attachmentBase64,
            },
          ]
        : [],
    },
  };

  await axios.post(url, emailPayload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
}

