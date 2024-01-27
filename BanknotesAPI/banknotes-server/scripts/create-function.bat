aws iam create-role --role-name banknotes-api-server-exec-role --assume-role-policy-document file://banknotes-api-server-trusted-policy.json

aws iam create-policy --policy-name banknotes-api-server-policies --policy-document file://banknotes-api-server-policies.json

aws iam attach-role-policy --policy-arn arn:aws:iam::340810739314:policy/banknotes-api-server-policies --role-name banknotes-api-server-exec-role

call ./build-layer.bat
call ./deploy-layer.bat

call ./build-function.bat

aws lambda create-function --function-name banknotes-api-server^
   --runtime nodejs20.x^
   --role arn:aws:iam::340810739314:role/banknotes-api-server-exec-role^
   --handler main.handler^
   --zip-file fileb://../target/banknotes-api-server.zip^
   --description "BanknotesAPI server function"^
   --timeout 10^
   --memory-size 128^
   --layers arn:aws:lambda:eu-central-1:340810739314:layer:layer-api-server:8 arn:aws:lambda:eu-central-1:340810739314:layer:layer-common-functions:2^
   --architectures arm64

aws lambda create-function-url-config --function-name banknotes-api-server --auth-type NONE --invoke-mode BUFFERED

aws lambda add-permission --function-name banknotes-api-server --action lambda:InvokeFunctionUrl --statement-id FunctionURLAllowPublicAccess --principal * --function-url-auth-type NONE
 