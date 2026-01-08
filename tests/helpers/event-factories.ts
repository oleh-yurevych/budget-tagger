import { APIGatewayProxyEvent, Context, SQSEvent, SQSRecord } from 'aws-lambda';

/**
 * Create a mock API Gateway event for testing Lambda handlers
 */
export function createAPIGatewayEvent(
  overrides: Partial<APIGatewayProxyEvent> = {}
): APIGatewayProxyEvent {
  return {
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/telegram/ingress',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      accountId: '123456789',
      apiId: 'test-api-id',
      authorizer: null,
      protocol: 'HTTP/1.1',
      httpMethod: 'POST',
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        clientCert: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: '127.0.0.1',
        user: null,
        userAgent: 'test-agent',
        userArn: null,
      },
      path: '/telegram/ingress',
      stage: 'test',
      requestId: 'test-request-id',
      requestTimeEpoch: Date.now(),
      resourceId: 'test-resource-id',
      resourcePath: '/telegram/ingress',
    },
    resource: '/telegram/ingress',
    ...overrides,
  };
}

/**
 * Create a mock SQS event for testing Lambda handlers
 */
export function createSQSEvent(
  records: Array<{ body: string; messageId?: string }>
): SQSEvent {
  return {
    Records: records.map((record, idx) => ({
      messageId: record.messageId || `msg-${idx}-${Date.now()}`,
      receiptHandle: `receipt-handle-${idx}`,
      body: record.body,
      attributes: {
        ApproximateReceiveCount: '1',
        SentTimestamp: Date.now().toString(),
        SenderId: 'test-sender',
        ApproximateFirstReceiveTimestamp: Date.now().toString(),
      },
      messageAttributes: {},
      md5OfBody: 'test-md5',
      eventSource: 'aws:sqs',
      eventSourceARN: 'arn:aws:sqs:us-east-1:123456789:test-queue',
      awsRegion: 'us-east-1',
    })),
  };
}

/**
 * Create a mock Lambda context
 */
export function createLambdaContext(): Context {
  return {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'test-function',
    functionVersion: '1',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789:function:test',
    memoryLimitInMB: '256',
    awsRequestId: 'test-request-id',
    logGroupName: '/aws/lambda/test',
    logStreamName: '2025/11/23/[$LATEST]test',
    getRemainingTimeInMillis: () => 30000,
    done: () => {},
    fail: () => {},
    succeed: () => {},
  };
}
