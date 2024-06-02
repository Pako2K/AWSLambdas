aws lambda publish-layer-version --layer-name layer-user-validation-post^
    --description "Layer for the user-validation-post Lambda function"^
    --license-info "MIT"^
    --zip-file fileb://../target/layer-api.zip^
    --compatible-runtimes "nodejs20.x"^
    --compatible-architectures "arm64" "x86_64"