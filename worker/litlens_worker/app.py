"""Modal app definition (structure only; no Modal account is needed yet).

Real jobs (PDF parsing with Docling, embedding, long LLM jobs) arrive in later slices.
Deploying needs `modal setup` first, which we do once an account exists.
"""

import modal

app = modal.App("litlens-worker")

# The container image the jobs will run in. Heavy libraries (Docling) get added here
# later, never in api/ or packages/core.
image = modal.Image.debian_slim(python_version="3.12")


@app.function(image=image)
def ping() -> str:
    """Smallest possible job, used to prove the worker is wired up."""
    return "pong"
