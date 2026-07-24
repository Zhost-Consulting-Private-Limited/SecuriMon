import jwt from 'jsonwebtoken';

const LEGACY_INSECURE_DEFAULT = 'vigilon-super-secret-key-change-in-prod';

const secret = process.env.JWT_SECRET;
if (!secret || secret === LEGACY_INSECURE_DEFAULT) {
  throw new Error(
    'JWT_SECRET is not set (or is set to the old insecure default). Refusing to start. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))" ' +
      'and set it in your .env file.'
  );
}

export const JWT_SECRET: string = secret;
export const JWT_EXPIRES_IN = '1d';

export interface TokenPayload {
  id: string;
  tenantId: string;
  role: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256', expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as TokenPayload;
}
