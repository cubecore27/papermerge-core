# Two-Factor Authentication (2FA) with Email OTP

This document describes the email-based One-Time Password (OTP) two-factor authentication system that has been added to the Papermerge Auth Server.

## Overview

The 2FA system provides an additional layer of security by requiring users to verify their identity with a 6-digit code sent to their email address after entering their username and password.

## Features

- ✅ Email-based OTP verification
- ✅ 6-digit verification codes
- ✅ 10-minute expiry for OTP codes
- ✅ User-controlled 2FA enable/disable
- ✅ Secure temporary tokens for 2FA flow
- ✅ Frontend components for seamless UX
- ✅ REST API endpoints for 2FA management

## Database Changes

### Migration Command

To create the necessary database tables for 2FA functionality, run the following migration command:

```bash
# Navigate to the auth-server directory
cd auth-server

# Run the database migration using alembic
poetry run alembic upgrade head
```

If you're starting fresh, you may need to initialize the database first:

```bash
# Initialize the database (if not already done)
poetry run alembic upgrade head

# Or if you need to create the initial migration
poetry run alembic revision --autogenerate -m "Add 2FA support"
poetry run alembic upgrade head
```

### New Table: `email_otps`
- `id` (UUID): Primary key
- `user_id` (UUID): Foreign key to users table
- `otp_code` (String): 6-digit verification code
- `created_at` (DateTime): Creation timestamp
- `expires_at` (DateTime): Expiration timestamp
- `is_used` (Boolean): Whether the OTP has been used
- `purpose` (String): Purpose of OTP (login, setup, disable)

### Updated Table: `users`
- `is_2fa_enabled` (Boolean): Whether 2FA is enabled for the user

## API Endpoints

### Authentication Flow

#### `POST /token`
Enhanced to support 2FA flow:

**Request with 2FA enabled:**
```json
{
  "username": "user@example.com",
  "password": "password",
  "provider": "db"
}
```

**Response (2FA required):**
```json
{
  "temp_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "requires_2fa": true,
  "user_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Request with OTP code:**
```json
{
  "username": "user@example.com", 
  "password": "password",
  "provider": "db",
  "otp_code": "123456"
}
```

**Response (success):**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer"
}
```

### 2FA Management

#### `GET /2fa/status`
Get current 2FA status for authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "is_2fa_enabled": true
}
```

#### `POST /2fa/setup/send-otp`
Send OTP code for enabling 2FA.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Verification code sent to your email"
}
```

#### `POST /2fa/setup`
Enable or disable 2FA.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "enable": true,
  "otp_code": "123456"
}
```

**Response:**
```json
{
  "message": "Two-factor authentication enabled"
}
```

#### `POST /2fa/disable/send-otp`
Send OTP code for disabling 2FA.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Verification code sent to your email"
}
```

## Configuration

Add the following environment variables to configure email settings:

```bash
# Required for basic functionality
PAPERMERGE__SECURITY__SECRET_KEY=your-secret-key
PAPERMERGE__DATABASE__URL=your-database-url

# Email configuration for OTP
PAPERMERGE__EMAIL__SMTP_HOST=smtp.gmail.com
PAPERMERGE__EMAIL__SMTP_PORT=587
PAPERMERGE__EMAIL__SMTP_USERNAME=your-email@gmail.com
PAPERMERGE__EMAIL__SMTP_PASSWORD=your-app-password
PAPERMERGE__EMAIL__SMTP_USE_TLS=false
PAPERMERGE__EMAIL__SMTP_START_TLS=true
PAPERMERGE__EMAIL__FROM_ADDRESS=noreply@yourcompany.com
```

## Frontend Components

### TwoFactorVerification Component
Handles the second factor authentication step:
- Displays verification code input
- Validates 6-digit codes
- Handles authentication completion

### TwoFactorSettings Component  
Manages 2FA settings in user preferences:
- Toggle 2FA on/off
- Send verification codes
- Verify codes for enabling/disabling

### Updated DBLogin Component
Enhanced login flow:
- Handles first factor authentication
- Switches to 2FA verification when required
- Maintains user experience continuity

## Usage Flow

### Enabling 2FA

1. User navigates to security settings
2. Clicks "Enable 2FA" toggle
3. System sends OTP to user's email
4. User enters 6-digit code
5. System enables 2FA for the account

### Login with 2FA

1. User enters username and password
2. System validates credentials (first factor)
3. System sends OTP to user's email  
4. User enters 6-digit verification code
5. System validates OTP (second factor)
6. User is logged in successfully

### Disabling 2FA

1. User navigates to security settings
2. Clicks "Disable 2FA" toggle  
3. System sends OTP to user's email
4. User enters 6-digit code
5. System disables 2FA for the account

## Security Features

- **Time-based expiry**: OTP codes expire after 10 minutes
- **Single-use codes**: Each OTP can only be used once
- **Secure storage**: OTP codes are stored securely in the database
- **Purpose-specific**: Different OTP types for login, setup, and disable
- **Temporary tokens**: Short-lived tokens for 2FA flow management

## Testing

Run the included test script to verify functionality:

```bash
export PAPERMERGE__SECURITY__SECRET_KEY="test-secret-key"
export PAPERMERGE__DATABASE__URL="sqlite:///test.db"
poetry run python test_2fa.py
```

The test validates:
- Regular login without 2FA
- Enabling 2FA with OTP verification
- Login with 2FA (both factors)
- Disabling 2FA with OTP verification
- Login after disabling 2FA

## Error Handling

The system handles various error scenarios:
- Invalid OTP codes
- Expired OTP codes
- Email delivery failures
- Database errors
- Network timeouts

## Dependencies

New dependencies added:
- `aiosmtplib`: Async SMTP client for email sending
- `jinja2`: Template engine for email formatting

## Future Enhancements

Potential improvements for the 2FA system:
- SMS-based OTP as alternative to email
- TOTP (Time-based OTP) support with authenticator apps
- Backup recovery codes
- Rate limiting for OTP requests
- Admin controls for 2FA enforcement
- Audit logging for 2FA events
