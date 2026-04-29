"""Docker Secrets Loader — secure credential resolution.

Resolution order (first match wins):
  1. Docker secret file at /run/secrets/<name>
  2. Environment variable
  3. Caller-supplied default (or None)

Docker mounts secrets as single-line files under /run/secrets/.  This module
reads them once at import time (or on first call) and caches the result so the
application never holds secret material longer than necessary in hot paths.

Usage
-----
    from secrets_loader import get_secret

    API_KEY = get_secret("JIO_RAG_API_KEY")
    LANGCHAIN_KEY = get_secret("LANGCHAIN_API_KEY", default="")
"""

import os
import logging

logger = logging.getLogger(__name__)

_SECRETS_DIR = "/run/secrets"

# Module-level cache — avoids repeated filesystem reads.
_cache: dict[str, str | None] = {}


def get_secret(name: str, *, default: str | None = None) -> str | None:
    """Resolve a secret value with Docker-secrets-first priority.

    Parameters
    ----------
    name:
        The secret name.  Must match both the Docker secret mount name
        *and* the environment variable name (convention over configuration).
    default:
        Fallback returned when neither the secret file nor the env var exist.

    Returns
    -------
    The resolved value (stripped of trailing newlines) or *default*.
    """
    if name in _cache:
        return _cache[name]

    # 1. Docker secret file
    secret_path = os.path.join(_SECRETS_DIR, name)
    try:
        if os.path.isfile(secret_path):
            with open(secret_path, "r", encoding="utf-8") as fh:
                value = fh.read().strip()
            if value:
                logger.info(f"Secret '{name}' loaded from Docker secret")
                _cache[name] = value
                return value
    except (OSError, PermissionError) as exc:
        logger.warning(f"Could not read Docker secret '{name}': {exc}")

    # 2. Environment variable
    env_value = os.environ.get(name)
    if env_value:
        logger.debug(f"Secret '{name}' loaded from environment variable")
        _cache[name] = env_value
        return env_value

    # 3. Default
    _cache[name] = default
    return default


def clear_cache() -> None:
    """Clear the cached secrets.  Useful in tests."""
    _cache.clear()
