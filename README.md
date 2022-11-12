If you need a fastest, dirties and cheapest way of backing up AWS resources on S3. Look no more.

### Step 1: Create a lambda function
Copy paste the content of the backup.js into a NodeJS task on Lambda. 

### Step 2: Create Roles
You need the following roles
```
- Effect: "Allow"
  Action:
  - dynamodb:ListTables
  - dynamodb:Scan
  Resource: { 'Fn::Join': [ ':', [ 'arn:aws:dynamodb', { Ref: 'AWS::Region' }, { Ref: 'AWS::AccountId' }, 'table/*' ] ] }
  - Effect: "Allow"
  Action:
  - s3:putObject
  Resource: 'arn:aws:s3:::handl-backup/*'
  - Effect: "Allow"
  Action:
  - cognito-idp:ListIdentityPools
  - cognito-idp:ListUsers
  Resource: { 'Fn::Join': [ ':', [ 'arn:aws:cognito-idp', { Ref: 'AWS::Region' }, { Ref: 'AWS::AccountId' }, 'userpool/*' ] ] }
```

### Step 3: Create EventBridge Schedules
Create two recurring schedulers for everyday and trigger the same lambda function (from Step 1) with the following payloads

```
{
    "method": "dynamodb"
}

{
    "method": "cognito"
}
```

