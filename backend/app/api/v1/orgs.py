from fastapi import APIRouter, status

from app.models.org import OrgBootstrapRequest, OrgBootstrapResponse
from app.services.org_service import org_service

router = APIRouter()


@router.post("/bootstrap", response_model=OrgBootstrapResponse, status_code=status.HTTP_201_CREATED)
async def bootstrap_org(payload: OrgBootstrapRequest) -> OrgBootstrapResponse:
    return await org_service.bootstrap_org(payload)
