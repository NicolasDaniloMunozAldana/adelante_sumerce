const jwtUtils = require('../../src/utils/jwtUtils');
const jwt = require('jsonwebtoken');

describe('JwtUtils', () => {
    const testPayload = {
        userId: 1,
        email: 'test@example.com',
        role: 'emprendedor'
    };

    describe('generateAccessToken', () => {
        it('should generate a valid access token', () => {
            const token = jwtUtils.generateAccessToken(testPayload);
            
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            
            // Decodificar el token para verificar el payload
            const decoded = jwt.decode(token);
            expect(decoded.userId).toBe(testPayload.userId);
            expect(decoded.email).toBe(testPayload.email);
            expect(decoded.role).toBe(testPayload.role);
            expect(decoded.iss).toBe('auth_service');
            expect(decoded.aud).toBe('adelante_sumerce');
        });

        it('should generate tokens with expiration time', () => {
            const token = jwtUtils.generateAccessToken(testPayload);
            const decoded = jwt.decode(token);
            
            expect(decoded.exp).toBeDefined();
            expect(decoded.iat).toBeDefined();
            expect(decoded.exp).toBeGreaterThan(decoded.iat);
        });
    });

    describe('verifyAccessToken', () => {
        it('should verify a valid access token', () => {
            const token = jwtUtils.generateAccessToken(testPayload);
            const verified = jwtUtils.verifyAccessToken(token);
            
            expect(verified.userId).toBe(testPayload.userId);
            expect(verified.email).toBe(testPayload.email);
            expect(verified.role).toBe(testPayload.role);
        });

        it('should throw error for invalid token', () => {
            const invalidToken = 'invalid.token.here';
            
            expect(() => {
                jwtUtils.verifyAccessToken(invalidToken);
            }).toThrow('INVALID_ACCESS_TOKEN');
        });

        it('should throw error for expired token', () => {
            // Generar un token con expiración inmediata
            const expiredToken = jwt.sign(
                testPayload,
                process.env.JWT_ACCESS_SECRET || 'your-super-secret-access-token-key',
                { expiresIn: '0s', issuer: 'auth_service', audience: 'adelante_sumerce' }
            );

            // Esperar un momento para que expire
            return new Promise((resolve) => {
                setTimeout(() => {
                    expect(() => {
                        jwtUtils.verifyAccessToken(expiredToken);
                    }).toThrow('ACCESS_TOKEN_EXPIRED');
                    resolve();
                }, 100);
            });
        });

        it('should reject token with wrong issuer', () => {
            const tokenWrongIssuer = jwt.sign(
                testPayload,
                process.env.JWT_ACCESS_SECRET || 'your-super-secret-access-token-key',
                { expiresIn: '15m', issuer: 'wrong_issuer', audience: 'adelante_sumerce' }
            );

            expect(() => {
                jwtUtils.verifyAccessToken(tokenWrongIssuer);
            }).toThrow();
        });
    });

    describe('generateRefreshToken', () => {
        it('should generate a valid refresh token', () => {
            const token = jwtUtils.generateRefreshToken(testPayload);
            
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            
            const decoded = jwt.decode(token);
            expect(decoded.userId).toBe(testPayload.userId);
            expect(decoded.email).toBe(testPayload.email);
        });

        it('should generate refresh token with longer expiration than access token', () => {
            const accessToken = jwtUtils.generateAccessToken(testPayload);
            const refreshToken = jwtUtils.generateRefreshToken(testPayload);
            
            const accessDecoded = jwt.decode(accessToken);
            const refreshDecoded = jwt.decode(refreshToken);
            
            expect(refreshDecoded.exp).toBeGreaterThan(accessDecoded.exp);
        });
    });

    describe('verifyRefreshToken', () => {
        it('should verify a valid refresh token', () => {
            const token = jwtUtils.generateRefreshToken(testPayload);
            const verified = jwtUtils.verifyRefreshToken(token);
            
            expect(verified.userId).toBe(testPayload.userId);
            expect(verified.email).toBe(testPayload.email);
        });

        it('should throw error for invalid refresh token', () => {
            expect(() => {
                jwtUtils.verifyRefreshToken('invalid.token');
            }).toThrow('INVALID_REFRESH_TOKEN');
        });
    });

    describe('calculateExpirationDate', () => {
        it('should calculate expiration date for seconds', () => {
            const now = new Date();
            const expirationDate = jwtUtils.calculateExpirationDate('30s');
            
            const diff = expirationDate.getTime() - now.getTime();
            expect(diff).toBeGreaterThanOrEqual(29000); // Al menos 29 segundos
            expect(diff).toBeLessThanOrEqual(31000); // Máximo 31 segundos
        });

        it('should calculate expiration date for minutes', () => {
            const now = new Date();
            const expirationDate = jwtUtils.calculateExpirationDate('15m');
            
            const diff = expirationDate.getTime() - now.getTime();
            expect(diff).toBeGreaterThanOrEqual(14 * 60 * 1000); // Al menos 14 minutos
            expect(diff).toBeLessThanOrEqual(16 * 60 * 1000); // Máximo 16 minutos
        });

        it('should calculate expiration date for hours', () => {
            const now = new Date();
            const expirationDate = jwtUtils.calculateExpirationDate('2h');
            
            const diff = expirationDate.getTime() - now.getTime();
            expect(diff).toBeGreaterThanOrEqual(119 * 60 * 1000);
            expect(diff).toBeLessThanOrEqual(121 * 60 * 1000);
        });

        it('should calculate expiration date for days', () => {
            const now = new Date();
            const expirationDate = jwtUtils.calculateExpirationDate('7d');
            
            const diff = expirationDate.getTime() - now.getTime();
            expect(diff).toBeGreaterThanOrEqual(6.9 * 24 * 60 * 60 * 1000);
            expect(diff).toBeLessThanOrEqual(7.1 * 24 * 60 * 60 * 1000);
        });
    });

    describe('decodeToken', () => {
        it('should decode token without verification', () => {
            const token = jwtUtils.generateAccessToken(testPayload);
            const decoded = jwtUtils.decodeToken(token);
            
            expect(decoded.userId).toBe(testPayload.userId);
            expect(decoded.email).toBe(testPayload.email);
            expect(decoded.role).toBe(testPayload.role);
        });

        it('should decode expired token without throwing error', () => {
            const expiredToken = jwt.sign(
                testPayload,
                'any-secret',
                { expiresIn: '0s' }
            );

            // decodeToken no debería lanzar error incluso si el token está expirado
            const decoded = jwtUtils.decodeToken(expiredToken);
            expect(decoded).toBeDefined();
        });
    });
});
