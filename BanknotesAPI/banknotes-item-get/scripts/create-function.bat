aws iam create-role --role-name banknotes-item-get-exec-role --assume-role-policy-document file://banknotes-item-get-trusted-policy.json

aws iam create-policy --policy-name banknotes-item-get-policies --policy-document file://banknotes-item-get-policies.json

aws iam attach-role-policy --policy-arn arn:aws:iam::340810739314:policy/banknotes-item-get-policies --role-name banknotes-item-get-exec-role

call ./build-function.bat

aws lambda create-function --function-name banknotes-item-get^
   --runtime nodejs20.x^
   --role arn:aws:iam::340810739314:role/banknotes-item-get-exec-role^
   --handler main.handler^
   --zip-file fileb://../target/banknotes-item-get.zip^
   --description "BanknotesAPI operation function"^
   --timeout 8^
   --memory-size 128^
   --layers arn:aws:lambda:eu-central-1:340810739314:layer:layer-common-functions:2^
   --architectures arm64
