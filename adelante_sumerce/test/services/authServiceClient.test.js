const authServiceClient = require('../../src/services/authServiceClient');
const axios = require('axios');

// Mock de axios
jest.mock('axios');

describe('AuthServiceClient', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Mockear el cliente axios con métodos get y post
        authServiceClient.client = {
            get: jest.fn(),
            post: jest.fn()
        };
    });

    describe('verifyToken', () => {
        it('should verify token successfully', async () => {
            const mockResponse = {
                data: {
                    success: true,
                    data: {
                        user: {
                            id: 1,
                            email: 'test@example.com',
                            role: 'emprendedor'
                        }
                    }
                }
            };

            authServiceClient.client.get = jest.fn().mockResolvedValue(mockResponse);

            const result = await authServiceClient.verifyToken('valid-token');

            expect(result.success).toBe(true);
            expect(result.data.user.email).toBe('test@example.com');
        });

        it('should handle 401 unauthorized error', async () => {
            const mockError = {
                response: {
                    status: 401,
                    data: {
                        message: 'Token expired'
                    }
                }
            };

            authServiceClient.client.get = jest.fn().mockRejectedValue(mockError);

            await expect(authServiceClient.verifyToken('expired-token')).rejects.toMatchObject({
                statusCode: 401
            });
        });

        it('should handle network errors', async () => {
            const mockError = {
                request: {},
                message: 'connect ECONNREFUSED'
            };

            authServiceClient.client.get = jest.fn().mockRejectedValue(mockError);

            await expect(authServiceClient.verifyToken('any-token')).rejects.toMatchObject({
                statusCode: 503,
                message: expect.stringContaining('no está disponible')
            });
        });
    });

    describe('login', () => {
        it('should login successfully with valid credentials', async () => {
            const mockResponse = {
                data: {
                    success: true,
                    data: {
                        user: { id: 1, email: 'test@example.com', role: 'emprendedor' },
                        accessToken: 'access-token',
                        refreshToken: 'refresh-token'
                    }
                }
            };

            authServiceClient.client.post = jest.fn().mockResolvedValue(mockResponse);

            const result = await authServiceClient.login('test@example.com', 'password', '127.0.0.1', 'test-agent');

            expect(result.success).toBe(true);
            expect(result.data).toHaveProperty('accessToken');
            expect(result.data).toHaveProperty('refreshToken');
        });

        it('should handle invalid credentials error', async () => {
            const mockError = {
                response: {
                    status: 401,
                    data: {
                        message: 'Invalid credentials'
                    }
                }
            };

            authServiceClient.client.post = jest.fn().mockRejectedValue(mockError);

            await expect(
                authServiceClient.login('wrong@example.com', 'wrongpass', '127.0.0.1', 'test-agent')
            ).rejects.toMatchObject({
                statusCode: 401
            });
        });
    });
});
