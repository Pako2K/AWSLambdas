aws iam create-role --role-name banknotes-material-get-exec-role --assume-role-policy-document file://trusted-policy.json

aws iam create-policy --policy-name banknotes-material-get-policies --policy-document file://policies.json

aws iam attach-role-policy --policy-arn arn:aws:iam::340810739314:policy/banknotes-material-get-policies --role-name banknotes-material-get-exec-role

call ./build-function.bat

aws lambda create-function --function-name banknotes-material-get^
   --runtime nodejs20.x^
   --role arn:aws:iam::340810739314:role/banknotes-material-get-exec-role^
   --handler main.handler^
   --zip-file fileb://../target/banknotes-material-get.zip^
   --description "BanknotesAPI operation function"^
   --timeout 8^
   --memory-size 128^
   --layers arn:aws:lambda:eu-central-1:340810739314:layer:layer-common-functions:2^
   --architectures arm64
