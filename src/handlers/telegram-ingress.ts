import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Telegram webhook received:', JSON.stringify(event.body, null, 2));

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'OK' }),
  };
};
