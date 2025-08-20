#!/usr/bin/env python3
"""
Test script for 2FA functionality

This script demonstrates how to:
1. Create a user
2. Enable 2FA for the user  
3. Authenticate with 2FA

Run this script with the following environment variables:
- PAPERMERGE__SECURITY__SECRET_KEY
- PAPERMERGE__DATABASE__URL 
- Email configuration if you want to test actual email sending
"""

import asyncio
import os
import sys
from uuid import uuid4

# Add the auth_server to the path
sys.path.insert(0, os.path.dirname(__file__))

from auth_server.db.engine import Session
from auth_server.db.orm import User
from auth_server.config import Settings
from auth_server.services.otp import OTPService
from auth_server import auth
from auth_server.db.base import Base
from auth_server.db.engine import engine
from passlib.hash import pbkdf2_sha256

async def test_2fa_flow():
    """Test the complete 2FA flow"""
    print("🔐 Testing 2FA Email OTP Verification")
    print("=" * 50)
    
    # Create tables
    Base.metadata.create_all(engine)
    print("✅ Database tables created")
    
    settings = Settings()
    otp_service = OTPService(settings)
    
    with Session() as session:
        # Create a test user with unique username
        import time
        timestamp = int(time.time())
        username = f"testuser_{timestamp}"
        
        test_user = User(
            id=uuid4(),
            username=username,
            email=f"test_{timestamp}@example.com",
            password=pbkdf2_sha256.hash("testpassword"),
            home_folder_id=uuid4(),
            inbox_folder_id=uuid4(),
            is_2fa_enabled=False
        )
        
        session.add(test_user)
        session.commit()
        session.refresh(test_user)
        print(f"✅ Created test user: {test_user.username}")
        
        # Test 1: Regular login (without 2FA)
        print("\n📝 Test 1: Regular login (2FA disabled)")
        result = await auth.db_auth(session, username, "testpassword")
        if result and hasattr(result, 'username'):
            print(f"✅ Regular login successful for: {result.username}")
        else:
            print("❌ Regular login failed")
        
        # Test 2: Enable 2FA
        print("\n📝 Test 2: Enabling 2FA")
        
        # Generate OTP directly (skip email sending for test)
        from auth_server.db.orm import EmailOTP
        from datetime import datetime, timedelta, UTC
        import secrets
        
        otp_code = f"{secrets.randbelow(900000) + 100000:06d}"
        expires_at = datetime.now(UTC) + timedelta(minutes=10)
        
        # Create OTP entry directly
        email_otp = EmailOTP(
            id=uuid4(),  # Generate new UUID
            user_id=test_user.id,
            otp_code=otp_code,
            expires_at=expires_at,
            purpose="setup"
        )
        session.add(email_otp)
        session.commit()
        
        print(f"📧 Generated OTP code: {otp_code}")
        
        # Enable 2FA with the OTP
        success = await auth.enable_2fa(session, test_user.id, otp_code)
        print(f"✅ 2FA Enable: {'Success' if success else 'Failed'}")
        
        # Test 3: Login with 2FA (first factor)
        print("\n📝 Test 3: Login with 2FA (first factor)")
        
        # Create login OTP directly since email service will fail in test
        login_otp_code = f"{secrets.randbelow(900000) + 100000:06d}"
        login_expires_at = datetime.now(UTC) + timedelta(minutes=10)
        
        login_email_otp = EmailOTP(
            id=uuid4(),  # Generate new UUID
            user_id=test_user.id,
            otp_code=login_otp_code,
            expires_at=login_expires_at,
            purpose="login"
        )
        session.add(login_email_otp)
        session.commit()
        
        print(f"📧 Login OTP code: {login_otp_code}")
        
        # Test 4: Complete 2FA login
        print("\n📝 Test 4: Complete 2FA login (second factor)")
        result = await auth.db_auth(session, username, "testpassword", login_otp_code)
        
        if result and hasattr(result, 'username'):
            print(f"✅ Complete 2FA login successful for: {result.username}")
        else:
            print("❌ 2FA login failed")
        
        # Test 5: Disable 2FA
        print("\n📝 Test 5: Disabling 2FA")
        
        # Generate OTP for disabling directly
        disable_otp_code = f"{secrets.randbelow(900000) + 100000:06d}"
        disable_expires_at = datetime.now(UTC) + timedelta(minutes=10)
        
        # Create disable OTP entry directly
        disable_email_otp = EmailOTP(
            id=uuid4(),  # Generate new UUID
            user_id=test_user.id,
            otp_code=disable_otp_code,
            expires_at=disable_expires_at,
            purpose="disable"
        )
        session.add(disable_email_otp)
        session.commit()
        
        print(f"📧 Disable OTP code: {disable_otp_code}")
        
        # Disable 2FA
        success = await auth.disable_2fa(session, test_user.id, disable_otp_code)
        print(f"✅ 2FA Disable: {'Success' if success else 'Failed'}")
        
        # Test 6: Login after disabling 2FA
        print("\n📝 Test 6: Login after disabling 2FA")
        result = await auth.db_auth(session, username, "testpassword")
        
        if result and hasattr(result, 'username'):
            print(f"✅ Login successful after disabling 2FA: {result.username}")
        else:
            print("❌ Login failed after disabling 2FA")
        
        # Cleanup
        session.delete(test_user)
        session.commit()
        print("\n🧹 Cleanup completed")
    
    print("\n🎉 2FA testing completed!")

if __name__ == "__main__":
    # Check required environment variables
    required_vars = ["PAPERMERGE__SECURITY__SECRET_KEY", "PAPERMERGE__DATABASE__URL"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print("❌ Missing required environment variables:")
        for var in missing_vars:
            print(f"   - {var}")
        print("\nPlease set these variables and try again.")
        sys.exit(1)
    
    asyncio.run(test_2fa_flow())
