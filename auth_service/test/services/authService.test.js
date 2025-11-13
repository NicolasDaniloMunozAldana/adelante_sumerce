const authService = require('../../src/services/authService');
const userRepository = require('../../src/repositories/UserRepository');
const refreshTokenRepository = require('../../src/repositories/RefreshTokenRepository');
const bcrypt = require('bcryptjs');
const jwtUtils = require('../../src/utils/jwtUtils');

// Mock de las dependencias
jest.mock('../../src/repositories/UserRepository');
jest.mock('../../src/repositories/RefreshTokenRepository');
jest.mock('bcryptjs');

describe('AuthService', () => {
    const mockUser = {
        id: 1,
        email: 'test@example.com',
        passwordHash: '$2a$10$hashedpassword',
        firstName: 'Test',
        lastName: 'User',
        role: 'emprendedor',
        phoneContact: '1234567890'
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('login', () => {
        it('should login successfully with valid credentials', async () => {
            userRepository.findByEmail.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(true);
            refreshTokenRepository.create.mockResolvedValue({
                id: 1,
                userId: mockUser.id,
                token: 'refresh-token'
            });

            const result = await authService.login(
                'test@example.com',
                'correctpassword',
                '127.0.0.1',
                'test-user-agent'
            );

            expect(result).toHaveProperty('user');
            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
            expect(result.user.email).toBe('test@example.com');
            expect(result.user).not.toHaveProperty('passwordHash');
            
            expect(userRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
            expect(bcrypt.compare).toHaveBeenCalledWith('correctpassword', mockUser.passwordHash);
            expect(refreshTokenRepository.create).toHaveBeenCalled();
        });

        it('should throw error for non-existent user', async () => {
            userRepository.findByEmail.mockResolvedValue(null);

            await expect(
                authService.login('nonexistent@example.com', 'password', '127.0.0.1', 'agent')
            ).rejects.toThrow('Credenciales inválidas');

            expect(bcrypt.compare).not.toHaveBeenCalled();
        });

        it('should throw error for invalid password', async () => {
            userRepository.findByEmail.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(false);

            await expect(
                authService.login('test@example.com', 'wrongpassword', '127.0.0.1', 'agent')
            ).rejects.toThrow('Credenciales inválidas');

            expect(refreshTokenRepository.create).not.toHaveBeenCalled();
        });

        it('should sanitize user data in response', async () => {
            userRepository.findByEmail.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(true);
            refreshTokenRepository.create.mockResolvedValue({
                id: 1,
                userId: mockUser.id,
                token: 'refresh-token'
            });

            const result = await authService.login(
                'test@example.com',
                'password',
                '127.0.0.1',
                'agent'
            );

            // Verificar que no se exponga el hash de la contraseña
            expect(result.user).not.toHaveProperty('passwordHash');
            expect(result.user).toHaveProperty('id');
            expect(result.user).toHaveProperty('email');
            expect(result.user).toHaveProperty('role');
        });
    });

    describe('register', () => {
        const registerData = {
            email: 'newuser@example.com',
            password: 'SecurePass123',
            confirmPassword: 'SecurePass123',
            celular: '1234567890',
            nombres: 'New',
            apellidos: 'User'
        };

        it('should register new user successfully', async () => {
            userRepository.emailExists.mockResolvedValue(false);
            bcrypt.hash.mockResolvedValue('$2a$10$newhashedpassword');
            userRepository.create.mockResolvedValue({
                id: 2,
                email: registerData.email,
                passwordHash: '$2a$10$newhashedpassword',
                firstName: registerData.nombres,
                lastName: registerData.apellidos,
                role: 'emprendedor'
            });
            refreshTokenRepository.create.mockResolvedValue({
                id: 2,
                userId: 2,
                token: 'new-refresh-token'
            });

            const result = await authService.register(registerData, '127.0.0.1', 'agent');

            expect(result).toHaveProperty('user');
            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
            expect(result.user.email).toBe(registerData.email);
            
            expect(userRepository.emailExists).toHaveBeenCalledWith(registerData.email);
            expect(bcrypt.hash).toHaveBeenCalledWith(registerData.password, 10);
        });

        it('should throw error if email already exists', async () => {
            userRepository.emailExists.mockResolvedValue(true);

            await expect(
                authService.register(registerData, '127.0.0.1', 'agent')
            ).rejects.toThrow('El correo electrónico ya está registrado');

            expect(bcrypt.hash).not.toHaveBeenCalled();
            expect(userRepository.create).not.toHaveBeenCalled();
        });

        it('should throw error if password is too short', async () => {
            userRepository.emailExists.mockResolvedValue(false);
            
            const invalidData = { ...registerData, password: 'short', confirmPassword: 'short' };

            await expect(
                authService.register(invalidData, '127.0.0.1', 'agent')
            ).rejects.toThrow('La contraseña debe tener al menos 8 caracteres');
        });

        it('should throw error if passwords do not match', async () => {
            userRepository.emailExists.mockResolvedValue(false);
            
            const invalidData = { 
                ...registerData, 
                password: 'Password123',
                confirmPassword: 'DifferentPass123'
            };

            await expect(
                authService.register(invalidData, '127.0.0.1', 'agent')
            ).rejects.toThrow('Las contraseñas no coinciden');
        });
    });

    describe('refreshTokens', () => {
        const oldRefreshToken = 'old-refresh-token';
        const mockStoredToken = {
            id: 1,
            userId: mockUser.id,
            token: oldRefreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            revokedAt: null
        };

        it('should refresh tokens successfully', async () => {
            // Mock de jwtUtils para simular la verificación
            jest.spyOn(jwtUtils, 'verifyRefreshToken').mockReturnValue({
                userId: mockUser.id,
                email: mockUser.email
            });

            refreshTokenRepository.findByToken.mockResolvedValue(mockStoredToken);
            userRepository.findById.mockResolvedValue(mockUser);
            refreshTokenRepository.create.mockResolvedValue({
                id: 2,
                userId: mockUser.id,
                token: 'new-refresh-token'
            });
            refreshTokenRepository.revoke.mockResolvedValue(true);

            const result = await authService.refreshTokens(
                oldRefreshToken,
                '127.0.0.1',
                'agent'
            );

            expect(result).toHaveProperty('user');
            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
            
            // Verificar que se revocó el token antiguo
            expect(refreshTokenRepository.revoke).toHaveBeenCalledWith(
                oldRefreshToken,
                expect.any(String)
            );
        });

        it('should throw error for invalid refresh token', async () => {
            refreshTokenRepository.findByToken.mockResolvedValue(null);
            
            jest.spyOn(jwtUtils, 'verifyRefreshToken').mockReturnValue({
                userId: mockUser.id,
                email: mockUser.email
            });

            await expect(
                authService.refreshTokens('invalid-token', '127.0.0.1', 'agent')
            ).rejects.toThrow('Refresh token inválido o expirado');
        });
    });

    describe('logout', () => {
        it('should revoke refresh token on logout', async () => {
            refreshTokenRepository.revoke.mockResolvedValue(true);

            const result = await authService.logout('refresh-token');

            expect(result).toBe(true);
            expect(refreshTokenRepository.revoke).toHaveBeenCalledWith('refresh-token');
        });

        it('should handle logout without token gracefully', async () => {
            const result = await authService.logout(null);
            
            expect(result).toBe(true);
            expect(refreshTokenRepository.revoke).not.toHaveBeenCalled();
        });
    });
});
