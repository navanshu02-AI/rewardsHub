from typing import List

from fastapi import APIRouter, Depends, status

from app.api.dependencies import get_current_admin_user, get_current_user
from app.models.recognition import Recognition, RecognitionCreate
from app.models.user import User
from app.services.recognition_service import recognition_service


router = APIRouter()


@router.post(
    "/",
    response_model=Recognition,
    status_code=status.HTTP_201_CREATED,
    responses={
        status.HTTP_400_BAD_REQUEST: {
            "description": "Validation error (e.g., insufficient balance, self-recognition)"
        },
        status.HTTP_403_FORBIDDEN: {
            "description": "The giver is not authorized to recognize the requested colleague"
        },
    },
)
async def create_recognition(
    payload: RecognitionCreate,
    current_user: User = Depends(get_current_user)
) -> Recognition:
    """Create a recognition for the specified recipients.

    Expected payload::

        {
            "to_user_id": "recipient-id",  # or "to_user_ids": ["id1", "id2"]
            "message": "Thank you for the great work!",
            "points_awarded": 50,
            "recognition_type": "peer_to_peer",
            "achievement_type": null,
            "is_public": true,
            "require_approval": false,
            "deduct_from_giver": true
        }

    ``403`` is returned for authorization failures while ``400`` captures validation issues.
    """

    return await recognition_service.create_recognition(current_user, payload)


@router.get("/sent", response_model=List[Recognition])
async def list_sent_recognitions(current_user: User = Depends(get_current_user)) -> List[Recognition]:
    """List recognitions created by the authenticated user."""

    return await recognition_service.list_sent_recognitions(current_user.id)


@router.get("/received", response_model=List[Recognition])
async def list_received_recognitions(current_user: User = Depends(get_current_user)) -> List[Recognition]:
    """List recognitions received by the authenticated user."""

    return await recognition_service.list_received_recognitions(current_user.id)


@router.post(
    "/{recognition_id}/approve",
    response_model=Recognition,
    responses={
        status.HTTP_400_BAD_REQUEST: {"description": "Recognition could not be approved"},
        status.HTTP_404_NOT_FOUND: {"description": "Recognition not found"},
    },
)
async def approve_recognition(
    recognition_id: str,
    current_user: User = Depends(get_current_admin_user)
) -> Recognition:
    """Approve a pending recognition (HR/executive access required)."""

    return await recognition_service.approve_recognition(recognition_id, current_user)

