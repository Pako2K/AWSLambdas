aws lambda publish-layer-version --layer-name layer-user-session-get^
    --description "Layer for the user-session-get Lambda function"^
    --license-info "MIT"^
    --zip-file fileb://../target/layer-api.zip^
    --compatible-runtimes "nodejs20.x"^
    --compatible-architectures "arm64" "x86_64"