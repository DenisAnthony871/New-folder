import os
import logging
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_ollama import ChatOllama
from config import LLM_MODEL, SUPPORTED_MODELS
from secrets_loader import get_secret

logger = logging.getLogger(__name__)

_OLLAMA_BASE = os.environ.get("OLLAMA_HOST", "http://localhost:11434").rstrip("/")


def get_llm(model_name: str = LLM_MODEL):
    """
    Instantiate the correct LangChain LLM for the given model name.
    Falls back to the default local model if the requested model
    is unavailable due to a missing API key.
    """
    config = SUPPORTED_MODELS.get(model_name)
    if not config:
        logger.warning(f"Unknown model '{model_name}', falling back to {LLM_MODEL}")
        return ChatOllama(model=LLM_MODEL, timeout=60, base_url=_OLLAMA_BASE)

    provider = config["provider"]
    env_key = config["env_key"]

    if provider == "ollama":
        return ChatOllama(model=model_name, timeout=60, base_url=_OLLAMA_BASE)

    # Cloud model — verify API key present before attempting instantiation
    api_key_value = get_secret(env_key) if env_key else None
    if not api_key_value:
        logger.warning(
            f"Model '{model_name}' requires {env_key} but it is not set. "
            f"Falling back to {LLM_MODEL}."
        )
        return ChatOllama(model=LLM_MODEL, timeout=60, base_url=_OLLAMA_BASE)

    try:
        if provider == "anthropic":
            from langchain_anthropic import ChatAnthropic
            return ChatAnthropic(
                model=model_name,
                timeout=60,
                api_key=api_key_value,
            )

        if provider == "openai":
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(
                model=model_name,
                timeout=60,
                api_key=api_key_value,
            )

        if provider == "google":
            from langchain_google_genai import ChatGoogleGenerativeAI
            return ChatGoogleGenerativeAI(
                model=model_name,
                google_api_key=api_key_value,
            )

    except Exception as e:
        logger.error(
            f"Failed to instantiate model '{model_name}': {e}. "
            f"Falling back to {LLM_MODEL}."
        )
        return ChatOllama(model=LLM_MODEL, timeout=60, base_url=_OLLAMA_BASE)

    logger.warning(f"Unknown provider '{provider}', falling back to {LLM_MODEL}")
    return ChatOllama(model=LLM_MODEL, timeout=60, base_url=_OLLAMA_BASE)


# Rewrite chain always uses the local model — no API cost on retries
response_model = ChatOllama(model=LLM_MODEL, timeout=60, base_url=_OLLAMA_BASE)

REWRITE_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are a query optimization tool for Jio knowledge base. "
        "Transform vague queries into specific, searchable questions. "
        "Output ONLY the improved query."
    ),
    ("user", "Original: {question}\n\nImproved:"),
])

rewrite_chain = REWRITE_PROMPT | response_model | StrOutputParser()
