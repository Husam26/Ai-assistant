import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import "./ChatBox.css";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import copy from "copy-to-clipboard";
import {
  IoSend,
  IoMic,
  IoCopyOutline,
  IoTrashOutline,
  IoVolumeHighOutline,
  IoVolumeMuteOutline,
  IoCheckmark, // --- NEW: Icon for copied state
} from "react-icons/io5";

const speakText = (text, lang = "en-IN", isMuted) => {
  if (isMuted || !("speechSynthesis" in window)) {
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  const plainText = text.replace(/(\*|_|`|#)/g, "");
  utterance.text = plainText;
  window.speechSynthesis.speak(utterance);
};

const getCurrentTime = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const formatPrompt = (mode, input) => {
  switch (mode) {
    case "translate":
      return `Translate this to Hindi:\n"${input}"`;
    case "explain":
      return `Explain this in simple terms:\n"${input}"`;
    case "code":
      return `Write or help with this code:\n"${input}"`;
    default:
      return input;
  }
};

// --- NEW: Suggested prompts component ---
const SuggestedPrompts = ({ onPromptClick }) => (
  <div className="suggested-prompts">
    <p>Get started with a suggestion:</p>
    <div className="prompt-buttons">
      <button onClick={() => onPromptClick("Explain quantum computing")}>
        Explain quantum computing
      </button>
      <button
        onClick={() => onPromptClick("Write a Python script for a timer")}
      >
        Write a Python script
      </button>
      <button
        onClick={() => onPromptClick("What are the main benefits of React?")}
      >
        Benefits of React
      </button>
    </div>
  </div>
);

const ChatBox = () => {
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: `**Hello!** 👋\n\nI'm Nova, your AI companion. I can help you with coding questions, explanations, translations, and more. How can I assist you today?`,
      timestamp: getCurrentTime(),
    },
  ]);
  const [showChat, setShowChat] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState("default");
  const [language, setLanguage] = useState("en-IN");
  const [copiedMsgKey, setCopiedMsgKey] = useState(null);
  const [listening, setListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  // --- NEW: Ref for the auto-sizing textarea ---
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // --- NEW: Effect to auto-resize the textarea ---
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [userInput]);

  const sendMessage = useCallback(
    async (messageToSend = userInput) => {
      if (!messageToSend.trim()) return;

      const formattedPrompt = formatPrompt(mode, messageToSend);
      const userMessage = {
        sender: "user",
        text: messageToSend,
        timestamp: getCurrentTime(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setUserInput("");
      setIsLoading(true);

      try {
        const API_URL = process.env.REACT_APP_API_URL;

        const res = await axios.post(API_URL, {
          message: formattedPrompt, 
        });

        const botMessage = {
          sender: "bot",
          text: res.data.reply,
          timestamp: getCurrentTime(),
        };

        setMessages((prev) => [...prev, botMessage]);
        speakText(res.data.reply, language, isMuted);
      } catch {
        const errorMsg = {
          sender: "bot",
          text: "Oops! Something went wrong. Please check the connection and try again.",
          timestamp: getCurrentTime(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [userInput, mode, language, isMuted]
  );

  useEffect(() => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window))
      return;
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => {
      setListening(false);
      // --- MODIFIED: Automatically send after speech ends if there's content ---
      recognition.onresult = (event) => {
        const transcript =
          event.results[event.results.length - 1][0].transcript.trim();
        // Set the input and then send it
        setUserInput(transcript);
        sendMessage(transcript);
      };
    };
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
  }, [language, sendMessage]); // Removed userInput from dependencies to avoid re-creating recognition on every key press

  const startChatting = () => setShowChat(true);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleVoiceInput = () => {
    if (recognitionRef.current && !listening) {
      setUserInput("");
      recognitionRef.current.start();
    }
  };

  const clearChat = () =>
    setMessages([
      {
        sender: "bot",
        text: "Chat cleared. How can I help you now?",
        timestamp: getCurrentTime(),
      },
    ]);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleCopy = (textToCopy, key) => {
    copy(textToCopy);
    setCopiedMsgKey(key);
    setTimeout(() => setCopiedMsgKey(null), 2000);
  };

  // --- NEW: Handler for clicking a suggested prompt ---
  const handleSuggestedPromptClick = (prompt) => {
    setUserInput(prompt);
    sendMessage(prompt);
  };

  return (
    <div className="chat-wrapper">
      {!showChat ? (
        <div className="landing-page">
          <div className="landing-content">
            <div className="bot-icon-large floating">🤖</div>
            <h1>
              Meet <span className="highlight">Nova</span>
            </h1>
            <p>Your smart AI companion powered by Gemini</p>
            {/* --- NEW: Example prompts on landing page --- */}
            <div className="example-prompts">
              <span>Try asking:</span>
              <ul>
                <li>"What is the capital of Australia?"</li>
                <li>"Write a short story about a robot."</li>
                <li>"Explain black holes in simple terms."</li>
              </ul>
            </div>
            <button className="start-btn" onClick={startChatting}>
              Start Chatting
            </button>
          </div>
        </div>
      ) : (
        <div className="chat-container animated-in">
          <div className="chat-header">
            <div className="chat-title">
              <span className="bot-icon-small">🤖</span>
              <div className="title-text">
                Nova
                {/* --- NEW: Status indicator --- */}
                <span className="status-indicator">Online</span>
              </div>
            </div>
            <div className="header-actions">
              <button
                className="icon-btn"
                onClick={() => setIsMuted((prev) => !prev)}
                title={isMuted ? "Unmute Voice" : "Mute Voice"}
              >
                {isMuted ? <IoVolumeMuteOutline /> : <IoVolumeHighOutline />}
              </button>
              <button
                className="icon-btn"
                onClick={clearChat}
                title="Clear Chat"
              >
                <IoTrashOutline />
              </button>
            </div>
          </div>

          <div className="controls-bar">
            <div className="control-group">
              <label htmlFor="mode">Mode</label>
              <select
                id="mode"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="default">Chat</option>
                <option value="translate">Translate</option>
                <option value="explain">Explain</option>
                <option value="code">Code Help</option>
              </select>
            </div>
            <div className="control-group">
              <label htmlFor="language">Language</label>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="en-IN">English (India)</option>
                <option value="hi-IN">Hindi</option>
                <option value="en-US">English (US)</option>
              </select>
            </div>
          </div>

          <div className="chat-window">
            {/* --- NEW: Show suggested prompts if only the initial message exists --- */}
            {messages.length === 1 && (
              <SuggestedPrompts onPromptClick={handleSuggestedPromptClick} />
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`message-row ${msg.sender}-row animated-message`}
              >
                <div className="avatar">
                  {msg.sender === "bot" ? "🤖" : "🧑"}
                </div>
                <div className={`chat-bubble ${msg.sender}-bubble`}>
                  <ReactMarkdown
                    children={msg.text}
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                    components={{
                      code({ node, inline, className, children, ...props }) {
                        const codeText = String(children).replace(/\n$/, "");
                        const key = `code-${idx}`;
                        return !inline ? (
                          <div className="code-block-container">
                            <button
                              className="copy-btn"
                              onClick={() => handleCopy(codeText, key)}
                              title="Copy code"
                            >
                              {copiedMsgKey === key ? (
                                <IoCheckmark />
                              ) : (
                                <IoCopyOutline />
                              )}
                            </button>
                            <pre className={className}>
                              <code {...props}>{children}</code>
                            </pre>
                          </div>
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      },
                    }}
                  />
                  <div className="message-meta">
                    {/* --- MODIFIED: Message actions now on hover --- */}
                    {msg.sender === "bot" && (
                      <div className="message-actions">
                        <button
                          className="action-icon-btn"
                          onClick={() => speakText(msg.text, language, false)} // Force speak, ignore mute
                          title="Read aloud"
                        >
                          <IoVolumeHighOutline />
                        </button>
                        <button
                          className="action-icon-btn"
                          onClick={() => handleCopy(msg.text, `msg-${idx}`)}
                          title="Copy message"
                        >
                          {copiedMsgKey === `msg-${idx}` ? (
                            <IoCheckmark />
                          ) : (
                            <IoCopyOutline />
                          )}
                        </button>
                      </div>
                    )}
                    <div className="timestamp">{msg.timestamp}</div>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="message-row bot-row">
                <div className="avatar">🤖</div>
                <div className="chat-bubble bot-bubble typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-area">
            {/* --- MODIFIED: Replaced input with auto-sizing textarea --- */}
            <div className="input-wrapper">
              <textarea
                ref={textareaRef}
                value={userInput}
                rows={1}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                className="chat-input"
                disabled={isLoading}
              />
              <button
                onClick={handleVoiceInput}
                className={`mic-btn ${listening ? "listening" : ""}`}
                title="Voice input"
                disabled={isLoading}
              >
                <IoMic />
              </button>
            </div>
            <button
              onClick={() => sendMessage()}
              className="chat-send-btn"
              disabled={isLoading || !userInput.trim()}
            >
              <IoSend />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBox;
