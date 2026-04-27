import pytest
from unittest.mock import patch, MagicMock, ANY
import os


def test_get_llm_returns_ollama_for_local_model():
    from chains import get_llm
    llm = get_llm("llama3.2:3b")
    assert "ollama" in type(llm).__module__.lower()


def test_get_llm_unknown_model_falls_back_to_default():
    from chains import get_llm
    llm = get_llm("totally-fake-model-xyz")
    assert "ollama" in type(llm).__module__.lower()


def test_get_llm_cloud_model_missing_key_falls_back(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    from chains import get_llm
    llm = get_llm("claude-sonnet-4-6")
    # Should fall back to Ollama, not raise
    assert "ollama" in type(llm).__module__.lower()


def test_get_llm_anthropic_with_key(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-fake-key")
    with patch("langchain_anthropic.ChatAnthropic") as mock_cls:
        mock_cls.return_value = MagicMock()
        from importlib import reload
        import chains
        reload(chains)
        llm = chains.get_llm("claude-sonnet-4-6")
        mock_cls.assert_called_once()


def test_get_llm_openai_with_key(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-fake-openai-key")
    with patch("langchain_openai.ChatOpenAI") as mock_cls:
        mock_cls.return_value = MagicMock()
        from importlib import reload
        import chains
        reload(chains)
        llm = chains.get_llm("gpt-4o-mini")
        mock_cls.assert_called_once()


def test_get_llm_google_with_key(monkeypatch):
    monkeypatch.setenv("GOOGLE_API_KEY", "fake-google-key")
    with patch("langchain_google_genai.ChatGoogleGenerativeAI") as mock_cls:
        mock_cls.return_value = MagicMock()
        from importlib import reload
        import chains
        reload(chains)
        llm = chains.get_llm("gemini-2.0-flash")
        mock_cls.assert_called_once()


def test_rewrite_chain_exists():
    from chains import rewrite_chain
    assert rewrite_chain is not None


def test_response_model_is_ollama():
    from chains import response_model
    assert "ollama" in type(response_model).__module__.lower()
