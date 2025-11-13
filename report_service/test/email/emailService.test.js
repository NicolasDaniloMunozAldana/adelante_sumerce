const emailService = require('../../src/email/emailService');
const nodemailer = require('nodemailer');

// Mock de nodemailer
jest.mock('nodemailer');

describe('EmailService', () => {
    let mockTransporter;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock del transporter
        mockTransporter = {
            verify: jest.fn(),
            sendMail: jest.fn()
        };

        nodemailer.createTransport.mockReturnValue(mockTransporter);
        
        // Asignar el transporter mock a la instancia singleton
        emailService.transporter = mockTransporter;
    });

    describe('verifyConnection', () => {
        it('should verify SMTP connection successfully', async () => {
            mockTransporter.verify.mockResolvedValue(true);

            const result = await emailService.verifyConnection();

            expect(result).toBe(true);
            expect(mockTransporter.verify).toHaveBeenCalled();
        });

        it('should return false on connection error', async () => {
            mockTransporter.verify.mockRejectedValue(new Error('Connection failed'));

            const result = await emailService.verifyConnection();

            expect(result).toBe(false);
        });
    });

    describe('sendReportEmail', () => {
        it('should send email with PDF attachment successfully', async () => {
            const mockInfo = {
                messageId: '<test@example.com>',
                accepted: ['recipient@example.com'],
                response: '250 Message accepted'
            };

            mockTransporter.sendMail.mockResolvedValue(mockInfo);

            const pdfBuffer = Buffer.from('fake-pdf-content');
            const result = await emailService.sendReportEmail(
                'recipient@example.com',
                'Test Report',
                pdfBuffer,
                'test-report.pdf'
            );

            expect(result.success).toBe(true);
            expect(result.messageId).toBe(mockInfo.messageId);
            
            expect(mockTransporter.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'recipient@example.com',
                    subject: 'Test Report',
                    attachments: expect.arrayContaining([
                        expect.objectContaining({
                            filename: 'test-report.pdf',
                            content: pdfBuffer,
                            contentType: 'application/pdf'
                        })
                    ])
                })
            );
        });

        it('should throw error if email sending fails', async () => {
            mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));

            const pdfBuffer = Buffer.from('fake-pdf-content');

            await expect(
                emailService.sendReportEmail(
                    'recipient@example.com',
                    'Test Report',
                    pdfBuffer
                )
            ).rejects.toThrow('SMTP error');
        });

        it('should include correct email structure', async () => {
            mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

            const pdfBuffer = Buffer.from('fake-pdf-content');
            await emailService.sendReportEmail(
                'recipient@example.com',
                'Business Report',
                pdfBuffer,
                'business-report.pdf'
            );

            const callArgs = mockTransporter.sendMail.mock.calls[0][0];
            
            expect(callArgs).toHaveProperty('from');
            expect(callArgs.from).toContain('Salga Adelante Sumercé');
            expect(callArgs).toHaveProperty('to', 'recipient@example.com');
            expect(callArgs).toHaveProperty('subject', 'Business Report');
            expect(callArgs).toHaveProperty('html');
            expect(callArgs).toHaveProperty('attachments');
        });
    });

    describe('sendExcelReportEmail', () => {
        it('should send email with Excel attachment successfully', async () => {
            const mockInfo = {
                messageId: '<excel@example.com>',
                accepted: ['recipient@example.com']
            };

            mockTransporter.sendMail.mockResolvedValue(mockInfo);

            const excelBuffer = Buffer.from('fake-excel-content');
            const result = await emailService.sendExcelReportEmail(
                'recipient@example.com',
                'Excel Report',
                excelBuffer,
                'report.xlsx'
            );

            expect(result.success).toBe(true);
            expect(mockTransporter.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    attachments: expect.arrayContaining([
                        expect.objectContaining({
                            filename: 'report.xlsx',
                            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                        })
                    ])
                })
            );
        });
    });

    describe('sendErrorNotification', () => {
        it('should send error notification email', async () => {
            mockTransporter.sendMail.mockResolvedValue({ messageId: 'error-id' });

            const result = await emailService.sendErrorNotification(
                'admin@example.com',
                'User Report',
                'Failed to generate PDF'
            );

            expect(result.success).toBe(true);
            expect(mockTransporter.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'admin@example.com',
                    subject: expect.stringContaining('Error'),
                    html: expect.any(String)
                })
            );
        });

        it('should include error details in notification', async () => {
            mockTransporter.sendMail.mockResolvedValue({ messageId: 'error-id' });

            await emailService.sendErrorNotification(
                'admin@example.com',
                'Comparative Report',
                'Database connection timeout'
            );

            const callArgs = mockTransporter.sendMail.mock.calls[0][0];
            expect(callArgs.subject).toContain('Comparative Report');
        });
    });
});
