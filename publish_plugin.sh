#!/usr/bin/env bash
set -euo pipefail

if [ -z "${WINDY_API_KEY:-}" ]; then
    echo "WINDY_API_KEY not set" >&2
    exit 1
fi

repo_name="artis-byte/NL-solar"
repo_owner="artis-byte"
commit_sha=$(git rev-parse HEAD)

(
    cd knmi-windy-plugin
    npm install
    npm run build

    cd dist
    printf '{"repositoryName":"%s","commitSha":"%s","repositoryOwner":"%s"}\n' "$repo_name" "$commit_sha" "$repo_owner" > /tmp/plugin-info.json
    mv plugin.json /tmp/orig-plugin.json
    jq -s '.[0] * .[1]' /tmp/orig-plugin.json /tmp/plugin-info.json > plugin.json

    tar cf ../plugin.tar .

    curl -X POST 'https://node.windy.com/plugins/v1.0/upload' \
         -H "x-windy-api-key: $WINDY_API_KEY" \
         -F "plugin_archive=@../plugin.tar"
)

