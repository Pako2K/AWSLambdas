aws iam create-role --role-name banknotes-db-exec-role --assume-role-policy-document file://banknotes-db-trusted-policy.json

aws iam create-policy --policy-name banknotes-db-policies --policy-document file://banknotes-db-policies.json

aws iam attach-role-policy --policy-arn arn:aws:iam::340810739314:policy/banknotes-db-policies --role-name banknotes-db-exec-role

call ./build-function.bat

aws lambda create-function --function-name banknotes-db^
   --runtime nodejs20.x^
   --role arn:aws:iam::340810739314:role/banknotes-db-exec-role^
   --handler main.handler^
   --zip-file fileb://../target/banknotes-db.zip^
   --description "Banknotes DB adapter function"^
   --timeout 6^
   --memory-size 128^
   --layers arn:aws:lambda:eu-central-1:340810739314:layer:layer-common-functions:1 arn:aws:lambda:eu-central-1:340810739314:layer:layer-pg:1^
   --architectures arm64
 