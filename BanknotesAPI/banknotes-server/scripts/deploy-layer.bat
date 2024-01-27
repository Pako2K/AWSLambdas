aws lambda publish-layer-version --layer-name layer-api-server^
    --description "Layer for the API Server Lambda function"^
    --license-info "MIT"^
    --zip-file fileb://../target/layer-api-server.zip^
    --compatible-runtimes "nodejs20.x"^
    --compatible-architectures "arm64" "x86_64"