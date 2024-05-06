aws iam create-role --role-name banknotes-item-post-exec-role --assume-role-policy-document file://trusted-policy.json

aws iam create-policy --policy-name banknotes-item-post-policies --policy-document file://policies.json

aws iam attach-role-policy --policy-arn arn:aws:iam::340810739314:policy/banknotes-item-post-policies --role-name banknotes-item-post-exec-role

call ./build-function.bat

aws lambda create-function --function-name banknotes-item-post^
   --runtime nodejs20.x^
   --role arn:aws:iam::340810739314:role/banknotes-item-post-exec-role^
   --handler main.handler^
   --zip-file fileb://../target/banknotes.zip^
   --description "BanknotesAPI operation function"^
   --timeout 8^
   --memory-size 128^
   --layers arn:aws:lambda:eu-central-1:340810739314:layer:layer-common-functions:2^
   --architectures arm64
