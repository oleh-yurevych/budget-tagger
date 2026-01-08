/**
 * Test fixtures for Telegram webhook payloads
 */

export const telegramFixtures = {
  /**
   * Valid Telegram webhook update with a text message
   */
  textMessage: {
    update_id: 123456789,
    message: {
      message_id: 1,
      from: {
        id: 987654321,
        is_bot: false,
        first_name: 'John',
        last_name: 'Doe',
        username: 'johndoe',
        language_code: 'en',
      },
      chat: {
        id: 987654321,
        first_name: 'John',
        last_name: 'Doe',
        username: 'johndoe',
        type: 'private',
      },
      date: 1700000000,
      text: 'Hello from test user!',
    },
  },

  /**
   * Telegram update with a command
   */
  startCommand: {
    update_id: 123456790,
    message: {
      message_id: 2,
      from: {
        id: 987654321,
        is_bot: false,
        first_name: 'John',
        username: 'johndoe',
      },
      chat: {
        id: 987654321,
        type: 'private',
      },
      date: 1700000001,
      text: '/start',
      entities: [
        {
          offset: 0,
          length: 6,
          type: 'bot_command',
        },
      ],
    },
  },

  /**
   * Telegram update with a numeric message (transaction amount)
   */
  numericMessage: {
    update_id: 123456791,
    message: {
      message_id: 3,
      from: {
        id: 987654321,
        is_bot: false,
        username: 'johndoe',
      },
      chat: {
        id: 987654321,
        type: 'private',
      },
      date: 1700000002,
      text: '150.50',
    },
  },

  /**
   * Telegram callback query (button press)
   */
  callbackQuery: {
    update_id: 123456792,
    callback_query: {
      id: 'callback-123',
      from: {
        id: 987654321,
        is_bot: false,
        username: 'johndoe',
      },
      message: {
        message_id: 10,
        date: 1700000003,
        chat: {
          id: 987654321,
          type: 'private',
        },
        text: 'Select a budget:',
      },
      chat_instance: 'test-chat-instance',
      data: 'budget:uuid-123',
    },
  },

  /**
   * Edited message update
   */
  editedMessage: {
    update_id: 123456793,
    edited_message: {
      message_id: 4,
      from: {
        id: 987654321,
        is_bot: false,
        username: 'johndoe',
      },
      chat: {
        id: 987654321,
        type: 'private',
      },
      date: 1700000004,
      edit_date: 1700000010,
      text: 'Edited text',
    },
  },
};

/**
 * Test fixtures for AWS Secrets Manager
 */
export const secretsFixtures = {
  telegramSecret: {
    Name: 'test-telegram-secret',
    SecretString: 'test-secret-token-12345',
  },
};

/**
 * Test fixtures for error scenarios
 */
export const errorFixtures = {
  invalidJson: 'not-valid-json{',
  emptyObject: {},
  missingUpdateId: {
    message: {
      text: 'test',
    },
  },
};

// Export individual fixtures for convenience
export const textMessage = telegramFixtures.textMessage;
export const startCommand = telegramFixtures.startCommand;
export const numericMessage = telegramFixtures.numericMessage;
export const callbackQuery = telegramFixtures.callbackQuery;
export const editedMessage = telegramFixtures.editedMessage;
