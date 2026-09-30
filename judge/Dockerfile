FROM docker.io/cloudflare/sandbox:0.12.10 AS bwrap-build
USER root
RUN apt-get update && apt-get install -y --no-install-recommends build-essential meson ninja-build pkg-config libcap-dev ca-certificates curl && rm -rf /var/lib/apt/lists/*
# Bubblewrap v0.13.0, pinned to its source revision. Jammy's 0.6 lacks --size.
RUN mkdir /src && curl -fsSL https://codeload.github.com/containers/bubblewrap/tar.gz/52d23329a689f64a8b601f8b999affb69b9339ac | tar -xz --strip-components=1 -C /src \
    && meson setup /src/build /src -Dman=disabled -Dtests=false -Dselinux=disabled \
    && ninja -C /src/build

FROM docker.io/cloudflare/sandbox:0.12.10
USER root
RUN apt-get update && apt-get install -y --no-install-recommends libcap2 python3 && rm -rf /var/lib/apt/lists/*
COPY --from=bwrap-build /src/build/bwrap /usr/bin/bwrap
COPY runner.py limits.py /opt/judge/
RUN chmod 0555 /opt/judge/runner.py /opt/judge/limits.py && bwrap --help | grep -- --size
EXPOSE 3000
