package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"net/mail"
	"os"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"

	"go-freelancer/internal/model"
	"go-freelancer/internal/repository"
)

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrEmailInvalid       = errors.New("invalid email format")
	ErrPasswordTooWeak    = errors.New("password must be between 8 and 72 characters")
	ErrEmailExists        = errors.New("a user with this email already exists")
	ErrRateLimited        = errors.New("too many verification requests; please wait before requesting another")
	ErrAlreadyVerified    = errors.New("user is already verified")
	ErrForbiddenCompanyUpdate = errors.New("only company owner can modify company details")
)

// Precomputed dummy hash used to equalize execution time and prevent timing attacks
var dummyHash, _ = bcrypt.GenerateFromPassword([]byte("timing-mitigation-dummy-secret"), bcrypt.DefaultCost)

// AuthService handles account creation, authentication, profile updating, and email verification.
type AuthService interface {
	Register(ctx context.Context, email, password string) (*model.User, error)
	Login(ctx context.Context, email, password string) (*model.User, string, time.Time, error)
	Logout(ctx context.Context, plainToken string) error
	ValidateSession(ctx context.Context, plainToken string) (*model.User, error)
	ChangeEmail(ctx context.Context, userID, currentPassword, newEmail string) (*model.User, error)
	ChangePassword(ctx context.Context, userID, currentPassword, newPassword string, currentPlainToken string) error
	LogoutAll(ctx context.Context, userID string) error

	// Profile & Verification
	UpdateProfile(ctx context.Context, userID string, req *model.UpdateProfileRequest) (*model.User, error)
	VerifyEmail(ctx context.Context, token string) (*model.User, error)
	ResendVerification(ctx context.Context, userID string) error
}

type authService struct {
	userRepo     repository.UserRepository
	sessionRepo  repository.SessionRepository
	companyRepo  repository.CompanyRepository
	settingsRepo repository.SettingsRepository
	taxVaultRepo repository.TaxVaultRepository
	emailSender  EmailSender
	sessionTTL   time.Duration
}

// NewAuthService creates a new AuthService instance.
func NewAuthService(
	userRepo repository.UserRepository,
	sessionRepo repository.SessionRepository,
	companyRepo repository.CompanyRepository,
	settingsRepo repository.SettingsRepository,
	taxVaultRepo repository.TaxVaultRepository,
	emailSender EmailSender,
) AuthService {
	return &authService{
		userRepo:     userRepo,
		sessionRepo:  sessionRepo,
		companyRepo:  companyRepo,
		settingsRepo: settingsRepo,
		taxVaultRepo: taxVaultRepo,
		emailSender:  emailSender,
		sessionTTL:   24 * time.Hour,
	}
}

// Register validates inputs, hashes the password using bcrypt, persists the user, and sends verification email.
func (s *authService) Register(ctx context.Context, email, password string) (*model.User, error) {
	cleanEmail, err := validateEmail(email)
	if err != nil {
		return nil, ErrEmailInvalid
	}

	if err := validatePassword(password); err != nil {
		return nil, err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	now := time.Now().UTC()
	companyID := generateSecureID(16)
	country := "NL"
	taxRegime := TaxRegimeForCountry(country)
	company := &model.Company{
		ID:        companyID,
		Name:      nil,
		Country:   country,
		TaxRegime: &taxRegime,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if s.companyRepo != nil {
		if err := s.companyRepo.Create(ctx, company); err != nil {
			return nil, fmt.Errorf("failed to create company: %w", err)
		}
	}

	if s.settingsRepo != nil {
		defaults := model.DefaultCompanyLists()
		_ = s.settingsRepo.SaveLists(ctx, companyID, &defaults)
	}

	user := &model.User{
		ID:           generateSecureID(16),
		CompanyID:    companyID,
		Email:        cleanEmail,
		PasswordHash: string(hash),
		Role:         "owner",
		IsVerified:   false,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		if errors.Is(err, repository.ErrEmailAlreadyExists) {
			return nil, ErrEmailExists
		}
		return nil, err
	}

	// Create verification token and send email
	_ = s.createAndSendVerificationToken(ctx, user.ID, cleanEmail)

	// Return full joined user
	fullUser, err := s.userRepo.GetByID(ctx, user.ID)
	if err == nil && fullUser != nil {
		return fullUser, nil
	}

	user.Country = &country
	user.TaxRegime = &taxRegime
	return user, nil
}

// Login verifies credentials and creates a secure session token.
func (s *authService) Login(ctx context.Context, email, password string) (*model.User, string, time.Time, error) {
	cleanEmail, err := validateEmail(email)
	if err != nil {
		_ = bcrypt.CompareHashAndPassword(dummyHash, []byte(password))
		return nil, "", time.Time{}, ErrInvalidCredentials
	}

	user, err := s.userRepo.GetByEmail(ctx, cleanEmail)
	if err != nil {
		_ = bcrypt.CompareHashAndPassword(dummyHash, []byte(password))
		return nil, "", time.Time{}, ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, "", time.Time{}, ErrInvalidCredentials
	}

	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return nil, "", time.Time{}, fmt.Errorf("failed to generate session token: %w", err)
	}
	plainToken := hex.EncodeToString(tokenBytes)
	tokenHash := hashToken(plainToken)

	now := time.Now().UTC()
	expiresAt := now.Add(s.sessionTTL)

	session := &model.Session{
		ID:        generateSecureID(16),
		UserID:    user.ID,
		TokenHash: tokenHash,
		ExpiresAt: expiresAt,
		CreatedAt: now,
	}

	if err := s.sessionRepo.Create(ctx, session); err != nil {
		return nil, "", time.Time{}, fmt.Errorf("failed to save session: %w", err)
	}

	return user, plainToken, expiresAt, nil
}

func (s *authService) Logout(ctx context.Context, plainToken string) error {
	tokenHash := hashToken(plainToken)
	return s.sessionRepo.DeleteByTokenHash(ctx, tokenHash)
}

func (s *authService) ValidateSession(ctx context.Context, plainToken string) (*model.User, error) {
	tokenHash := hashToken(plainToken)
	session, err := s.sessionRepo.GetByTokenHash(ctx, tokenHash)
	if err != nil {
		return nil, err
	}
	return s.userRepo.GetByID(ctx, session.UserID)
}

func (s *authService) ChangeEmail(ctx context.Context, userID, currentPassword, newEmail string) (*model.User, error) {
	cleanEmail, err := validateEmail(newEmail)
	if err != nil {
		return nil, ErrEmailInvalid
	}

	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(currentPassword)); err != nil {
		return nil, ErrInvalidCredentials
	}

	if err := s.userRepo.UpdateEmail(ctx, userID, cleanEmail); err != nil {
		if errors.Is(err, repository.ErrEmailAlreadyExists) {
			return nil, ErrEmailExists
		}
		return nil, err
	}

	user.Email = cleanEmail
	user.IsVerified = false

	// Trigger new verification email
	_ = s.createAndSendVerificationToken(ctx, userID, cleanEmail)

	return user, nil
}

func (s *authService) ChangePassword(ctx context.Context, userID, currentPassword, newPassword string, currentPlainToken string) error {
	if err := validatePassword(newPassword); err != nil {
		return err
	}

	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(currentPassword)); err != nil {
		return ErrInvalidCredentials
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	if err := s.userRepo.UpdatePassword(ctx, userID, string(hash)); err != nil {
		return err
	}

	// Revoke other sessions
	currentTokenHash := hashToken(currentPlainToken)
	return s.sessionRepo.DeleteOtherSessions(ctx, userID, currentTokenHash)
}

func (s *authService) LogoutAll(ctx context.Context, userID string) error {
	return s.sessionRepo.DeleteAllSessions(ctx, userID)
}

// UpdateProfile updates onboarding fields on users and companies in a single transaction.
func (s *authService) UpdateProfile(ctx context.Context, userID string, req *model.UpdateProfileRequest) (*model.User, error) {
	currentUser, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Authorization check: Only company owners can modify company fields
	isCompanyUpdate := req.BusinessName != nil || req.LegalForm != nil || req.TaxRegime != nil || req.VATNumber != nil || req.Country != nil
	if currentUser.Role == "member" && isCompanyUpdate {
		return nil, ErrForbiddenCompanyUpdate
	}

	// Validation
	if req.FullName != nil {
		trimmed := strings.TrimSpace(*req.FullName)
		if trimmed == "" {
			return nil, errors.New("full_name cannot be empty")
		}
		if len(trimmed) > 200 {
			return nil, errors.New("full_name must be at most 200 characters")
		}
		req.FullName = &trimmed
	}

	if req.BusinessName != nil {
		trimmed := strings.TrimSpace(*req.BusinessName)
		if trimmed == "" {
			return nil, errors.New("business_name cannot be empty")
		}
		if len(trimmed) > 200 {
			return nil, errors.New("business_name must be at most 200 characters")
		}
		req.BusinessName = &trimmed
	}

	effectiveCountry := "NL"
	if currentUser.Country != nil {
		effectiveCountry = *currentUser.Country
	}
	if req.Country != nil {
		c, err := ValidateCountry(*req.Country)
		if err != nil {
			return nil, err
		}
		effectiveCountry = c
		req.Country = &c
	}

	if req.PhoneNumber != nil {
		normPhone, err := NormalizePhoneE164(*req.PhoneNumber)
		if err != nil {
			return nil, err
		}
		req.PhoneNumber = &normPhone
	}

	legal := req.LegalForm
	if legal == nil && req.TaxRegime != nil {
		legal = req.TaxRegime
	}
	if legal != nil {
		tr := *legal
		if tr != model.LegalFormEenmanszaak && tr != model.LegalFormVOF && tr != model.LegalFormBV {
			return nil, ErrInvalidLegalForm
		}
		req.LegalForm = legal
	}

	if req.VATNumber != nil {
		if strings.TrimSpace(*req.VATNumber) == "" {
			req.VATNumber = nil
		} else {
			cleanVAT, err := ValidateVAT(*req.VATNumber, effectiveCountry)
			if err != nil {
				return nil, err
			}
			req.VATNumber = &cleanVAT
		}
	}

	return s.userRepo.UpdateProfile(ctx, userID, req)
}

// VerifyEmail marks email as verified upon presenting a valid, unexpired token.
func (s *authService) VerifyEmail(ctx context.Context, plainToken string) (*model.User, error) {
	cleanToken := strings.TrimSpace(plainToken)
	if cleanToken == "" {
		return nil, repository.ErrVerificationTokenInvalid
	}

	tokenHash := hashToken(cleanToken)
	t, err := s.userRepo.GetVerificationTokenByHash(ctx, tokenHash)
	if err != nil {
		return nil, repository.ErrVerificationTokenInvalid
	}

	if err := s.userRepo.SetVerified(ctx, t.UserID, true); err != nil {
		return nil, err
	}

	_ = s.userRepo.DeleteVerificationToken(ctx, tokenHash)

	return s.userRepo.GetByID(ctx, t.UserID)
}

// ResendVerification generates a new token and sends a verification email, subject to rate limits.
func (s *authService) ResendVerification(ctx context.Context, userID string) error {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return err
	}

	if user.IsVerified {
		return nil // Already verified, return 200 without sending
	}

	// Rate limit: 1 request per minute
	latest, err := s.userRepo.GetLatestTokenTimeByUserID(ctx, userID)
	if err == nil && latest != nil {
		if time.Since(*latest) < 1*time.Minute {
			return ErrRateLimited
		}
	}

	return s.createAndSendVerificationToken(ctx, userID, user.Email)
}

func (s *authService) createAndSendVerificationToken(ctx context.Context, userID, email string) error {
	// Generate at least 32 random bytes, URL safe hex
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return fmt.Errorf("generate token: %w", err)
	}
	plainToken := hex.EncodeToString(tokenBytes)
	tokenHash := hashToken(plainToken)

	now := time.Now().UTC()
	expToken := &model.EmailVerificationToken{
		ID:        generateSecureID(16),
		UserID:    userID,
		TokenHash: tokenHash,
		ExpiresAt: now.Add(24 * time.Hour), // 24-hour expiry
		CreatedAt: now,
	}

	if err := s.userRepo.SaveVerificationToken(ctx, expToken); err != nil {
		return err
	}

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}
	link := fmt.Sprintf("%s/verify-email?token=%s", strings.TrimRight(frontendURL, "/"), plainToken)

	msg := EmailMessage{
		To:       email,
		Subject:  "Verifieer je e-mailadres voor FreelanceFin",
		BodyText: BuildVerificationEmailText(link),
		BodyHTML: BuildVerificationEmailHTML(link),
	}

	if s.emailSender != nil {
		if err := s.emailSender.SendEmail(ctx, msg); err != nil {
			return fmt.Errorf("send verification email: %w", err)
		}
	}
	return nil
}

func validateEmail(email string) (string, error) {
	trimmed := strings.TrimSpace(email)
	if trimmed == "" {
		return "", errors.New("email cannot be empty")
	}
	addr, err := mail.ParseAddress(trimmed)
	if err != nil {
		return "", err
	}
	return strings.ToLower(addr.Address), nil
}

func validatePassword(password string) error {
	if len(password) < 8 || len(password) > 72 {
		return ErrPasswordTooWeak
	}
	return nil
}

func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}

func generateSecureID(byteLen int) string {
	b := make([]byte, byteLen)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
