from uuid import UUID
from enum import Enum
from pydantic import BaseModel, ConfigDict


class User(BaseModel):
    id: UUID
    username: str
    password: str
    email: str
    home_folder_id: UUID
    inbox_folder_id: UUID
    is_superuser: bool = False
    is_2fa_enabled: bool = False
    scopes: list[str] = []

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

    model_config = ConfigDict(from_attributes=True)


class TokenData(BaseModel):
    sub: str  # same as `user_id`
    preferred_username: str  # standard claim for `username`
    email: str
    scopes: list[str] = []

    model_config = ConfigDict(from_attributes=True)


class AuthProvider(str, Enum):
    OIDC = "oidc"
    LDAP = "ldap"
    DB = "db"


class UserCredentials(BaseModel):
    username: str
    password: str
    provider: AuthProvider = AuthProvider.DB
    otp_code: str | None = None  # For 2FA verification

    model_config = ConfigDict(from_attributes=True)


class OTPRequest(BaseModel):
    user_id: UUID
    purpose: str = "login"

    model_config = ConfigDict(from_attributes=True)


class OTPVerification(BaseModel):
    user_id: UUID
    otp_code: str
    purpose: str = "login"

    model_config = ConfigDict(from_attributes=True)


class TwoFactorSetup(BaseModel):
    enable: bool
    otp_code: str | None = None  # Required when enabling

    model_config = ConfigDict(from_attributes=True)


class TwoFactorToken(BaseModel):
    """Temporary token returned after successful first-factor authentication"""
    temp_token: str
    requires_2fa: bool = True
    user_id: UUID

    model_config = ConfigDict(from_attributes=True)


class Group(BaseModel):
    id: UUID
    name: str

    # Config
    model_config = ConfigDict(from_attributes=True)


class Role(BaseModel):
    id: UUID
    name: str

    # Config
    model_config = ConfigDict(from_attributes=True)


class Permission(BaseModel):
    id: UUID
    name: str  # e.g. "Can create tags"
    codename: str  # e.g. "tag.create"

    # Config
    model_config = ConfigDict(from_attributes=True)
