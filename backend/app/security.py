import re
from typing import Any, List

# Common API key and sensitive token regex patterns (Defense in Depth)
SECRETS_PATTERNS = [
    re.compile(r"AIzaSy[A-Za-z0-9_-]{30,40}"),  # Google / Gemini API Key
    re.compile(r"sk_(?:live|test)_[0-9a-zA-Z]{24,32}"),  # Stripe API Key
    re.compile(r"Bearer\s+([A-Za-z0-9\-._~+/]+=*)", re.IGNORECASE)  # Generic Bearer Token
]

def sanitize_text(text: str, secrets: List[str]) -> str:
    """
    Scrubs specific secrets and generic secret patterns from a string, replacing them with [REDACTED].
    """
    if not isinstance(text, str):
        return text

    # Redact specific secrets passed (e.g. user-entered API keys or environment keys)
    if secrets:
        # Sort secrets by length descending to prevent sub-string truncation anomalies
        sorted_secrets = sorted([s for s in secrets if isinstance(s, str) and len(s) > 5], key=len, reverse=True)
        for secret in sorted_secrets:
            text = text.replace(secret, "[REDACTED]")

    # Redact common regex patterns
    for pattern in SECRETS_PATTERNS:
        text = pattern.sub("[REDACTED]", text)

    return text

def redact_secrets(data: Any, secrets: List[str]) -> Any:
    """
    Recursively scans and redacts secrets from dictionary and list structures.
    """
    if isinstance(data, str):
        return sanitize_text(data, secrets)
    elif isinstance(data, dict):
        return {k: redact_secrets(v, secrets) for k, v in data.items()}
    elif isinstance(data, list):
        return [redact_secrets(item, secrets) for item in data]
    return data
