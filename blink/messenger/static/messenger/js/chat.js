let currentUser = null;
let activeChat = null;
let servers = [];
let friends = [];
let messages = {};
let voiceRecorder = null;

document.addEventListener('DOMContentLoaded', function() {
  loadUserData();
  setupEventListeners();
  initWebSocket();
});

function loadUserData() {
  const userData = localStorage.getItem('currentUser');
  if (userData) {
    currentUser = JSON.parse(userData);
    document.getElementById('currentUsername').textContent = currentUser.username;
    showChatScreen();
  } else {
    showAuthScreen();
  }
}

function showAuthScreen() {
  document.getElementById('authScreen').classList.remove('hidden');
  document.getElementById('chatScreen').classList.add('hidden');
}

function showChatScreen() {
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('chatScreen').classList.remove('hidden');
  loadChats();
  loadServers();
  loadFriends();
}

function loadChats() {
  const chatList = document.getElementById('chatList');
  chatList.innerHTML = '';
  
  const sampleChats = [
    { id: 1, name: 'General Chat', lastMessage: 'Привет! Как дела?', unread: 3 },
    { id: 2, name: 'Support', lastMessage: 'Ваш вопрос решен', unread: 0 }
  ];
  
  sampleChats.forEach(chat => {
    const chatItem = document.createElement('div');
    chatItem.className = 'chat-item';
    chatItem.innerHTML = `
      <div class="chat-item-avatar">${chat.name.charAt(0)}</div>
      <div class="chat-item-info">
        <div class="chat-item-name">${chat.name}</div>
        <div class="chat-item-last-message">${chat.lastMessage}</div>
      </div>
      ${chat.unread > 0 ? `<div class="unread-count">${chat.unread}</div>` : ''}
    `;
    chatItem.addEventListener('click', () => openChat(chat.id));
    chatList.appendChild(chatItem);
  });
}

function openChat(chatId) {
  activeChat = chatId;
  document.getElementById('messageInputContainer').classList.remove('hidden');
  loadMessages(chatId);
}

function loadMessages(chatId) {
  const messagesContainer = document.getElementById('messagesContainer');
  messagesContainer.innerHTML = '';
  
  const sampleMessages = [
    { id: 1, sender: 'User1', text: 'Привет! Как дела?', time: '12:30', outgoing: false },
    { id: 2, sender: 'You', text: 'Все отлично, спасибо!', time: '12:32', outgoing: true }
  ];
  
  sampleMessages.forEach(msg => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${msg.outgoing ? 'message-out' : 'message-in'}`;
    messageDiv.innerHTML = `
      ${!msg.outgoing ? `<div class="message-sender">${msg.sender}</div>` : ''}
      <div class="message-text">${msg.text}</div>
      <div class="message-time">${msg.time}</div>
    `;
    messagesContainer.appendChild(messageDiv);
  });
  
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function sendMessage() {
  const input = document.getElementById('messageInput');
  const text = input.value.trim();
  
  if (text && activeChat) {
    const messagesContainer = document.getElementById('messagesContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message message-out';
    messageDiv.innerHTML = `
      <div class="message-text">${text}</div>
      <div class="message-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
    `;
    messagesContainer.appendChild(messageDiv);
    
    input.value = '';
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

function handleKeyPress(e) {
  if (e.key === 'Enter') {
    sendMessage();
  }
}

function initWebSocket() {
  console.log('Инициализация WebSocket соединения...');
}