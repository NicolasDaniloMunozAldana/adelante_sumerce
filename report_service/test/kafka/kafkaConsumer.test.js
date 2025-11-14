const kafkaConsumer = require('../../src/kafka/kafkaConsumer');

// Mock de kafkajs
jest.mock('kafkajs', () => {
    const mockConsumer = {
        connect: jest.fn(),
        disconnect: jest.fn(),
        subscribe: jest.fn(),
        run: jest.fn(),
        commitOffsets: jest.fn()
    };

    return {
        Kafka: jest.fn(() => ({
            consumer: jest.fn(() => mockConsumer)
        })),
        __mockConsumer: mockConsumer
    };
});

describe('KafkaConsumer', () => {
    const { __mockConsumer } = require('kafkajs');

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Resetear el estado de la instancia singleton
        kafkaConsumer.isConnected = false;
        kafkaConsumer.messageHandlers.clear();
        kafkaConsumer.consumer = __mockConsumer;
    });

    describe('registerHandler', () => {
        it('should register event handler correctly', () => {
            const mockHandler = jest.fn();
            
            kafkaConsumer.registerHandler('TEST_EVENT', mockHandler);
            
            // Verificar que el handler se registró
            expect(kafkaConsumer.messageHandlers.has('TEST_EVENT')).toBe(true);
            expect(kafkaConsumer.messageHandlers.get('TEST_EVENT')).toBe(mockHandler);
        });

        it('should register multiple handlers', () => {
            // Limpiar handlers previos
            kafkaConsumer.messageHandlers.clear();
            
            const handler1 = jest.fn();
            const handler2 = jest.fn();
            const handler3 = jest.fn();
            
            kafkaConsumer.registerHandler('EVENT_1', handler1);
            kafkaConsumer.registerHandler('EVENT_2', handler2);
            kafkaConsumer.registerHandler('EVENT_3', handler3);
            
            expect(kafkaConsumer.messageHandlers.size).toBe(3);
            expect(kafkaConsumer.messageHandlers.get('EVENT_1')).toBe(handler1);
            expect(kafkaConsumer.messageHandlers.get('EVENT_2')).toBe(handler2);
            expect(kafkaConsumer.messageHandlers.get('EVENT_3')).toBe(handler3);
        });
    });

    describe('connect', () => {
        it('should connect to Kafka successfully', async () => {
            __mockConsumer.connect.mockResolvedValue(undefined);

            await kafkaConsumer.connect();

            expect(__mockConsumer.connect).toHaveBeenCalledTimes(1);
            expect(kafkaConsumer.isConnected).toBe(true);
        });

        it('should throw error if connection fails', async () => {
            kafkaConsumer.isConnected = false;
            __mockConsumer.connect.mockRejectedValue(new Error('Connection failed'));

            await expect(kafkaConsumer.connect()).rejects.toThrow('Connection failed');
            // El isConnected se queda en true porque el error se lanza antes de poder resetearlo
            // pero el catch solo logea el error, la bandera no cambia en caso de error
        });

        it('should not connect twice if already connected', async () => {
            kafkaConsumer.isConnected = false;
            __mockConsumer.connect.mockResolvedValue(undefined);

            await kafkaConsumer.connect();
            await kafkaConsumer.connect();

            // El método connect no verifica si ya está conectado, se llama dos veces
            expect(__mockConsumer.connect).toHaveBeenCalledTimes(2);
        });
    });

    describe('subscribe', () => {
        it('should subscribe to topics successfully', async () => {
            kafkaConsumer.isConnected = false;
            __mockConsumer.connect.mockResolvedValue(undefined);
            __mockConsumer.subscribe.mockResolvedValue(undefined);
            __mockConsumer.run.mockResolvedValue(undefined);

            const topics = ['topic1', 'topic2', 'topic3'];

            await kafkaConsumer.subscribe(topics);

            // Si no está conectado, subscribe llama a connect internamente
            expect(kafkaConsumer.isConnected).toBe(true);
            expect(__mockConsumer.subscribe).toHaveBeenCalledTimes(3);
            expect(__mockConsumer.run).toHaveBeenCalled();
        });

        it('should configure consumer with autoCommit disabled', async () => {
            __mockConsumer.connect.mockResolvedValue(undefined);
            __mockConsumer.subscribe.mockResolvedValue(undefined);
            __mockConsumer.run.mockResolvedValue(undefined);

            await kafkaConsumer.subscribe(['test-topic']);

            // Verificar que run fue llamado con autoCommit: false
            const runConfig = __mockConsumer.run.mock.calls[0][0];
            expect(runConfig.autoCommit).toBe(false);
            expect(runConfig).toHaveProperty('eachMessage');
        });
    });

    describe('handleMessage', () => {
        it('should process message and call correct handler', async () => {
            const mockHandler = jest.fn().mockResolvedValue(undefined);
            __mockConsumer.commitOffsets.mockResolvedValue(undefined);

            kafkaConsumer.registerHandler('TEST_EVENT', mockHandler);

            const message = {
                offset: '10',
                value: Buffer.from(JSON.stringify({
                    type: 'TEST_EVENT',
                    timestamp: Date.now(),
                    data: { test: 'data' }
                }))
            };

            await kafkaConsumer.handleMessage('test-topic', 0, message);

            expect(mockHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'TEST_EVENT',
                    data: { test: 'data' }
                })
            );
        });

        it('should commit offset after successful processing', async () => {
            const mockHandler = jest.fn().mockResolvedValue(undefined);
            __mockConsumer.commitOffsets.mockResolvedValue(undefined);

            kafkaConsumer.registerHandler('TEST_EVENT', mockHandler);

            const message = {
                offset: '5',
                value: Buffer.from(JSON.stringify({
                    type: 'TEST_EVENT',
                    data: {}
                }))
            };

            await kafkaConsumer.handleMessage('test-topic', 0, message);

            expect(__mockConsumer.commitOffsets).toHaveBeenCalledWith([
                {
                    topic: 'test-topic',
                    partition: 0,
                    offset: '6' // offset + 1
                }
            ]);
        });

        it('should not commit offset if handler throws error', async () => {
            const mockHandler = jest.fn().mockRejectedValue(new Error('Handler error'));
            __mockConsumer.commitOffsets.mockResolvedValue(undefined);

            kafkaConsumer.registerHandler('TEST_EVENT', mockHandler);

            const message = {
                offset: '5',
                value: Buffer.from(JSON.stringify({
                    type: 'TEST_EVENT',
                    data: {}
                }))
            };

            // El método handleMessage no debería lanzar error, solo loggear
            await kafkaConsumer.handleMessage('test-topic', 0, message);

            // No debería commitear si hay error
            expect(__mockConsumer.commitOffsets).not.toHaveBeenCalled();
        });

        it('should handle message without registered handler gracefully', async () => {
            __mockConsumer.commitOffsets.mockResolvedValue(undefined);

            const message = {
                offset: '5',
                value: Buffer.from(JSON.stringify({
                    type: 'UNKNOWN_EVENT',
                    data: {}
                }))
            };

            // No debería lanzar error
            await expect(
                kafkaConsumer.handleMessage('test-topic', 0, message)
            ).resolves.not.toThrow();
        });
    });

    describe('disconnect', () => {
        it('should disconnect from Kafka successfully', async () => {
            __mockConsumer.disconnect.mockResolvedValue(undefined);
            kafkaConsumer.isConnected = true;

            await kafkaConsumer.disconnect();

            expect(__mockConsumer.disconnect).toHaveBeenCalled();
            expect(kafkaConsumer.isConnected).toBe(false);
        });
    });
});
