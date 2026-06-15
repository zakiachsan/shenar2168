import pool from './db';

export interface ChatSettings {
  greeting_message: string;
  offline_message: string;
}

// Get all chat settings
export async function getChatSettings(): Promise<ChatSettings> {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT setting_key, setting_value FROM chat_settings'
    );
    const settings: Record<string, string> = {};
    (rows as any[]).forEach((row) => {
      settings[row.setting_key] = row.setting_value || '';
    });
    return {
      greeting_message: settings.greeting_message || 'Halo! 👋 Selamat datang. Ada yang bisa kami bantu?',
      offline_message: settings.offline_message || 'Terima kasih telah menghubungi kami. Saat ini admin sedang offline. Kami akan membalas pesan Anda segera.',
    };
  } finally {
    connection.release();
  }
}

// Update chat settings
export async function updateChatSettings(settings: Partial<ChatSettings>): Promise<void> {
  const connection = await pool.getConnection();
  try {
    for (const [key, value] of Object.entries(settings)) {
      await connection.execute(
        'INSERT INTO chat_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [key, value, value]
      );
    }
  } finally {
    connection.release();
  }
}
