# Docker Secrets Directory

This directory holds **secret files** consumed by Docker Compose.
Each file contains a single secret value.  Trailing whitespace and
newlines are automatically stripped by `secrets_loader.py`.

## Setup

Create one file per **required** secret:

```bash
# Required — API authentication
printf '%s' 'your-jio-rag-api-key' > secrets/JIO_RAG_API_KEY

# Required — LangSmith tracing
printf '%s' 'your-langchain-api-key' > secrets/LANGCHAIN_API_KEY
```

> **Note:** `echo` also works (`echo "value" > secrets/NAME`) because
> `secrets_loader.py` calls `.strip()` on every value it reads.

### Optional cloud-LLM keys

Cloud-provider keys (Anthropic, OpenAI, Google) are **not** required
as Docker secrets.  `secrets_loader.get_secret()` falls back to
environment variables, so you can pass them via `.env.docker` or
the host environment instead.

If you prefer to manage them as Docker secrets, create the files
and add matching entries to **both** the `secrets:` and service
`secrets:` blocks in `docker-compose.yml`:

```bash
printf '%s' 'your-anthropic-key' > secrets/ANTHROPIC_API_KEY
printf '%s' 'your-openai-key'    > secrets/OPENAI_API_KEY
printf '%s' 'your-google-key'    > secrets/GOOGLE_API_KEY
```

## How it works

1. `docker-compose.yml` defines each required secret with `file: ./secrets/<NAME>`
2. Docker mounts them **read-only** at `/run/secrets/<NAME>` inside the container
3. The application's `secrets_loader.py` reads from `/run/secrets/` first,
   then falls back to environment variables (for local dev without Docker)

## Security

- These files are excluded from Git via `.gitignore`
- These files are excluded from the Docker build context via `.dockerignore`
- They are **never** baked into the image — only mounted at runtime
- They are **invisible** to `docker inspect` (unlike `env_file` values)

## Generating a secure API key

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

