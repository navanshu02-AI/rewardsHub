import asyncio
import importlib

import pytest

from app.core.config import Settings


def test_gemini_disabled_without_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    import app.services.gemini_service as gemini_service_module

    importlib.reload(gemini_service_module)
    service = gemini_service_module.GeminiService()

    assert service.enabled is False

    with pytest.raises(ValueError, match="Gemini API is disabled"):
        asyncio.run(service.ask_gemini("Hello"))


def test_ai_features_flag_defaults_to_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    settings = Settings()

    assert settings.AI_FEATURES_ENABLED is False

    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    settings_with_key = Settings()

    assert settings_with_key.AI_FEATURES_ENABLED is True


def test_expose_reset_token_defaults_false_without_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("EXPOSE_RESET_TOKEN_IN_RESPONSE", raising=False)
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    monkeypatch.setenv("ENV", "production")
    monkeypatch.setenv("SECRET_KEY", "test-secret")

    settings = Settings()

    assert settings.EXPOSE_RESET_TOKEN_IN_RESPONSE is False
