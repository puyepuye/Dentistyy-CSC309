import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../../lib/api.js';

/**
 * Real-time negotiation chat (Socket.IO). Messages are kept in server memory for the session.
 * @param {{ negotiationId: number, token: string, selfRole: 'talent' | 'business', disabled?: boolean }} props
 */
export default function NegotiationChat({ negotiationId, token, selfRole, disabled = false }) {
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState('');
    const [status, setStatus] = useState('connecting');
    const bottomRef = useRef(null);
    const socketRef = useRef(null);

    useEffect(() => {
        if (!token || !negotiationId) return undefined;

        const socket = io(API_BASE_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
        });
        socketRef.current = socket;

        socket.on('connect', () => setStatus('ready'));
        socket.on('connect_error', () => setStatus('error'));
        socket.on('disconnect', () => setStatus('disconnected'));

        socket.on('negotiation_message', (msg) => {
            setMessages((prev) => {
                if (prev.some((m) => m.id === msg.id)) return prev;
                return [...prev, msg];
            });
        });

        socket.emit('join_negotiation', negotiationId, (ack) => {
            if (ack && ack.ok && Array.isArray(ack.history)) {
                setMessages(ack.history);
            }
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [token, negotiationId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    function send() {
        const text = draft.trim();
        if (!text || disabled || status !== 'ready') return;
        const socket = socketRef.current;
        if (!socket) return;
        socket.emit('negotiation_message', { negotiation_id: negotiationId, text }, (ack) => {
            if (ack && !ack.ok && typeof window !== 'undefined') {
                window.console.warn('negotiation_message failed', ack.error);
            }
        });
        setDraft('');
    }

    return (
        <div className="talent-neg-chat">
            <div className="talent-neg-chat__status" aria-live="polite">
                {status === 'connecting' ? 'Connecting chat…' : null}
                {status === 'error' ? 'Chat unavailable. Check your connection.' : null}
                {status === 'disconnected' ? 'Disconnected.' : null}
            </div>
            <ul className="talent-neg-chat__messages" aria-label="Negotiation messages">
                {messages.map((m) => {
                    const mine = (selfRole === 'talent' && m.from === 'talent') || (selfRole === 'business' && m.from === 'business');
                    return (
                        <li
                            key={m.id}
                            className={`talent-neg-chat__msg${mine ? ' talent-neg-chat__msg--mine' : ''}`}
                        >
                            <div className="talent-neg-chat__bubble">
                                {!mine ? (
                                    <span className="talent-neg-chat__sender">{m.sender_name || 'Practice'}</span>
                                ) : null}
                                <p className="talent-neg-chat__text">{m.text}</p>
                            </div>
                        </li>
                    );
                })}
                <li ref={bottomRef} />
            </ul>
            <div className="talent-neg-chat__composer">
                <label className="talent-neg-chat__label" htmlFor="neg-chat-input">
                    Message
                </label>
                <div className="talent-neg-chat__row">
                    <input
                        id="neg-chat-input"
                        type="text"
                        className="talent-neg-chat__input"
                        placeholder={disabled ? 'Negotiation ended' : 'Type a message…'}
                        value={draft}
                        disabled={disabled || status !== 'ready'}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                send();
                            }
                        }}
                    />
                    <button
                        type="button"
                        className="talent-neg-chat__send"
                        disabled={disabled || status !== 'ready' || !draft.trim()}
                        onClick={send}
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
}
