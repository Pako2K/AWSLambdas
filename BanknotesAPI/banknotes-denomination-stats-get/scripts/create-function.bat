aws iam create-role --role-name banknotes-denomination-stats-get-exec-role --assume-role-policy-document file://banknotes-denomination-stats-get-trusted-policy.json

aws iam create-policy --policy-name banknotes-denomination-stats-get-policies --policy-document file://banknotes-denomination-stats-get-policies.json

aws iam attach-role-policy --policy-arn arn:aws:iam::340810739314:policy/banknotes-denomination-stats-get-policies --role-name banknotes-denomination-stats-get-exec-role

call ./build-function.bat

aws lambda create-function --function-name banknotes-denomination-stats-get^
   --runtime nodejs20.x^
   --role arn:aws:iam::340810739314:role/banknotes-denomination-stats-get-exec-role^
   --handler main.handler^
   --zip-file fileb://../target/banknotes-denomination-stats-get.zip^
   --description "BanknotesAPI operation function"^
   --timeout 8^
   --memory-size 128^
   --layers arn:aws:lambda:eu-central-1:340810739314:layer:layer-common-functions:2^
   --architectures arm64
