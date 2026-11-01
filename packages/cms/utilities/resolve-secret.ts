export function resolvePayloadSecret(cloudflareEnv?: unknown, processEnv?: unknown): string {
  const cf = cloudflareEnv as { PAYLOAD_SECRET?: unknown } | null | undefined;
  const secretFromCf = typeof cf?.PAYLOAD_SECRET === 'string' ? cf.PAYLOAD_SECRET : '';
  const env = (processEnv ?? process.env) as { PAYLOAD_SECRET?: unknown } | undefined;
  const secretFromProcess = typeof env?.PAYLOAD_SECRET === 'string' ? env.PAYLOAD_SECRET : '';
  return secretFromCf || secretFromProcess || '';
}
