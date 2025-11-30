#!/usr/bin/env bash
set -eu

echo; echo "### main"
docker run --rm -it ghcr.io/jobscale/llama.cpp:main bash -c "TZ=Asia/Tokyo ls -ltr bin | tail -3"

echo; echo "### gemma-3n-E4B-Q5"
docker run --rm -it ghcr.io/jobscale/llama.cpp:gemma-3n-E4B-Q5 bash -c "TZ=Asia/Tokyo ls -ltr bin | tail -3"

echo; echo "### gemma-3n-E4B-Q4"
docker run --rm -it ghcr.io/jobscale/llama.cpp:gemma-3n-E4B-Q4 bash -c "TZ=Asia/Tokyo ls -ltr bin | tail -3"

echo; echo "### gemma-3n-E2B-Q5"
docker run --rm -it ghcr.io/jobscale/llama.cpp:gemma-3n-E2B-Q5 bash -c "TZ=Asia/Tokyo ls -ltr bin | tail -3"

echo; echo "### gemma-3n-E2B-Q4"
docker run --rm -it ghcr.io/jobscale/llama.cpp:gemma-3n-E2B-Q4 bash -c "TZ=Asia/Tokyo ls -ltr bin | tail -3"

echo; echo "### Phi-4"
docker run --rm -it ghcr.io/jobscale/llama.cpp:Phi-4 bash -c "TZ=Asia/Tokyo ls -ltr bin | tail -3"

echo; echo "### Llama-3"
docker run --rm -it ghcr.io/jobscale/llama.cpp:Llama-3 bash -c "TZ=Asia/Tokyo ls -ltr bin | tail -3"
