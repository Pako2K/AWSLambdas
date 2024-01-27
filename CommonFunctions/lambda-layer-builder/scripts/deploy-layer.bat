aws lambda publish-layer-version --layer-name layer-common-functions^
    --description "Layer for the common functions"^
    --license-info "MIT"^
    --zip-file fileb://../target/layer-common-functions.zip^
    --compatible-runtimes "nodejs20.x"^
    --compatible-architectures "arm64" "x86_64"