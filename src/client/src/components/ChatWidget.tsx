import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { ApiError } from '../api/auth';
import { IconAdd, IconArrowUp } from '../assets/icons';
import * as messagesApi from '../api/messages';
import { statusLabels } from './StatusBadge';
import { useAuth } from '../hooks/useAuth';
import { usePolling } from '../hooks/usePolling';
import type { Message, OrderStatus } from '../types';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const CHAT_POLL_INTERVAL = 7000;

type ChatWidgetProps = {
  orderId: number;
  title?: string;
  subtitle?: string;
  className?: string;
  onMessagesRead?: () => void | Promise<void>;
  onMessageSent?: () => void | Promise<void>;
};

function formatOrderNumber(id: number) {
  return `#${String(id).padStart(3, '0')}`;
}

function formatMessageTime(value: string) {
  const date = new Date(value);
  const day = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return `${day} ${time}`;
}

function formatSystemMessage(message: Message) {
  const match = message.text?.match(/Статус изменён: [a-z_]+→(new|accepted|rejected|in_progress|ready|completed)$/);
  if (!match) {
    return message.text ?? 'Системное сообщение';
  }

  const status = match[1] as OrderStatus;
  const day = new Date(message.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  const prefix = status === 'in_progress' ? '' : 'ЗАКАЗ ';
  return `${prefix}${statusLabels[status]} — ${day}`;
}

function mergeMessage(messages: Message[], nextMessage: Message) {
  if (messages.some((message) => message.id === nextMessage.id)) {
    return messages;
  }

  return [...messages, nextMessage].sort(
    (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
  );
}

function ChatMessageImage({ orderId, messageId }: { orderId: number; messageId: number }) {
  const [src, setSrc] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let objectUrl = '';

    void messagesApi.fetchImage(orderId, messageId)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (active) {
          setSrc(objectUrl);
        } else {
          URL.revokeObjectURL(objectUrl);
        }
      })
      .catch(() => {
        if (active) {
          setError('Фото недоступно');
        }
      });

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [messageId, orderId]);

  if (error) {
    return <span className="chat-image-error">{error}</span>;
  }

  if (!src) {
    return <span className="chat-image-loading">Загрузка фото...</span>;
  }

  return <img className="chat-message-image" src={src} alt="Фото из сообщения" />;
}

export default function ChatWidget({
  orderId,
  title,
  subtitle = 'Ответ обычно в течение дня',
  className = '',
  onMessagesRead,
  onMessageSent,
}: ChatWidgetProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);
  const lastMarkedSignatureRef = useRef('');

  const resolvedTitle = title ?? `ЧАТ ПО ЗАКАЗУ ${formatOrderNumber(orderId)}`;

  const hasMessageDraft = text.trim().length > 0 || selectedFile !== null;

  const incomingUnreadSignature = useMemo(() => {
    if (!user) {
      return '';
    }

    return messages
      .filter((message) => message.type === 'user' && message.user_id !== user.id && message.read_at === null)
      .map((message) => message.id)
      .join(':');
  }, [messages, user]);

  const scrollToBottom = useCallback(() => {
    window.requestAnimationFrame(() => {
      if (feedRef.current) {
        feedRef.current.scrollTop = feedRef.current.scrollHeight;
      }
    });
  }, []);

  const applyReadState = useCallback((readAt: string) => {
    if (!user) {
      return;
    }

    setMessages((currentMessages) =>
      currentMessages.map((message) => {
        if (message.type === 'user' && message.user_id !== user.id && message.read_at === null) {
          return { ...message, read_at: readAt };
        }

        return message;
      }),
    );
  }, [user]);

  const markIncomingAsRead = useCallback(async () => {
    try {
      const response = await messagesApi.markRead(orderId);

      if (response.updated > 0) {
        applyReadState(new Date().toISOString());
        await onMessagesRead?.();
      }
    } catch {
      // Чтение сообщений не должно блокировать переписку.
    }
  }, [applyReadState, onMessagesRead, orderId]);

  const loadMessages = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    setError('');

    try {
      const nextMessages = await messagesApi.list(orderId);
      setMessages(nextMessages);
      scrollToBottom();
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        setError('Войдите, чтобы открыть чат.');
        return;
      }

      if (requestError instanceof ApiError && requestError.status === 403) {
        setError('Этот чат недоступен.');
        return;
      }

      setError('Не удалось загрузить сообщения.');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [orderId, scrollToBottom]);

  useEffect(() => {
    lastMarkedSignatureRef.current = '';
    setMessages([]);
    setText('');
    setSelectedFile(null);
    setActionError('');
    void loadMessages();
    void markIncomingAsRead();
  }, [loadMessages, markIncomingAsRead, orderId]);

  useEffect(() => {
    if (!incomingUnreadSignature || incomingUnreadSignature === lastMarkedSignatureRef.current) {
      return;
    }

    lastMarkedSignatureRef.current = incomingUnreadSignature;
    void markIncomingAsRead();
  }, [incomingUnreadSignature, markIncomingAsRead]);

  usePolling({
    interval: CHAT_POLL_INTERVAL,
    enabled: Boolean(orderId),
    fn: () => loadMessages(true),
  });

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl('');
      return undefined;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  const resetFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setActionError('');

    if (!file) {
      resetFile();
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setActionError('Можно прикрепить JPEG, PNG или WEBP.');
      resetFile();
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setActionError('Файл больше 5 МБ. Выберите изображение меньшего размера.');
      resetFile();
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError('');

    if (!hasMessageDraft) {
      setActionError('Напишите сообщение или прикрепите фото.');
      return;
    }

    setSending(true);

    try {
      const response = await messagesApi.send(orderId, {
        text,
        image: selectedFile,
      });
      setMessages((currentMessages) => mergeMessage(currentMessages, response.message));
      setText('');
      resetFile();
      await onMessageSent?.();
      scrollToBottom();
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.code === 'LIMIT_FILE_SIZE') {
        setActionError('Файл больше 5 МБ. Выберите изображение меньшего размера.');
        return;
      }

      if (requestError instanceof ApiError && requestError.status === 400) {
        setActionError('Не удалось отправить сообщение. Проверьте текст или файл.');
        return;
      }

      setActionError('Не удалось отправить сообщение.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className={`chat-widget ${className}`.trim()} aria-label={resolvedTitle}>
      <header className="chat-widget-header">
        <h2>{resolvedTitle}</h2>
        <p>{subtitle}</p>
      </header>

      <div className="chat-feed" ref={feedRef} aria-live="polite">
        {loading ? <p className="chat-state-message">ЗАГРУЗКА СООБЩЕНИЙ...</p> : null}
        {error ? <p className="chat-state-message error">{error}</p> : null}

        {!loading && !error && messages.length === 0 ? (
          <p className="chat-state-message">Сообщений пока нет.</p>
        ) : null}

        {messages.map((message) => {
          if (message.type === 'system') {
            return (
              <div className="chat-system-message" key={message.id}>
                <span>{formatSystemMessage(message)}</span>
              </div>
            );
          }

          const isOutgoing = user ? message.user_id === user.id : false;

          return (
            <article
              className={isOutgoing ? 'chat-message outgoing' : 'chat-message incoming'}
              key={message.id}
            >
              <div className="chat-bubble">
                {message.text ? <p>{message.text}</p> : null}
                {message.image_url ? <ChatMessageImage orderId={orderId} messageId={message.id} /> : null}
                <time dateTime={message.created_at}>{formatMessageTime(message.created_at)}</time>
              </div>
            </article>
          );
        })}
      </div>

      <form className="chat-compose" onSubmit={(event) => void handleSubmit(event)}>
        {selectedFile && previewUrl ? (
          <div className="chat-attachment-preview">
            <img src={previewUrl} alt="Превью вложения" />
            <span>{selectedFile.name}</span>
            <button type="button" aria-label="Убрать вложение" onClick={resetFile}>
              ×
            </button>
          </div>
        ) : null}

        {actionError ? <p className="chat-action-error">{actionError}</p> : null}

        <div className="chat-compose-row">
          <input
            ref={fileInputRef}
            className="chat-file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
          />
          <button
            className="chat-attach-button"
            type="button"
            aria-label="Прикрепить фото"
            onClick={() => fileInputRef.current?.click()}
          >
            <IconAdd size={20} />
          </button>
          <textarea
            value={text}
            rows={1}
            aria-label="Сообщение"
            placeholder="Написать сообщение..."
            onChange={(event) => setText(event.target.value)}
          />
          <button
            className="chat-send-button"
            type="submit"
            aria-label="Отправить сообщение"
            disabled={sending || !hasMessageDraft}
          >
            {sending ? '...' : <IconArrowUp size={20} />}
          </button>
        </div>
      </form>
    </section>
  );
}
