from __future__ import annotations

import hashlib
import hmac
import secrets
from dataclasses import dataclass, field

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer


security = HTTPBearer(auto_error=False)


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 210_000)
    return f"pbkdf2_sha256$210000${salt.hex()}${digest.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    algorithm, iterations, salt_hex, digest_hex = password_hash.split("$", 3)
    if algorithm != "pbkdf2_sha256":
        return False
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt_hex),
        int(iterations),
    )
    return hmac.compare_digest(digest.hex(), digest_hex)


@dataclass
class AuthService:
    passcode_hash: str = field(default_factory=lambda: hash_password("1234"))
    active_tokens: set[str] = field(default_factory=set)

    def login(self, passcode: str) -> str | None:
        if not verify_password(passcode.strip(), self.passcode_hash):
            return None
        token = secrets.token_urlsafe(32)
        self.active_tokens.add(token)
        return token

    def logout(self, token: str) -> None:
        self.active_tokens.discard(token)

    def is_token_valid(self, token: str | None) -> bool:
        return token in self.active_tokens if token else False


auth_service = AuthService()


def current_token(credentials: HTTPAuthorizationCredentials | None = Depends(security)) -> str:
    token = credentials.credentials if credentials and credentials.scheme.lower() == "bearer" else None
    if not auth_service.is_token_valid(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Authentication is required."},
            headers={"WWW-Authenticate": "Bearer"},
        )
    return token


def optional_token(credentials: HTTPAuthorizationCredentials | None = Depends(security)) -> str | None:
    token = credentials.credentials if credentials and credentials.scheme.lower() == "bearer" else None
    return token if auth_service.is_token_valid(token) else None
