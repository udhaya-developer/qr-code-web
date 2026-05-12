/**
 * Maps Mongo driver / Mongoose errors to short, safe hints (no secrets).
 * Used by template upload and /api/health/mongo.
 */
export function mongoFailureHint(err) {
  const raw = String(err?.message || err || '');
  const m = raw.toLowerCase();
  const code = typeof err?.code === 'number' ? err.code : null;

  if (m.includes('mongodb_uri') || m.includes('define the mongodb')) {
    return 'MONGODB_URI is missing on this server — set it in the host environment and redeploy.';
  }
  if (m.includes('authentication failed') || m.includes('bad auth')) {
    return 'MongoDB rejected the credentials — check user/password in MONGODB_URI.';
  }
  if (
    code === 13 ||
    m.includes('not authorized') ||
    m.includes('unauthorized to') ||
    m.includes('requires authentication')
  ) {
    return 'MongoDB refused this operation. In Atlas → Database Access, assign built-in role readWrite on the database named in your URI (e.g. .../qrcodes). Ping alone does not prove write access.';
  }
  if (m.includes('ip') && (m.includes('whitelist') || m.includes('not allowed'))) {
    return 'Atlas Network Access blocked this host — add its outbound IP (or 0.0.0.0/0 while testing).';
  }
  if (m.includes('econnrefused') || m.includes('enotfound') || m.includes('etimedout') || m.includes('getaddrinfo')) {
    return 'Could not reach the cluster host — check MONGODB_URI and DNS.';
  }
  if (m.includes('buffering timed out') || m.includes('server selection')) {
    return 'Server selection timed out — often Atlas IP whitelist or wrong SRV hostname.';
  }
  if (m.includes('e11000') || m.includes('duplicate key')) {
    return 'Duplicate key on idcardtemplateassets — often two rows for the same profile, or a unique index on `key` with multiple rows missing `key`. Redeploy the latest app (each row now sets a unique slot key), or remove extra indexes/duplicate rows in Compass.';
  }
  if (code === 10334 || m.includes('too large') || (m.includes('bson') && m.includes('size')) || m.includes('maximum size')) {
    return 'Document or payload too large for MongoDB (~16MB per document) — use a smaller image.';
  }
  if (raw.trim()) {
    return 'See server logs for the full error on the line after the Mongo operation warning.';
  }
  return 'Check MONGODB_URI and Atlas Database Access + Network Access.';
}
