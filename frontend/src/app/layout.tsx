import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { WebSocketProvider } from '../context/WebSocketContext';
import { ChatProvider } from '../context/ChatContext';
import { ToastContainer } from '../components/ui/Toast';

export const metadata: Metadata = {
  title: 'Signal Messenger | Fast, Simple, Secure Messaging',
  description: 'A fullstack Signal Messenger clone with real-time direct and group chats, end-to-end encryption simulation, media sharing, and disappearing messages.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body>
        <AuthProvider>
          <WebSocketProvider>
            <ChatProvider>
              {children}
              <ToastContainer />
            </ChatProvider>
          </WebSocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
