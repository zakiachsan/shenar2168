'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ChatContextType {
  isOpen: boolean;
  productId: number | null;
  productName: string;
  openChat: (productId?: number, productName?: string) => void;
  closeChat: () => void;
}

const ChatContext = createContext<ChatContextType>({
  isOpen: false,
  productId: null,
  productName: '',
  openChat: () => {},
  closeChat: () => {},
});

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [productId, setProductId] = useState<number | null>(null);
  const [productName, setProductName] = useState('');

  const openChat = useCallback((id?: number, name?: string) => {
    setProductId(id || null);
    setProductName(name || 'Chat dengan Penjual');
    setIsOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <ChatContext.Provider value={{ isOpen, productId, productName, openChat, closeChat }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  return useContext(ChatContext);
}
