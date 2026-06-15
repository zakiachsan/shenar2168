import pool from './db';
import { sendMessage } from './chat';
import { getChatSettings } from './chat-settings';

// Check if admin is offline and send offline message if needed
export async function checkAndSendOfflineMessage(threadId: number): Promise<boolean> {
  const connection = await pool.getConnection();
  try {
    // Get last admin message time
    const [rows] = await connection.execute(
      'SELECT created_at FROM chat_messages WHERE thread_id = ? AND sender_type = "admin" ORDER BY created_at DESC LIMIT 1',
      [threadId]
    );
    
    const adminMessages = rows as any[];
    
    // If admin never sent a message, or last admin message was more than 5 minutes ago
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    let shouldSendOffline = false;
    
    if (adminMessages.length === 0) {
      // Admin never responded
      shouldSendOffline = true;
    } else {
      const lastAdminTime = new Date(adminMessages[0].created_at);
      if (lastAdminTime < fiveMinutesAgo) {
        shouldSendOffline = true;
      }
    }
    
    if (shouldSendOffline) {
      // Check if we already sent offline message recently (within last 10 minutes)
      const [recentOffline] = await connection.execute(
        'SELECT id FROM chat_messages WHERE thread_id = ? AND sender_type = "admin" AND message LIKE "%offline%" AND created_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE) LIMIT 1',
        [threadId]
      );
      
      if ((recentOffline as any[]).length === 0) {
        // Send offline message
        const settings = await getChatSettings();
        if (settings.offline_message) {
          await sendMessage({
            threadId,
            senderType: 'admin',
            senderName: 'Admin',
            message: settings.offline_message,
          });
          return true;
        }
      }
    }
    
    return false;
  } finally {
    connection.release();
  }
}
