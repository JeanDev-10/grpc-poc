import jwt from 'jsonwebtoken';

// Solo para la PoC: en producción el secreto viene de un gestor de secretos (o se usan
// claves asimétricas RS256/ES256 verificando contra un JWKS).
export const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-only-secret-change-me';

// Se fija el algoritmo al verificar: aceptar el que diga el header del token permite
// ataques de confusión de algoritmo (`alg: none`, RS256 -> HS256).
const ALGORITHM = 'HS256';

export interface Claims {
  sub: string;
  /** Scopes separados por espacio, como en OAuth2. */
  scope: string;
}

export function signToken(claims: Claims, secret = JWT_SECRET, expiresInSeconds = 600): string {
  return jwt.sign(claims, secret, { algorithm: ALGORITHM, expiresIn: expiresInSeconds });
}

/** Lanza si la firma, el algoritmo o la expiración no son válidos. */
export function verifyToken(token: string, secret = JWT_SECRET): Claims {
  const payload = jwt.verify(token, secret, { algorithms: [ALGORITHM] }) as jwt.JwtPayload;
  if (typeof payload.sub !== 'string') throw new Error('token sin sub');
  return { sub: payload.sub, scope: typeof payload.scope === 'string' ? payload.scope : '' };
}

/** Token de servicio con caché: se renueva cuando le queda menos de la mitad de vida. */
export function serviceTokenProvider(claims: Claims, secret = JWT_SECRET, ttlSeconds = 600): () => string {
  let token = '';
  let renewAt = 0;
  return () => {
    if (Date.now() >= renewAt) {
      token = signToken(claims, secret, ttlSeconds);
      renewAt = Date.now() + (ttlSeconds * 1000) / 2;
    }
    return token;
  };
}
