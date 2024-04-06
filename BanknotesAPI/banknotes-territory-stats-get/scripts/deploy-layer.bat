aws lambda publish-layer-version --layer-name layer-territory-stats-get^
    --description "Layer for the territory-stats-get Lambda function"^
    --license-info "MIT"^
    --zip-file fileb://../target/layer-api.zip^
    --compatible-runtimes "nodejs20.x"^
    --compatible-architectures "arm64" "x86_64"