package service

import (
	"context"
	"fmt"
	"log/slog"
	"net/smtp"
	"os"
	"strings"

	"github.com/resend/resend-go/v4"
)

// EmailAttachment represents an attachment sent with an email.
type EmailAttachment struct {
	Filename    string
	ContentType string
	Data        []byte
}

// EmailMessage contains fields for sending an email.
type EmailMessage struct {
	To          string
	Subject     string
	BodyHTML    string
	BodyText    string
	Attachments []EmailAttachment
}

// EmailSender defines the interface for delivering emails (verification, accountant exports, reminders).
type EmailSender interface {
	SendEmail(ctx context.Context, msg EmailMessage) error
}

// LoggingEmailSender logs emails in development/staging and acts as fallback.
type LoggingEmailSender struct {
	logger *slog.Logger
}

func NewLoggingEmailSender(logger *slog.Logger) *LoggingEmailSender {
	return &LoggingEmailSender{logger: logger}
}

func (s *LoggingEmailSender) SendEmail(ctx context.Context, msg EmailMessage) error {
	s.logger.Info("📧 [EMAIL DISPATCH]",
		slog.String("to", msg.To),
		slog.String("subject", msg.Subject),
		slog.String("content", msg.BodyText),
		slog.Int("attachments_count", len(msg.Attachments)),
	)
	return nil
}

// ResendEmailSender delivers emails via official Resend Go SDK (github.com/resend/resend-go/v4).
type ResendEmailSender struct {
	client *resend.Client
	from   string
	logger *slog.Logger
}

func NewResendEmailSender(apiKey, from string, logger *slog.Logger) *ResendEmailSender {
	if from == "" {
		from = "FreelanceFin <onboarding@resend.dev>"
	}
	return &ResendEmailSender{
		client: resend.NewClient(apiKey),
		from:   from,
		logger: logger,
	}
}

func (s *ResendEmailSender) SendEmail(ctx context.Context, msg EmailMessage) error {
	params := &resend.SendEmailRequest{
		From:    s.from,
		To:      []string{msg.To},
		Subject: msg.Subject,
		Text:    msg.BodyText,
		Html:    msg.BodyHTML,
	}

	for _, a := range msg.Attachments {
		params.Attachments = append(params.Attachments, &resend.Attachment{
			Filename: a.Filename,
			Content:  a.Data,
		})
	}

	sent, err := s.client.Emails.SendWithContext(ctx, params)
	if err != nil {
		s.logger.Error("failed to dispatch email via Resend", "err", err, "to", msg.To)
		return fmt.Errorf("resend send: %w", err)
	}

	s.logger.Info("email successfully dispatched via Resend", "to", msg.To, "id", sent.Id)
	return nil
}

// SMTPEmailSender delivers emails via standard SMTP (Sendgrid, Postmark, AWS SES, Mailgun, Mailtrap).
type SMTPEmailSender struct {
	host     string
	port     string
	username string
	password string
	from     string
	logger   *slog.Logger
}

func NewSMTPEmailSender(host, port, username, password, from string, logger *slog.Logger) *SMTPEmailSender {
	if from == "" {
		from = "no-reply@freelancefin.nl"
	}
	return &SMTPEmailSender{
		host:     host,
		port:     port,
		username: username,
		password: password,
		from:     from,
		logger:   logger,
	}
}

func (s *SMTPEmailSender) SendEmail(ctx context.Context, msg EmailMessage) error {
	addr := s.host + ":" + s.port
	var auth smtp.Auth
	if s.username != "" || s.password != "" {
		auth = smtp.PlainAuth("", s.username, s.password, s.host)
	}

	rawMsg := []byte(fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n%s",
		s.from, msg.To, msg.Subject, msg.BodyHTML))

	err := smtp.SendMail(addr, auth, s.from, []string{msg.To}, rawMsg)
	if err != nil {
		s.logger.Error("failed to dispatch email via SMTP", "err", err, "to", msg.To)
		return fmt.Errorf("smtp send: %w", err)
	}

	s.logger.Info("email successfully dispatched via SMTP", "to", msg.To, "subject", msg.Subject)
	return nil
}

// NewDefaultEmailSender chooses the sender based on environment variables:
// 1. RESEND_API_KEY -> ResendEmailSender
// 2. SMTP_HOST -> SMTPEmailSender
// 3. Fallback -> LoggingEmailSender (prints link directly in dev console)
func NewDefaultEmailSender(logger *slog.Logger) EmailSender {
	fromEmail := os.Getenv("EMAIL_FROM")

	if resendKey := strings.TrimSpace(os.Getenv("RESEND_API_KEY")); resendKey != "" {
		logger.Info("configured email service: Resend")
		return NewResendEmailSender(resendKey, fromEmail, logger)
	}

	if smtpHost := strings.TrimSpace(os.Getenv("SMTP_HOST")); smtpHost != "" {
		smtpPort := os.Getenv("SMTP_PORT")
		if smtpPort == "" {
			smtpPort = "587"
		}
		logger.Info("configured email service: SMTP", "host", smtpHost, "port", smtpPort)
		return NewSMTPEmailSender(
			smtpHost,
			smtpPort,
			os.Getenv("SMTP_USER"),
			os.Getenv("SMTP_PASSWORD"),
			fromEmail,
			logger,
		)
	}

	logger.Info("no external email service credentials found (RESEND_API_KEY or SMTP_HOST); using LoggingEmailSender (dev console)")
	return NewLoggingEmailSender(logger)
}
