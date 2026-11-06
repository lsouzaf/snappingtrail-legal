# The videos are made in Playwright's own image (the same browser, libraries and fonts as the
# captures) plus ffmpeg, to record and assemble, and espeak-ng, the provisional voice. The host
# installs nothing.
FROM mcr.microsoft.com/playwright:v1.64.1-noble
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg espeak-ng \
 && rm -rf /var/lib/apt/lists/*
