# syntax=docker/dockerfile:1

FROM golang:1.24-alpine AS minio-builder

ARG MINIO_VERSION=RELEASE.2025-10-15T17-29-55Z
ARG MINIO_COMMIT=9e49d5e7a648f00e26f2246f4dc28e6b07f8c84a
RUN --mount=type=cache,id=colaqui-go-mod,target=/go/pkg/mod \
    --mount=type=cache,id=colaqui-go-build,target=/root/.cache/go-build \
    CGO_ENABLED=0 go install -trimpath -tags kqueue \
    -ldflags="-s -w \
      -X github.com/minio/minio/cmd.Version=2025-10-15T17:29:55Z \
      -X github.com/minio/minio/cmd.CopyrightYear=2025 \
      -X github.com/minio/minio/cmd.ReleaseTag=RELEASE.2025-10-15T17-29-55Z \
      -X github.com/minio/minio/cmd.CommitID=${MINIO_COMMIT} \
      -X github.com/minio/minio/cmd.ShortCommitID=9e49d5e7a648 \
      -X github.com/minio/minio/cmd.GOPATH=/go \
      -X github.com/minio/minio/cmd.GOROOT=/usr/local/go" \
    "github.com/minio/minio@${MINIO_VERSION}"

FROM golang:1.24-alpine AS mc-builder

ARG MC_VERSION=RELEASE.2025-08-13T08-35-41Z
ARG MC_COMMIT=7394ce0dd2a80935aded936b09fa12cbb3cb8096
RUN --mount=type=cache,id=colaqui-go-mod,target=/go/pkg/mod \
    --mount=type=cache,id=colaqui-go-build,target=/root/.cache/go-build \
    CGO_ENABLED=0 go install -trimpath -tags kqueue \
    -ldflags="-s -w \
      -X github.com/minio/mc/cmd.Version=2025-08-13T08:35:41Z \
      -X github.com/minio/mc/cmd.CopyrightYear=2025 \
      -X github.com/minio/mc/cmd.ReleaseTag=RELEASE.2025-08-13T08-35-41Z \
      -X github.com/minio/mc/cmd.CommitID=${MC_COMMIT} \
      -X github.com/minio/mc/cmd.ShortCommitID=7394ce0dd2a8" \
    "github.com/minio/mc@${MC_VERSION}"

FROM alpine:3.22 AS server

RUN apk add --no-cache ca-certificates curl
COPY --from=minio-builder /go/bin/minio /usr/local/bin/minio

EXPOSE 9000 9001
ENTRYPOINT ["/usr/local/bin/minio"]

FROM alpine:3.22 AS client

RUN apk add --no-cache ca-certificates
COPY --from=mc-builder /go/bin/mc /usr/local/bin/mc

ENTRYPOINT ["/usr/local/bin/mc"]
