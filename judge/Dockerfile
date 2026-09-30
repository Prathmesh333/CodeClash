FROM docker.io/cloudflare/sandbox:0.12.10
USER root
RUN apt-get update && apt-get install -y --no-install-recommends bubblewrap python3 && rm -rf /var/lib/apt/lists/*
COPY runner.py limits.py /opt/judge/
RUN chmod 0555 /opt/judge/runner.py /opt/judge/limits.py
EXPOSE 3000
