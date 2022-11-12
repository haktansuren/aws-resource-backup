const util = require('util');
const zlib = require('zlib');
const gzip = util.promisify(zlib.gzip);

const bucket  = 'backup-folder'

exports.handler = async (event, context, callback) => {
    console.log(event);
    var AWS = require("aws-sdk");
    AWS.config.update({region:'us-east-1'});

    let dateObj = new Date();
    let month = dateObj.getUTCMonth() + 1; //months from 1-12
    let day = dateObj.getUTCDate();
    let year = dateObj.getUTCFullYear();

    let newdate = year + "/" + month + "/" + day;

    if (event.method == 'dynamodb'){
        let tables = []
        var dynamodb = new AWS.DynamoDB();
        var s3 = new AWS.S3();

        let params = {
            Bucket: bucket,
        }

        let tableObj = await dynamodb.listTables().promise()

        tables = tableObj.TableNames
        tables = removeItem(tables, 'xxxxx') //removing the tables we do not need to backup
        tables = removeItem(tables, 'xxxxx')

        if (tables.length > 0){
            console.log(tables)

            for (let table of tables){
                let dataContent = await scanTable(table)
                params.Key = `${bucket}/dynamodb/${newdate}/${table}.json.gz`
                params.Body = await gzip(JSON.stringify(dataContent))
                s3.putObject(params).promise();
            }
        }
    }else if (event.method == 'cognito'){
        let tables = []
        var cognito = new AWS.CognitoIdentityServiceProvider();
        var s3 = new AWS.S3();

        let params = {
            Bucket: bucket,
        }

        let poolIds = await scanPools()
        poolIds = removeItem(poolIds, 'us-east-1_xxxxxx')
        console.log(poolIds)


        if (poolIds.length > 0){
            console.log(poolIds)

            for (let poolId of poolIds){
                let dataContent = await scanUsersFromPool(poolId)
                params.Key = `${bucket}/cognito/${newdate}/${poolId}.json.gz`
                params.Body = await gzip(JSON.stringify(dataContent))
                s3.putObject(params).promise();
            }
        }

    }else{
        console.log("Not recognized method")
    }

    console.log("done")

    callback(null, event);
};

scanUsersFromPool = async(poolId) => {
    var AWS = require("aws-sdk");
    AWS.config.update({region:'us-east-1'});
    var cognito = new AWS.CognitoIdentityServiceProvider();

    const params = {
        UserPoolId: poolId
    };

    const scanResults = [];
    let items;
    do{
        items =  await cognito.listUsers(params).promise();
        items.Users.forEach((item) => scanResults.push(item));
        params.PaginationToken  = items.PaginationToken;
    }while(typeof items.PaginationToken !== "undefined");

    return scanResults;
}

scanPools = async () => {
    var AWS = require("aws-sdk");
    AWS.config.update({region:'us-east-1'});
    var cognito = new AWS.CognitoIdentityServiceProvider();

    const params = {
        MaxResults: 60,
    };

    const scanResults = [];
    let items;
    do{
        items =  await cognito.listUserPools(params).promise();
        items.UserPools.forEach((item) => scanResults.push(item.Id));
        params.NextToken  = items.NextToken;
    }while(typeof items.NextToken !== "undefined");

    return scanResults;
}

scanTable = async (tableName) => {
    var AWS = require("aws-sdk");
    AWS.config.update({region:'us-east-1'});
    var dynamodb = new AWS.DynamoDB();

    const params = {
        TableName: tableName,
    };

    const scanResults = [];
    let items;
    do{
        items =  await dynamodb.scan(params).promise();
        items.Items.forEach((item) => scanResults.push(item));
        params.ExclusiveStartKey  = items.LastEvaluatedKey;
    }while(typeof items.LastEvaluatedKey !== "undefined");

    return scanResults;
};

function removeItem(arr, val){
    const index = arr.indexOf(val);
    if (index > -1) {
        arr.splice(index, 1);
    }
    return arr;
}


if (require.main === module) {
    require('dotenv').config();

    let event = {
        "method": "cognito" //dynamodb, cognito
    }
    exports.handler(event,'',function(){});
}