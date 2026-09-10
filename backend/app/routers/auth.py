from fastapi import APIRouter, Depends, Response, status

from ..auth import auth_service, current_token, optional_token
from ..models import AuthStatus, LoginRequest, LoginResponse

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=LoginResponse, operation_id="login")
def login(payload: LoginRequest) -> LoginResponse:
    token = auth_service.login(payload.passcode)
    if not token:
        return LoginResponse(authenticated=False)
    return LoginResponse(authenticated=True, accessToken=token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, operation_id="logout")
def logout(token: str = Depends(current_token)) -> Response:
    auth_service.logout(token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/session", response_model=AuthStatus, operation_id="isAuthenticated")
def session(token: str | None = Depends(optional_token)) -> AuthStatus:
    return AuthStatus(authenticated=token is not None)
