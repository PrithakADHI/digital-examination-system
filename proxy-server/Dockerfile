FROM ubuntu:22.04

# Avoid prompts from apt
ENV DEBIAN_FRONTEND=noninteractive

# Install runtimes and compilers
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    default-jdk \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN useradd -m runner
USER runner
WORKDIR /home/runner

# Use a shell script to handle execution with timeout
# This is a fallback to ensure we don't stick around too long
CMD ["tail", "-f", "/dev/null"]