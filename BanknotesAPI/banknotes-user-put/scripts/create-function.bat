aws iam create-role --role-name banknotes-user-put-exec-role --assume-role-policy-document file://trusted-policy.json

aws iam create-policy --policy-name banknotes-user-put-policies --policy-document file://policies.json

aws iam attach-role-policy --policy-arn arn:aws:iam::340810739314:policy/banknotes-user-put-policies --role-name banknotes-user-put-exec-role

call ./build-function.bat

aws lambda create-function --function-name banknotes-user-put^
   --runtime nodejs20.x^
   --role arn:aws:iam::340810739314:role/banknotes-user-put-exec-role^
   --handler main.handler^
   --zip-file fileb://../target/banknotes.zip^
   --description "BanknotesAPI operation function"^
   --timeout 8^
   --memory-size 128^
   --layers arn:aws:lambda:eu-central-1:340810739314:layer:layer-user-put:4^
   --architectures arm64
