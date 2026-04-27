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


import sys

def test_get_llm_anthropic_with_key(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-fake-key")
    mock_module = MagicMock()
    sys.modules["langchain_anthropic"] = mock_module
    from importlib import reload
    import chains
    reload(chains)
    llm = chains.get_llm("claude-sonnet-4-6")
    mock_module.ChatAnthropic.assert_called_once()
    sys.modules.pop("langchain_anthropic", None)


def test_get_llm_openai_with_key(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-fake-openai-key")
    mock_module = MagicMock()
    sys.modules["langchain_openai"] = mock_module
    from importlib import reload
    import chains
    reload(chains)
    llm = chains.get_llm("gpt-4o-mini")
    mock_module.ChatOpenAI.assert_called_once()
    sys.modules.pop("langchain_openai", None)


def test_get_llm_google_with_key(monkeypatch):
    monkeypatch.setenv("GOOGLE_API_KEY", "fake-google-key")
    mock_module = MagicMock()
    sys.modules["langchain_google_genai"] = mock_module
    from importlib import reload
    import chains
    reload(chains)
    llm = chains.get_llm("gemini-2.0-flash")
    mock_module.ChatGoogleGenerativeAI.assert_called_once()
    sys.modules.pop("langchain_google_genai", None)


def test_rewrite_chain_exists():
    from chains import rewrite_chain
    assert rewrite_chain is not None


def test_response_model_is_ollama():
    from chains import response_model
    assert "ollama" in type(response_model).__module__.lower()
