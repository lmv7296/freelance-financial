package repository

import (
	"context"
	"errors"
	"sync"
	"time"

	"go-freelancer/internal/model"
)

var (
	ErrUserNotFound          = errors.New("user not found")
	ErrEmailAlreadyExists    = errors.New("email is already registered")
	ErrSessionNotFound          = errors.New("session not found or expired")
	ErrSessionExpired           = errors.New("session expired")
	ErrVerificationTokenInvalid = errors.New("verification token is invalid or expired")
)

// UserRepository defines persistence operations for user accounts.
type UserRepository interface {
	Create(ctx context.Context, user *model.User) error
	GetByEmail(ctx context.Context, email string) (*model.User, error)
	GetByID(ctx context.Context, id string) (*model.User, error)
	UpdateEmail(ctx context.Context, userID, newEmail string) error
	UpdatePassword(ctx context.Context, userID, newPasswordHash string) error
	UpdateProfile(ctx context.Context, userID string, req *model.UpdateProfileRequest) (*model.User, error)
	SetVerified(ctx context.Context, userID string, isVerified bool) error

	// Email Verification Tokens
	SaveVerificationToken(ctx context.Context, token *model.EmailVerificationToken) error
	GetVerificationTokenByHash(ctx context.Context, tokenHash string) (*model.EmailVerificationToken, error)
	DeleteVerificationToken(ctx context.Context, tokenHash string) error
	GetLatestTokenTimeByUserID(ctx context.Context, userID string) (*time.Time, error)
}

// SessionRepository defines persistence operations for authentication sessions.
type SessionRepository interface {
	Create(ctx context.Context, session *model.Session) error
	GetByTokenHash(ctx context.Context, tokenHash string) (*model.Session, error)
	DeleteByTokenHash(ctx context.Context, tokenHash string) error
	DeleteOtherSessions(ctx context.Context, userID, keepTokenHash string) error
	DeleteAllSessions(ctx context.Context, userID string) error
	DeleteExpired(ctx context.Context) error
}

// MemoryUserRepository is a thread-safe in-memory repository implementation.
type MemoryUserRepository struct {
	mu          sync.RWMutex
	users       map[string]*model.User                   // by ID
	emails      map[string]string                        // email -> ID
	tokens      map[string]*model.EmailVerificationToken // tokenHash -> token
	userTokens  map[string]string                        // userID -> tokenHash
	companyRepo CompanyRepository
}

func NewMemoryUserRepository(companyRepo ...CompanyRepository) *MemoryUserRepository {
	var cr CompanyRepository
	if len(companyRepo) > 0 {
		cr = companyRepo[0]
	}
	return &MemoryUserRepository{
		users:       make(map[string]*model.User),
		emails:      make(map[string]string),
		tokens:      make(map[string]*model.EmailVerificationToken),
		userTokens:  make(map[string]string),
		companyRepo: cr,
	}
}

func (r *MemoryUserRepository) SetCompanyRepository(cr CompanyRepository) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.companyRepo = cr
}

func (r *MemoryUserRepository) SetUserRole(userID, role string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if u, ok := r.users[userID]; ok {
		u.Role = role
	}
}

func (r *MemoryUserRepository) enrichUser(u *model.User) *model.User {
	if u == nil {
		return nil
	}
	cp := *u
	if r.companyRepo != nil && cp.CompanyID != "" {
		comp, err := r.companyRepo.GetByID(context.Background(), cp.CompanyID)
		if err == nil && comp != nil {
			cp.BusinessName = comp.Name
			cp.Country = &comp.Country
			cp.VATNumber = comp.VATNumber
			if comp.LegalForm != nil {
				lf := model.LegalForm(*comp.LegalForm)
				cp.LegalForm = &lf
			}
			cp.TaxRegime = comp.TaxRegime
		}
	}
	return &cp
}

func (r *MemoryUserRepository) Create(ctx context.Context, user *model.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.emails[user.Email]; exists {
		return ErrEmailAlreadyExists
	}

	userCopy := *user
	if userCopy.Role == "" {
		userCopy.Role = "owner"
	}
	r.users[user.ID] = &userCopy
	r.emails[user.Email] = user.ID
	return nil
}

func (r *MemoryUserRepository) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	id, exists := r.emails[email]
	if !exists {
		return nil, ErrUserNotFound
	}
	u := r.users[id]
	return r.enrichUser(u), nil
}

func (r *MemoryUserRepository) GetByID(ctx context.Context, id string) (*model.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	user, exists := r.users[id]
	if !exists {
		return nil, ErrUserNotFound
	}
	return r.enrichUser(user), nil
}

func (r *MemoryUserRepository) UpdateEmail(ctx context.Context, userID, newEmail string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	user, exists := r.users[userID]
	if !exists {
		return ErrUserNotFound
	}

	if existingID, taken := r.emails[newEmail]; taken && existingID != userID {
		return ErrEmailAlreadyExists
	}

	delete(r.emails, user.Email)
	user.Email = newEmail
	user.IsVerified = false
	user.UpdatedAt = time.Now().UTC()
	r.emails[newEmail] = userID
	return nil
}

func (r *MemoryUserRepository) UpdatePassword(ctx context.Context, userID, newPasswordHash string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	user, exists := r.users[userID]
	if !exists {
		return ErrUserNotFound
	}

	user.PasswordHash = newPasswordHash
	user.UpdatedAt = time.Now().UTC()
	return nil
}

func (r *MemoryUserRepository) UpdateProfile(ctx context.Context, userID string, req *model.UpdateProfileRequest) (*model.User, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	user, exists := r.users[userID]
	if !exists {
		return nil, ErrUserNotFound
	}

	if req.FullName != nil {
		user.FullName = req.FullName
	}
	if req.PhoneNumber != nil {
		user.PhoneNumber = req.PhoneNumber
	}

	if r.companyRepo != nil && user.CompanyID != "" {
		comp, err := r.companyRepo.GetByID(ctx, user.CompanyID)
		if err == nil && comp != nil {
			if req.BusinessName != nil {
				comp.Name = req.BusinessName
			}
			if req.VATNumber != nil {
				comp.VATNumber = req.VATNumber
			}
			if req.Country != nil {
				comp.Country = *req.Country
				reg := taxRegimeHelper(*req.Country)
				comp.TaxRegime = &reg
			}
			legal := req.LegalForm
			if legal == nil && req.TaxRegime != nil {
				legal = req.TaxRegime
			}
			if legal != nil {
				s := string(*legal)
				comp.LegalForm = &s
			}
			comp.UpdatedAt = time.Now().UTC()
			_ = r.companyRepo.Update(ctx, comp)
		}
	} else {
		if req.Country != nil {
			user.Country = req.Country
			reg := taxRegimeHelper(*req.Country)
			user.TaxRegime = &reg
		}
		if req.BusinessName != nil {
			user.BusinessName = req.BusinessName
		}
		if req.VATNumber != nil {
			user.VATNumber = req.VATNumber
		}
		legal := req.LegalForm
		if legal == nil && req.TaxRegime != nil {
			legal = req.TaxRegime
		}
		if legal != nil {
			user.LegalForm = legal
		}
	}

	user.UpdatedAt = time.Now().UTC()
	return r.enrichUser(user), nil
}

func taxRegimeHelper(country string) string {
	switch country {
	case "NL", "":
		return "NL_BTW_STANDARD"
	case "BE":
		return "BE_TVA_STANDARD"
	case "DE":
		return "DE_MWST_STANDARD"
	case "ES":
		return "ES_AUTONOMO_GENERAL"
	default:
		return country + "_STANDARD"
	}
}

func (r *MemoryUserRepository) SetVerified(ctx context.Context, userID string, isVerified bool) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	user, exists := r.users[userID]
	if !exists {
		return ErrUserNotFound
	}

	user.IsVerified = isVerified
	user.UpdatedAt = time.Now().UTC()
	return nil
}

func (r *MemoryUserRepository) SaveVerificationToken(ctx context.Context, token *model.EmailVerificationToken) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Replace existing token for user
	if oldHash, exists := r.userTokens[token.UserID]; exists {
		delete(r.tokens, oldHash)
	}

	cp := *token
	r.tokens[token.TokenHash] = &cp
	r.userTokens[token.UserID] = token.TokenHash
	return nil
}

func (r *MemoryUserRepository) GetVerificationTokenByHash(ctx context.Context, tokenHash string) (*model.EmailVerificationToken, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	token, exists := r.tokens[tokenHash]
	if !exists || time.Now().UTC().After(token.ExpiresAt) {
		return nil, ErrVerificationTokenInvalid
	}
	cp := *token
	return &cp, nil
}

func (r *MemoryUserRepository) DeleteVerificationToken(ctx context.Context, tokenHash string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if token, exists := r.tokens[tokenHash]; exists {
		delete(r.userTokens, token.UserID)
		delete(r.tokens, tokenHash)
	}
	return nil
}

func (r *MemoryUserRepository) GetLatestTokenTimeByUserID(ctx context.Context, userID string) (*time.Time, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if hash, exists := r.userTokens[userID]; exists {
		if token, ok := r.tokens[hash]; ok {
			t := token.CreatedAt
			return &t, nil
		}
	}
	return nil, nil
}

// MemorySessionRepository is a thread-safe in-memory session store.
type MemorySessionRepository struct {
	mu       sync.RWMutex
	sessions map[string]*model.Session // by tokenHash
}

func NewMemorySessionRepository() *MemorySessionRepository {
	return &MemorySessionRepository{
		sessions: make(map[string]*model.Session),
	}
}

func (r *MemorySessionRepository) Create(ctx context.Context, session *model.Session) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	sessionCopy := *session
	r.sessions[session.TokenHash] = &sessionCopy
	return nil
}

func (r *MemorySessionRepository) GetByTokenHash(ctx context.Context, tokenHash string) (*model.Session, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	session, exists := r.sessions[tokenHash]
	if !exists {
		return nil, ErrSessionNotFound
	}

	if time.Now().UTC().After(session.ExpiresAt) {
		return nil, ErrSessionNotFound
	}

	sessionCopy := *session
	return &sessionCopy, nil
}

func (r *MemorySessionRepository) DeleteByTokenHash(ctx context.Context, tokenHash string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	delete(r.sessions, tokenHash)
	return nil
}

func (r *MemorySessionRepository) DeleteOtherSessions(ctx context.Context, userID, keepTokenHash string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	for hash, sess := range r.sessions {
		if sess.UserID == userID && hash != keepTokenHash {
			delete(r.sessions, hash)
		}
	}
	return nil
}

func (r *MemorySessionRepository) DeleteAllSessions(ctx context.Context, userID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	for hash, sess := range r.sessions {
		if sess.UserID == userID {
			delete(r.sessions, hash)
		}
	}
	return nil
}

func (r *MemorySessionRepository) DeleteExpired(ctx context.Context) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now().UTC()
	for hash, sess := range r.sessions {
		if now.After(sess.ExpiresAt) {
			delete(r.sessions, hash)
		}
	}
	return nil
}
