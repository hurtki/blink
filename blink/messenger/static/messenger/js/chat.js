const api_endpoint = "http://127.0.0.1:8000/api/token/";

// Data structure
const ADMIN_USERNAME = "y52s";
const ADMIN_PASSWORD = "Pro228333123";

let users = JSON.parse(localStorage.getItem('users')) || [];
let messageToDelete = null;
let editingMessage = null;
let messages = JSON.parse(localStorage.getItem('messages')) || [];
let blockedContacts = JSON.parse(localStorage.getItem('blockedContacts')) || {};
let channels = JSON.parse(localStorage.getItem('channels')) || [];
let groups = JSON.parse(localStorage.getItem('groups')) || [];
let servers = JSON.parse(localStorage.getItem('servers')) || [];
let subscriptions = JSON.parse(localStorage.getItem('subscriptions')) || {};
let messageStatus = JSON.parse(localStorage.getItem('messageStatus')) || {};
let friends = JSON.parse(localStorage.getItem('friends')) || {};
let friendRequests = JSON.parse(localStorage.getItem('friendRequests')) || {};
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let currentChat = null;
let currentChatType = null;
let currentServer = null;
let mediaRecorder;
let audioChunks = [];
let longPressTimer = null;
const LONG_PRESS_DURATION = 500;

// WebRTC variables
let peerConnection;
let localStream;
let remoteStream;
let currentCall = null;
let callRequests = {};

// Initialize data if empty
function initializeData() {
    if (users.length === 0) {
        const adminUser = {
            id: '999',
            name: 'Admin',
            username: ADMIN_USERNAME,
            password: ADMIN_PASSWORD,
            isAdmin: true,
            isRoot: true,
            isVerified: true,
            lastSeen: new Date().toISOString(),
            favorites: [],
            bio: 'System Administrator',
            avatar: null,
            isPremium: true
        };
        
        const ownerUser = {
            id: '1',
            name: 'Channel Owner',
            username: 'owner',
            password: 'owner',
            isOwner: true,
            isVerified: true,
            lastSeen: new Date().toISOString(),
            favorites: [],
            bio: 'Channel Owner',
            avatar: null,
            isPremium: false
        };
        
        const genadiyUser = {
            id: '2',
            name: 'Genadiy',
            username: 'genadiy',
            password: 'genadiy',
            isVerified: true,
            lastSeen: new Date().toISOString(),
            favorites: [],
            bio: 'Just a regular user',
            avatar: null,
            isPremium: false
        };
        
        users.push(adminUser, ownerUser, genadiyUser);
        localStorage.setItem('users', JSON.stringify(users));
    }

    if (channels.length === 0) {
        const megagramChannel = {
            id: '100',
            name: 'Megagram',
            owner: 'owner',
            createdAt: Date.now(),
            isVerified: true
        };
        
        channels.push(megagramChannel);
        localStorage.setItem('channels', JSON.stringify(channels));
        
        if (!subscriptions['owner']) {
            subscriptions['owner'] = [];
        }
        subscriptions['owner'].push('100');
        localStorage.setItem('subscriptions', JSON.stringify(subscriptions));
    }

    if (servers.length === 0) {
        const defaultServer = {
            id: 's1',
            name: 'My Server',
            owner: currentUser ? currentUser.username : 'admin',
            createdAt: Date.now(),
            channels: [
                { id: 'c1', name: 'general', type: 'text' },
                { id: 'c2', name: 'random', type: 'text' },
                { id: 'c3', name: 'General', type: 'voice' }
            ],
            members: currentUser ? [currentUser.username] : ['admin']
        };
        
        servers.push(defaultServer);
        localStorage.setItem('servers', JSON.stringify(servers));
    }

    if (currentUser && !subscriptions[currentUser.username]) {
        subscriptions[currentUser.username] = [];
        localStorage.setItem('subscriptions', JSON.stringify(subscriptions));
    }

    if (currentUser && !currentUser.favorites) {
        currentUser.favorites = [];
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }

    if (currentUser && !friends[currentUser.username]) {
        friends[currentUser.username] = [];
        localStorage.setItem('friends', JSON.stringify(friends));
    }

    if (currentUser && !friendRequests[currentUser.username]) {
        friendRequests[currentUser.username] = { incoming: [], outgoing: [] };
        localStorage.setItem('friendRequests', JSON.stringify(friendRequests));
    }
}

// Initialize WebRTC
async function setupWebRTC() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
        console.error("Error accessing microphone:", err);
    }
}

// Управление окном
document.querySelector('.minimize-btn').addEventListener('click', () => {
    document.querySelector('.app-container').style.transform = 'translateY(10px) scale(0.98)';
    setTimeout(() => {
        document.querySelector('.app-container').style.transform = '';
    }, 300);
});

document.querySelector('.maximize-btn').addEventListener('click', () => {
    const container = document.querySelector('.app-container');
    container.classList.toggle('fullscreen');
    updateWindowTitle(container.classList.contains('fullscreen') ? 
        'Blink Web (Fullscreen)' : 'Blink Web');
});

document.querySelector('.close-btn').addEventListener('click', () => {
    document.body.style.animation = 'fade-out 0.3s forwards';
    setTimeout(() => {
        showNotification("Application closed");
    }, 300);
});

// Обновление заголовка
function updateWindowTitle(title) {
    document.getElementById('appTitle').textContent = title || getCurrentChatTitle();
}

function getCurrentChatTitle() {
    if (!currentChat) return 'Blink Web';
    
    if (currentChatType === 'user') {
        const user = users.find(u => u.username === currentChat);
        return `Chat with ${user?.name || currentChat}`;
    }
    // ... другие типы чатов
    return 'Blink Web';
}

document.addEventListener("keydown", function (event) {
    if (event.key === "F12" || (event.ctrlKey && event.shiftKey && event.key === "I")) {
        event.preventDefault();
    }
});

// Call functions
async function startCall(username) {
    if (!username || username === currentUser.username) return;
    
    try {
        peerConnection = new RTCPeerConnection();
        peerConnection.onicecandidate = handleICECandidateEvent;
        peerConnection.ontrack = handleTrackEvent;
        
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
        
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        // In a real app, you'd send this to the other user via signaling server
        setTimeout(() => {
            if (callRequests[username]) {
                callRequests[username].offer = offer;
                showIncomingCall(username);
            }
        }, 1000);
        
        currentCall = {
            with: username,
            isCaller: true
        };
        
        document.getElementById('voiceChatControls').classList.remove('hidden');
    } catch (err) {
        console.error("Call error:", err);
    }
}

function showIncomingCall(username) {
    const callModal = document.getElementById('callModal');
    document.getElementById('callerInfo').textContent = `Call from ${username}`;
    callModal.classList.remove('hidden');
}

async function acceptCall() {
    if (!currentCall || !currentCall.offer) return;
    
    try {
        await peerConnection.setRemoteDescription(currentCall.offer);
        
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        document.getElementById('voiceChatControls').classList.remove('hidden');
        closeModal('callModal');
        
        currentCall.isCaller = false;
    } catch (err) {
        console.error("Error accepting call:", err);
    }
}

function declineCall() {
    if (!currentCall) return;
    
    closeModal('callModal');
    endCall();
}

function endCall() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    
    document.getElementById('voiceChatControls').classList.add('hidden');
    currentCall = null;
}

function handleICECandidateEvent(event) {
    if (event.candidate) {
        // Send the candidate to the other peer
    }
}

function handleTrackEvent(event) {
    remoteStream = event.streams[0];
    // You would typically attach this to an audio element
}

// Server member management
function kickMember(username) {
    if (!currentServer || currentServer.owner !== currentUser.username) return;
    
    currentServer.members = currentServer.members.filter(m => m !== username);
    localStorage.setItem('servers', JSON.stringify(servers));
    
    if (currentServer.members.length === 0) {
        deleteServer();
    } else {
        renderServerMembers();
        showNotification(`${username} has been kicked`);
    }
}

function banMember(username) {
    if (!currentServer || currentServer.owner !== currentUser.username) return;
    
    currentServer.members = currentServer.members.filter(m => m !== username);
    
    if (!blockedContacts[currentUser.username]) {
        blockedContacts[currentUser.username] = [];
    }
    
    if (!blockedContacts[currentUser.username].includes(username)) {
        blockedContacts[currentUser.username].push(username);
    }
    
    localStorage.setItem('servers', JSON.stringify(servers));
    localStorage.setItem('blockedContacts', JSON.stringify(blockedContacts));
    
    if (currentServer.members.length === 0) {
        deleteServer();
    } else {
        renderServerMembers();
        showNotification(`${username} has been banned`);
    }
}

function giveAdmin(username) {
    const user = users.find(u => u.username === username);
    if (user && currentServer.owner === currentUser.username) {
        user.isAdmin = true;
        localStorage.setItem('users', JSON.stringify(users));
        showNotification(`${username} is now an admin`);
    }
}

// DOM Elements
const authScreen = document.getElementById('authScreen');
const chatScreen = document.getElementById('chatScreen');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const currentUsernameSpan = document.getElementById('currentUsername');
const chatList = document.getElementById('chatList');
const messagesContainer = document.getElementById('messagesContainer');
const messageInputContainer = document.getElementById('messageInputContainer');
const messageInput = document.getElementById('messageInput');
const chatPartner = document.getElementById('chatPartner');
const chatSubscribers = document.getElementById('chatSubscribers');
const chatSearch = document.getElementById('chatSearch');
const blockBtn = document.getElementById('blockBtn');
const voiceMessageBtn = document.getElementById('voiceMessageBtn');
const contextMenu = document.getElementById('contextMenu');
const messageContextMenu = document.getElementById('messageContextMenu');
const serverSidebar = document.getElementById('serverSidebar');
const mainSidebar = document.getElementById('mainSidebar');
const chatArea = document.getElementById('chatArea');
const friendsView = document.getElementById('friendsView');
const friendList = document.getElementById('friendList');
const serverView = document.getElementById('serverView');
const serverChannelsSidebar = document.getElementById('serverChannelsSidebar');
const serverMessagesContainer = document.getElementById('serverMessagesContainer');
const serverMemberList = document.getElementById('serverMemberList');
const mobileBackBtn = document.getElementById('mobileBackBtn');
let currentContextItem = null;
let currentContextType = null;
let currentMessageContext = null;

// Profile elements
const profileModal = document.getElementById('profileModal');
const profileNameText = document.getElementById('profileNameText');
const profileUsername = document.getElementById('profileUsername');
const profileBio = document.getElementById('profileBio');
const profileChats = document.getElementById('profileChats');
const profileSubs = document.getElementById('profileSubs');
const profileFriends = document.getElementById('profileFriends');

// Edit profile elements
const editProfileModal = document.getElementById('editProfileModal');
const editName = document.getElementById('editName');
const editUsername = document.getElementById('editUsername');
const editBio = document.getElementById('editBio');

// Settings elements
const settingsModal = document.getElementById('settingsModal');
const settingsTabs = document.querySelectorAll('.settings-tab');
const settingsTabContents = document.querySelectorAll('.settings-tab-content');
const themeOptions = document.querySelectorAll('.theme-option');

// Premium elements
const premiumModal = document.getElementById('premiumModal');

// Initialize the app
function init() {
    initializeData();
    checkForNewMessages();
    setupMessageInteractions();

    document.getElementById('serverMessageInput')?.addEventListener('keypress', handleServerKeyPress);

    chatSearch.addEventListener('input', (e) => {
        renderChatList(e.target.value);
    });
    
    // Check if we have tokens in localStorage
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (accessToken && refreshToken) {
        // Verify token with backend
        verifyToken(accessToken)
            .then(valid => {
                if (valid) {
                    // Token is valid, show chat screen
                    const username = getUsernameFromToken(accessToken);
                    if (username) {
                        const user = users.find(u => u.username === username);
                        if (user) {
                            currentUser = user;
                            showChatScreen();
                            setupDropdown();
                            setupContextMenu();
                            setupSidebarToggle();
                            setupMobileEvents();
                            simulateMessageStatusUpdates();
                            setupSettingsTabs();
                            renderServers();
                            renderFriends();
                            
                            setInterval(() => {
                                if (currentUser) {
                                    updateUserStatus(currentUser.username, true);
                                }
                            }, 30000);
                        }
                    }
                } else {
                    // Token is invalid, try to refresh
                    refreshTokenRequest(refreshToken)
                        .then(newTokens => {
                            if (newTokens) {
                                localStorage.setItem('accessToken', newTokens.access);
                                localStorage.setItem('refreshToken', newTokens.refresh);
                                const username = getUsernameFromToken(newTokens.access);
                                if (username) {
                                    const user = users.find(u => u.username === username);
                                    if (user) {
                                        currentUser = user;
                                        showChatScreen();
                                        // ... остальная инициализация
                                    }
                                }
                            } else {
                                showAuthScreen();
                            }
                        })
                        .catch(() => {
                            showAuthScreen();
                        });
                }
            })
            .catch(() => {
                showAuthScreen();
            });
    } else {
        showAuthScreen();
    }

    document.getElementById('messageInput').addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    document.getElementById('serverMessageInput').addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendServerMessage();
        }
    });

    // Setup theme options
    themeOptions.forEach(option => {
        option.addEventListener('click', () => {
            if (option.classList.contains('premium-theme') && !currentUser?.isPremium) {
                alert('Premium theme requires a premium subscription');
                return;
            }
            
            document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
            option.classList.add('active');
            
            const theme = option.dataset.theme;
            if (theme) {
                document.documentElement.style.setProperty('--bg-color', `var(--theme-${theme})`);
                document.documentElement.style.setProperty('--sidebar-color', `var(--theme-${theme}-dark)`);
                document.documentElement.style.setProperty('--chat-bg', `var(--theme-${theme}-darker)`);
                document.documentElement.style.setProperty('--server-bg', `var(--theme-${theme}-dark)`);
                document.documentElement.style.setProperty('--server-channel-bg', `var(--theme-${theme}-darker)`);
            }
        });
    });

    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.profile-content') && !e.target.closest('.settings-tab')) {
            if (!settingsModal.classList.contains('hidden')) {
                closeSettingsModal();
            }
        }
    });

    // Close modals with ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });

    // Setup friends tabs
    document.querySelectorAll('.friends-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.friends-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderFriends(tab.dataset.tab);
        });
    });

    // Setup server settings tabs
    document.querySelectorAll('.server-settings-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.server-settings-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            document.querySelectorAll('.server-settings-section').forEach(section => {
                section.classList.add('hidden');
            });
            
            document.getElementById(`${tab.dataset.tab}Tab`).classList.remove('hidden');
        });
    });

    // Message context menu
    document.addEventListener('click', (e) => {
        if (!messageContextMenu.contains(e.target)) {
            messageContextMenu.style.display = 'none';
        }
    });

    // Setup message context menu handlers
    document.getElementById('copyMessageBtn').addEventListener('click', copyMessage);
    document.getElementById('editMessageBtn').addEventListener('click', editMessage);
    document.getElementById('deleteMessageBtn').addEventListener('click', deleteMessage);
}

// Token verification function
async function verifyToken(token) {
    try {
        const response = await fetch('api/token/verify/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token })
        });
        return response.ok;
    } catch (error) {
        console.error('Token verification error:', error);
        return false;
    }
}

// Refresh token function
async function refreshTokenRequest(refreshToken) {
    try {
        const response = await fetch('api/token/refresh/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ refresh: refreshToken })
        });
        
        if (response.ok) {
            return await response.json();
        }
        return null;
    } catch (error) {
        console.error('Token refresh error:', error);
        return null;
    }
}

    // Get username from token (simplified)
    function getUsernameFromToken(token) {
        // In a real app, you would properly decode the JWT
        // This is a simplified version for demonstration
        try {
            const payload = token.split('.')[1];
            const decoded = JSON.parse(atob(payload));
            return decoded.username;
        } catch (error) {
            console.error('Token decode error:', error);
            return null;
        }

            // Setup message context menu handlers
            document.getElementById('copyMessageBtn').addEventListener('click', copyMessage);
            document.getElementById('editMessageBtn').addEventListener('click', editMessage);
            document.getElementById('deleteMessageBtn').addEventListener('click', deleteMessage);
        }

        function setupSettingsTabs() {
            const tabs = document.querySelectorAll('.settings-tab');
            const contents = document.querySelectorAll('.settings-tab-content');
            
            // Show first tab by default
            if (tabs.length > 0 && contents.length > 0) {
                tabs[0].classList.add('active');
                contents[0].classList.add('active');
            }
            
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    // Remove active class from all tabs
                    tabs.forEach(t => t.classList.remove('active'));
                    contents.forEach(c => c.classList.remove('active'));
                    
                    // Add active class to selected tab
                    tab.classList.add('active');
                    const tabId = tab.dataset.tab + 'Tab';
                    document.getElementById(tabId).classList.add('active');
                });
            });
        }

        // Mobile events setup
        function setupMobileEvents() {
            if (window.innerWidth >= 768) return;
            
            // Long press for context menu
            document.querySelectorAll('.chat-item').forEach(item => {
                item.addEventListener('touchstart', handleTouchStart);
                item.addEventListener('touchend', handleTouchEnd);
                item.addEventListener('touchmove', handleTouchCancel);
            });
            
            // Focus on input field
            messageInput.addEventListener('focus', () => {
                document.querySelector('.sidebar').classList.add('collapsed-mobile');
            });

            // Mobile back button
            mobileBackBtn.addEventListener('click', () => {
                if (friendsView.classList.contains('hidden')) {
                    // If in chat, go back to chat list
                    document.querySelector('.sidebar').classList.remove('collapsed-mobile');
                    messageInputContainer.classList.add('hidden');
                    currentChat = null;
                    currentChatType = null;
                    renderChatList();
                } else {
                    // If in friends view, go back to main view
                    closeFriendsView();
                }
            });
        }

        function handleTouchStart(e) {
            const chatItem = e.target.closest('.chat-item');
            if (!chatItem) return;
            
            currentContextItem = chatItem.dataset.id;
            currentContextType = chatItem.dataset.type;
            longPressTimer = setTimeout(() => {
                showMobileContextMenu(e, chatItem);
            }, LONG_PRESS_DURATION);
        }

        function handleTouchEnd() {
            clearTimeout(longPressTimer);
        }

        function handleTouchCancel() {
            clearTimeout(longPressTimer);
        }

        function showMobileContextMenu(e, chatItem) {
            const isFavorite = currentUser.favorites?.some(f => f.id === currentContextItem && f.type === currentContextType);
            const touch = e.touches[0] || e.changedTouches[0];
            const x = Math.min(touch.clientX, window.innerWidth - 210);
            const y = Math.min(touch.clientY, window.innerHeight - 200);
            
            contextMenu.innerHTML = `
                <div class="custom-context-menu-item" id="openChatBtn">
                    <i class="fas fa-comment"></i> Открыть чат
                </div>
                <div class="custom-context-menu-item" id="openProfileBtn">
                    <i class="fas fa-user"></i> Профиль
                </div>
                ${currentContextType === 'user' ? `
                    <div class="custom-context-menu-item" id="addFriendBtn">
                        <i class="fas fa-user-plus"></i> Добавить в друзья
                    </div>
                ` : ''}
                <div class="custom-context-menu-item" id="toggleFavoriteBtn">
                    <i class="fas fa-star"></i> ${isFavorite ? 'Удалить из избранного' : 'В избранное'}
                </div>
                ${currentContextType === 'user' ? `
                    <div class="custom-context-menu-item" id="blockUserBtn">
                        <i class="fas fa-ban"></i> ${blockedContacts[currentUser.username]?.includes(currentContextItem) ? 'Разблокировать' : 'Заблокировать'}
                    </div>
                ` : ''}
                ${currentContextType !== 'user' ? `
                    <div class="custom-context-menu-item" id="leaveChatBtn">
                        <i class="fas fa-sign-out-alt"></i> ${currentContextType === 'channel' ? 'Отписаться' : 'Покинуть группу'}
                    </div>
                ` : ''}
            `;
            
            contextMenu.style.display = 'block';
            contextMenu.style.left = `${x}px`;
            contextMenu.style.top = `${y}px`;
            setupContextMenuHandlers();
        }

        // Common functions
        function showAuthScreen() {
            authScreen.classList.remove('hidden');
            chatScreen.classList.add('hidden');
        }

        function showChatScreen() {
            authScreen.classList.add('hidden');
            chatScreen.classList.remove('hidden');
            
            let usernameHtml = currentUser.username;
            if (currentUser.isRoot) usernameHtml += '<span class="badge root">ROOT</span>';
            else if (currentUser.isAdmin) usernameHtml += '<span class="badge admin">ADMIN</span>';
            else if (currentUser.isOwner) usernameHtml += '<span class="badge owner">OWNER</span>';
            if (currentUser.isVerified) usernameHtml += '<span class="badge verified">VERIFIED</span>';
            if (currentUser.isPremium) usernameHtml += '<span class="badge premium">PREMIUM</span>';
            
            currentUsernameSpan.innerHTML = usernameHtml;
            renderChatList();
        }

        function showLoginForm() {
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
        }

        function showRegisterForm() {
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
        }

        function register() {
            const name = document.getElementById('registerName').value.trim();
            const username = document.getElementById('registerUsername').value.trim();
            const password = document.getElementById('registerPassword').value.trim();

            if (!name || !username || !password) {
                alert('Please fill in all fields');
                return;
            }

            if (users.some(user => user.username === username)) {
                alert('Username already exists');
                return;
            }

            const newUser = {
                id: Date.now().toString(),
                name,
                username,
                password,
                isAdmin: false,
                isRoot: false,
                isOwner: false,
                isVerified: false,
                lastSeen: null,
                favorites: [],
                bio: '',
                avatar: null,
                isPremium: false
            };

            users.push(newUser);
            localStorage.setItem('users', JSON.stringify(users));

            if (!blockedContacts[username]) {
                blockedContacts[username] = [];
                localStorage.setItem('blockedContacts', JSON.stringify(blockedContacts));
            }

            if (!friends[username]) {
                friends[username] = [];
                localStorage.setItem('friends', JSON.stringify(friends));
            }

            if (!friendRequests[username]) {
                friendRequests[username] = { incoming: [], outgoing: [] };
                localStorage.setItem('friendRequests', JSON.stringify(friendRequests));
            }

            alert('Registration successful! Please log in.');
            showLoginForm();
        }

        function login() {
            const username = document.getElementById('loginPhone').value.trim();
            const password = document.getElementById('loginPassword').value.trim();

            const user = users.find(u => u.username === username && u.password === password);

            if (user) {
                currentUser = user;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                showChatScreen();
                simulateMessageStatusUpdates();
                updateUserStatus(username, true);
            } else {
                alert('Invalid username or password');
            }
        }

        function renderServers() {
            serverSidebar.innerHTML = `
                <div class="server-icon" onclick="openFriendsView()">
                    <i class="fas fa-home"></i>
                </div>
                <div class="server-separator"></div>
            `;
            
            servers.forEach(server => {
                if (server.members.includes(currentUser.username)) {
                    const serverIcon = document.createElement('div');
                    serverIcon.className = 'server-icon';
                    serverIcon.innerHTML = server.name.charAt(0).toUpperCase();
                    serverIcon.onclick = () => openServer(server.id);
                    serverSidebar.appendChild(serverIcon);
                }
            });
            
            const addServerIcon = document.createElement('div');
            addServerIcon.className = 'server-icon add-server';
            addServerIcon.innerHTML = '<i class="fas fa-plus"></i>';
            addServerIcon.onclick = openCreateServerModal;
            serverSidebar.appendChild(addServerIcon);
        }

        function openServer(serverId) {
            const server = servers.find(s => s.id === serverId);
            if (!server) return;
            
            currentServer = server;
            mainSidebar.classList.add('hidden');
            chatArea.classList.add('hidden');
            friendsView.classList.add('hidden');
            serverView.classList.remove('hidden');
            
            // Update server name
            document.getElementById('serverName').textContent = server.name;
            
            // Render channels
            const channelsList = serverChannelsSidebar.querySelector('.channel-list');
            channelsList.innerHTML = '';
            
            server.channels.forEach(channel => {
                const channelItem = document.createElement('div');
                channelItem.className = `channel-item ${channel.type === 'voice' ? 'voice-channel' : ''}`;
                channelItem.innerHTML = `
                    <i class="fas ${channel.type === 'voice' ? 'fa-volume-up' : 'fa-hashtag'}"></i>
                    <span class="channel-item-name">${channel.name}</span>
                `;
                channelItem.onclick = () => openServerChannel(server.id, channel.id);
                channelsList.appendChild(channelItem);
            });
            
            // Render members
            serverMemberList.innerHTML = '';
            server.members.forEach(member => {
                const user = users.find(u => u.username === member);
                if (user) {
                    const memberItem = document.createElement('div');
                    memberItem.className = 'member-item';
                    memberItem.innerHTML = `
                        <div class="member-avatar">${user.username.charAt(0).toUpperCase()}</div>
                        <div class="member-name">${user.username}</div>
                        <div class="member-status ${getUserStatus(user.username) === 'online' ? 'online' : ''}"></div>
                    `;
                    serverMemberList.appendChild(memberItem);
                }
            });
            
            // Open first channel by default
            if (server.channels.length > 0) {
                openServerChannel(server.id, server.channels[0].id);
            }
        }

        function openServerChannel(serverId, channelId) {
            const server = servers.find(s => s.id === serverId);
            if (!server) return;
            
            const channel = server.channels.find(c => c.id === channelId);
            if (!channel) return;
            
            // Update active channel
            document.querySelectorAll('.channel-item').forEach(item => {
                item.classList.remove('active');
            });
            
            const channelItem = document.querySelector(`.channel-item[data-id="${channelId}"]`);
            if (channelItem) {
                channelItem.classList.add('active');
            }
            
            // Update channel header
            document.querySelector('.server-view .chat-partner').innerHTML = `
                <i class="fas ${channel.type === 'voice' ? 'fa-volume-up' : 'fa-hashtag'}"></i>
                <span>${channel.name}</span>
            `;
            
            // Render messages for this channel
            renderServerMessages(serverId, channelId);
        }

        function renderServerMessages(serverId, channelId) {
            serverMessagesContainer.innerHTML = '';
            
            const relevantMessages = messages.filter(msg => 
                msg.serverId === serverId && msg.channelId === channelId
            );
            
            relevantMessages.sort((a, b) => a.timestamp - b.timestamp);
            
            const messagesByDate = {};
            relevantMessages.forEach(msg => {
                const date = new Date(msg.timestamp).toDateString();
                if (!messagesByDate[date]) {
                    messagesByDate[date] = [];
                }
                messagesByDate[date].push(msg);
            });
            
            Object.entries(messagesByDate).forEach(([date, msgs]) => {
                const dateSeparator = document.createElement('div');
                dateSeparator.className = 'date-separator';
                dateSeparator.innerHTML = `<span>${formatDate(new Date(date))}</span>`;
                serverMessagesContainer.appendChild(dateSeparator);
                
                msgs.forEach(msg => {
                    const messageDiv = document.createElement('div');
                    messageDiv.className = `message ${msg.sender === currentUser.username ? 'message-out' : 'message-in'}`;
                    
                    const senderDiv = document.createElement('div');
                    senderDiv.className = 'message-sender';
                    
                    const senderUser = users.find(u => u.username === msg.sender);
                    let senderName = msg.sender;
                    if (senderUser) {
                        senderName = senderUser.name || msg.sender;
                        if (senderUser.isVerified) {
                            senderName += '<span class="badge verified">VERIFIED</span>';
                        }
                        if (senderUser.isOwner) {
                            senderName += '<span class="badge owner">OWNER</span>';
                        }
                    }
                    
                    senderDiv.innerHTML = senderName;
                    messageDiv.appendChild(senderDiv);
                    
                    const textDiv = document.createElement('div');
                    textDiv.className = 'message-text';
                    
                    if (msg.isVoiceMessage) {
                        const voiceMessageDiv = document.createElement('div');
                        voiceMessageDiv.className = 'voice-message';
                        voiceMessageDiv.innerHTML = `
                            <div class="voice-message-controls">
                                <div class="voice-message-play-btn">
                                    <i class="fas fa-play"></i>
                                </div>
                                <div class="voice-message-progress">
                                    <div class="voice-message-progress-bar" style="width: 0%"></div>
                                </div>
                                <div class="voice-message-duration">0:00</div>
                            </div>
                        `;
                        textDiv.appendChild(voiceMessageDiv);
                    } else {
                        textDiv.textContent = msg.text;
                    }
                    
                    messageDiv.appendChild(textDiv);
                    
                    const timeDiv = document.createElement('div');
                    timeDiv.className = 'message-time';
                    timeDiv.textContent = formatTime(msg.timestamp);
                    messageDiv.appendChild(timeDiv);
                    
                    // Add context menu for messages
                    messageDiv.addEventListener('contextmenu', (e) => {
                        e.preventDefault();
                        currentMessageContext = msg;
                        showMessageContextMenu(e, messageDiv);
                    });
                    
                    serverMessagesContainer.appendChild(messageDiv);
                });
            });
            
            serverMessagesContainer.scrollTop = serverMessagesContainer.scrollHeight;
        }

        function openFriendsView() {
            mainSidebar.classList.add('hidden');
            chatArea.classList.add('hidden');
            serverView.classList.add('hidden');
            friendsView.classList.remove('hidden');
            renderFriends();
        }

        function closeFriendsView() {
            mainSidebar.classList.remove('hidden');
            chatArea.classList.remove('hidden');
            friendsView.classList.add('hidden');
        }

        function renderFriends(filter = 'all') {
            friendList.innerHTML = '';
            
            const friendUsernames = friends[currentUser.username] || [];
            const pendingRequests = friendRequests[currentUser.username]?.incoming || [];
            
            if (filter === 'pending') {
                if (pendingRequests.length === 0) {
                    friendList.innerHTML = '<div class="no-friends">No pending friend requests</div>';
                    return;
                }
                
                pendingRequests.forEach(username => {
                    const user = users.find(u => u.username === username);
                    if (user) {
                        const friendItem = document.createElement('div');
                        friendItem.className = 'friend-item';
                        friendItem.innerHTML = `
                            <div class="friend-avatar">${user.username.charAt(0).toUpperCase()}</div>
                            <div class="friend-info">
                                <div class="friend-name">${user.username}</div>
                                <div class="friend-status">Pending request</div>
                            </div>
                            <div class="friend-actions">
                                <div class="friend-action-btn" onclick="acceptFriendRequest('${user.username}')">
                                    <i class="fas fa-check"></i>
                                </div>
                                <div class="friend-action-btn" onclick="declineFriendRequest('${user.username}')">
                                    <i class="fas fa-times"></i>
                                </div>
                            </div>
                        `;
                        friendList.appendChild(friendItem);
                    }
                });
            } else {
                if (friendUsernames.length === 0) {
                    friendList.innerHTML = '<div class="no-friends">No friends yet</div>';
                    return;
                }
                
                friendUsernames.forEach(username => {
                    const user = users.find(u => u.username === username);
                    if (user) {
                        const isOnline = getUserStatus(username) === 'online';
                        if (filter === 'online' && !isOnline) return;
                        
                        const friendItem = document.createElement('div');
                        friendItem.className = 'friend-item';
                        friendItem.innerHTML = `
                            <div class="friend-avatar">${user.username.charAt(0).toUpperCase()}</div>
                            <div class="friend-info">
                                <div class="friend-name">${user.username}</div>
                                <div class="friend-status ${isOnline ? 'online' : ''}">${getUserStatus(username)}</div>
                            </div>
                            <div class="friend-actions">
                                <div class="friend-action-btn" onclick="openChat('${username}', 'user')">
                                    <i class="fas fa-comment"></i>
                                </div>
                                <div class="friend-action-btn" onclick="removeFriend('${username}')">
                                    <i class="fas fa-user-minus"></i>
                                </div>
                            </div>
                        `;
                        friendList.appendChild(friendItem);
                    }
                });
            }
        }

        function sendFriendRequest(username) {
            if (!friendRequests[username]) {
                friendRequests[username] = { incoming: [], outgoing: [] };
            }
            
            if (!friendRequests[username].incoming.includes(currentUser.username)) {
                friendRequests[username].incoming.push(currentUser.username);
            }
            
            if (!friendRequests[currentUser.username].outgoing.includes(username)) {
                friendRequests[currentUser.username].outgoing.push(username);
            }
            
            localStorage.setItem('friendRequests', JSON.stringify(friendRequests));
            showNotification(`${username} has been sent a friend request`);
        }

        function acceptFriendRequest(username) {
            if (friendRequests[currentUser.username]?.incoming.includes(username)) {
                // Remove from requests
                friendRequests[currentUser.username].incoming = friendRequests[currentUser.username].incoming.filter(u => u !== username);
                
                // Add to friends
                if (!friends[currentUser.username].includes(username)) {
                    friends[currentUser.username].push(username);
                }
                
                if (!friends[username]?.includes(currentUser.username)) {
                    if (!friends[username]) friends[username] = [];
                    friends[username].push(currentUser.username);
                }
                
                localStorage.setItem('friends', JSON.stringify(friends));
                localStorage.setItem('friendRequests', JSON.stringify(friendRequests));
                renderFriends();
                showNotification(`You are now friends with ${username}`);
            }
        }

        function declineFriendRequest(username) {
            if (friendRequests[currentUser.username]?.incoming.includes(username)) {
                friendRequests[currentUser.username].incoming = friendRequests[currentUser.username].incoming.filter(u => u !== username);
                localStorage.setItem('friendRequests', JSON.stringify(friendRequests));
                renderFriends();
            }
        }

        function removeFriend(username) {
            if (friends[currentUser.username]?.includes(username)) {
                friends[currentUser.username] = friends[currentUser.username].filter(u => u !== username);
                
                if (friends[username]?.includes(currentUser.username)) {
                    friends[username] = friends[username].filter(u => u !== currentUser.username);
                }
                
                localStorage.setItem('friends', JSON.stringify(friends));
                renderFriends();
                showNotification(`${username} has been removed from your friends`);
            }
        }

        function renderChatList(filter = '') {
            chatList.innerHTML = '';
            
            if (!filter) {
                if (currentUser.favorites?.length > 0) {
                    const favHeader = document.createElement('div');
                    favHeader.className = 'chat-list-header';
                    favHeader.textContent = 'Избранное';
                    chatList.appendChild(favHeader);

                    currentUser.favorites.forEach(fav => {
                        if (fav.type === 'user') {
                            const user = users.find(u => u.username === fav.id);
                            if (user) {
                                const unreadCount = getUnreadCount(user.username, 'user');
                                const chatItem = createChatItem(user.username, 'user', null, unreadCount, user.isVerified, true);
                                chatList.appendChild(chatItem);
                            }
                        } else if (fav.type === 'channel') {
                            const channel = channels.find(c => c.id === fav.id);
                            if (channel) {
                                const chatItem = createChatItem(channel.name, 'channel', channel.id, 0, channel.isVerified, true);
                                chatList.appendChild(chatItem);
                            }
                        } else if (fav.type === 'server') {
                            const server = servers.find(s => s.id === fav.id);
                            if (server) {
                                const chatItem = createChatItem(server.name, 'server', server.id, 0, false, true);
                                chatList.appendChild(chatItem);
                            }
                        }
                    });
                }

                const userSubscriptions = subscriptions[currentUser.username] || [];
                const userChannels = channels.filter(ch => userSubscriptions.includes(ch.id));
                
                if (userChannels.length > 0) {
                    const channelHeader = document.createElement('div');
                    channelHeader.className = 'chat-list-header';
                    channelHeader.textContent = 'Каналы';
                    chatList.appendChild(channelHeader);
                    
                    userChannels.forEach(channel => {
                        const chatItem = createChatItem(channel.name, 'channel', channel.id, 0, channel.isVerified);
                        chatList.appendChild(chatItem);
                    });
                }

                const userGroups = groups.filter(gr => gr.members.includes(currentUser.username));
                
                if (userGroups.length > 0) {
                    const groupHeader = document.createElement('div');
                    groupHeader.className = 'chat-list-header';
                    groupHeader.textContent = 'Группы';
                    chatList.appendChild(groupHeader);
                    
                    userGroups.forEach(group => {
                        const chatItem = createChatItem(group.name, 'group', group.id);
                        chatList.appendChild(chatItem);
                    });
                }

                const userServers = servers.filter(s => s.members.includes(currentUser.username));
                
                if (userServers.length > 0) {
                    const serverHeader = document.createElement('div');
                    serverHeader.className = 'chat-list-header';
                    serverHeader.textContent = 'Серверы';
                    chatList.appendChild(serverHeader);
                    
                    userServers.forEach(server => {
                        const chatItem = createChatItem(server.name, 'server', server.id);
                        chatList.appendChild(chatItem);
                    });
                }

                const chatPartners = new Set();
                const unreadMessages = {};
                
                messages.forEach(msg => {
                    if (msg.sender === currentUser.username && msg.receiver) {
                        chatPartners.add(msg.receiver);
                    } else if (msg.receiver === currentUser.username && msg.sender) {
                        chatPartners.add(msg.sender);
                        const status = messageStatus[msg.timestamp];
                        if (!status || status !== 'read') {
                            if (!unreadMessages[msg.sender]) unreadMessages[msg.sender] = 0;
                            unreadMessages[msg.sender]++;
                        }
                    }
                });

                if (chatPartners.size > 0) {
                    const privateHeader = document.createElement('div');
                    privateHeader.className = 'chat-list-header';
                    privateHeader.textContent = 'Чаты';
                    chatList.appendChild(privateHeader);
                    
                    chatPartners.forEach(partner => {
                        const user = users.find(u => u.username === partner);
                        const unreadCount = unreadMessages[partner] || 0;
                        const isFavorite = currentUser.favorites?.some(f => f.id === partner && f.type === 'user');
                        const chatItem = createChatItem(partner, 'user', null, unreadCount, user?.isVerified, isFavorite);
                        chatList.appendChild(chatItem);
                    });
                }

                if (chatList.children.length === 0) {
                    const noChats = document.createElement('div');
                    noChats.className = 'no-chats';
                    noChats.textContent = 'У вас пока нет чатов';
                    chatList.appendChild(noChats);
                }
            } else {
                const searchResults = [];
                
                users.forEach(user => {
                    if (user.username.toLowerCase().includes(filter.toLowerCase()) || 
                        (user.name && user.name.toLowerCase().includes(filter.toLowerCase()))) {
                        searchResults.push({
                            type: 'user',
                            id: user.username,
                            name: user.name || user.username,
                            isVerified: user.isVerified,
                            isOnline: getUserStatus(user.username) === 'online'
                        });
                    }
                });
                
                channels.forEach(channel => {
                    if (channel.name.toLowerCase().includes(filter.toLowerCase())) {
                        searchResults.push({
                            type: 'channel',
                            id: channel.id,
                            name: channel.name,
                            isVerified: channel.isVerified
                        });
                    }
                });
                
                groups.forEach(group => {
                    if (group.name.toLowerCase().includes(filter.toLowerCase())) {
                        searchResults.push({
                            type: 'group',
                            id: group.id,
                            name: group.name
                        });
                    }
                });
                
                servers.forEach(server => {
                    if (server.name.toLowerCase().includes(filter.toLowerCase())) {
                        searchResults.push({
                            type: 'server',
                            id: server.id,
                            name: server.name
                        });
                    }
                });
                
                if (searchResults.length > 0) {
                    const header = document.createElement('div');
                    header.className = 'chat-list-header';
                    header.textContent = 'Результаты поиска';
                    chatList.appendChild(header);
                    
                    searchResults.forEach(result => {
                        const isFavorite = currentUser.favorites?.some(f => f.id === result.id && f.type === result.type);
                        const unreadCount = result.type === 'user' ? getUnreadCount(result.id, 'user') : 0;
                        
                        const chatItem = createChatItem(
                            result.name || result.id,
                            result.type,
                            result.id,
                            unreadCount,
                            result.isVerified,
                            isFavorite
                        );
                        
                        if (result.type === 'user' && !messages.some(m => 
                            (m.sender === currentUser.username && m.receiver === result.id) ||
                            (m.sender === result.id && m.receiver === currentUser.username))) {
                            const info = document.createElement('div');
                            info.className = 'chat-item-status new-contact';
                            info.textContent = 'Новый контакт';
                            chatItem.querySelector('.chat-item-info').appendChild(info);
                        }
                        
                        chatList.appendChild(chatItem);
                    });
                } else {
                    const noResults = document.createElement('div');
                    noResults.className = 'no-chats';
                    noResults.textContent = 'Ничего не найдено';
                    chatList.appendChild(noResults);
                }
            }
        }

        function createChatItem(name, type, id = null, unreadCount = 0, isVerified = false, isFavorite = false) {
            const lastMessage = getLastMessage(type === 'user' ? name : id, type);
            const hasUnread = unreadCount > 0;
            const status = type === 'user' ? getUserStatus(name) : '';
            const isOnline = status === 'online';
            
            const statusIndicator = type === 'user' 
                ? `<div class="status-indicator ${isOnline ? 'status-online' : 'status-offline'}"></div>`
                : '';

            const chatItem = document.createElement('div');
            chatItem.className = `chat-item ${currentChat === (id || name) && currentChatType === type ? 'active' : ''} ${type}-item`;
            chatItem.dataset.type = type;
            chatItem.dataset.id = id || name;
            
            const verifiedBadge = isVerified 
                ? '<span class="badge verified">VERIFIED</span>' 
                : '';
            
            chatItem.innerHTML = `
                <div class="chat-item-avatar">
                    ${type === 'user' ? name.charAt(0).toUpperCase() : 
                      type === 'channel' ? '🔊' : 
                      type === 'server' ? '🏠' : '👥'}
                    ${statusIndicator}
                </div>
                <div class="chat-item-info">
                    <div class="chat-item-name">${name}${verifiedBadge} ${hasUnread ? '<span class="unread-indicator"></span>' : ''}</div>
                    <div class="chat-item-last-message">${lastMessage ? (lastMessage.isVoiceMessage ? 'Голосовое сообщение' : lastMessage.text) : type === 'channel' ? 'Канал' : type === 'group' ? 'Группа' : type === 'server' ? 'Сервер' : 'Нет сообщений'}</div>
                    ${type === 'user' ? `<div class="chat-item-status ${status === 'online' ? 'online' : ''}">${status}</div>` : ''}
                </div>
                ${isFavorite ? '<i class="fas fa-star favorite-icon"></i>' : ''}
                ${hasUnread ? `<div class="unread-count">${unreadCount}</div>` : ''}
            `;
            
            chatItem.addEventListener('click', (e) => {
                if (e.button === 0) {
                    openChat(id || name, type);
                }
            });
            
            // Add context menu on right click
            chatItem.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                currentContextItem = id || name;
                currentContextType = type;
                showDesktopContextMenu(e, chatItem);
            });
            
            return chatItem;
        }

        function getLastMessage(identifier, type) {
            let relevantMessages = [];
            
            if (type === 'user') {
                relevantMessages = messages.filter(msg => 
                    (msg.sender === currentUser.username && msg.receiver === identifier) ||
                    (msg.sender === identifier && msg.receiver === currentUser.username)
                );
            } else if (type === 'channel') {
                relevantMessages = messages.filter(msg => msg.channelId === identifier);
            } else if (type === 'group') {
                relevantMessages = messages.filter(msg => msg.groupId === identifier);
            } else if (type === 'server') {
                const server = servers.find(s => s.id === identifier);
                if (server) {
                    const serverChannels = server.channels.map(c => c.id);
                    relevantMessages = messages.filter(msg => 
                        msg.serverId === identifier && serverChannels.includes(msg.channelId)
                    );
                }
            }
            
            if (relevantMessages.length === 0) return null;
            
            relevantMessages.sort((a, b) => b.timestamp - a.timestamp);
            return relevantMessages[0];
        }

        function getUnreadCount(identifier, type) {
            if (type === 'user') {
                return messages.filter(msg => 
                    msg.sender === identifier && 
                    msg.receiver === currentUser.username &&
                    (!messageStatus[msg.timestamp] || messageStatus[msg.timestamp] !== 'read')
                ).length;
            }
            return 0;
        }

        function getUserStatus(username) {
            if (!username) return '';
            const user = users.find(u => u.username === username);
            if (!user || !user.lastSeen) return 'был(а) в сети давно';
            
            const now = new Date();
            const lastSeen = new Date(user.lastSeen);
            const diffMinutes = Math.floor((now - lastSeen) / (1000 * 60));
            
            if (diffMinutes < 1) return 'online';
            if (diffMinutes < 5) return 'был(а) только что';
            if (diffMinutes < 60) return 'был(а) недавно';
            return `был(а) в сети ${lastSeen.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        }

        function openChat(identifier, type) {
            currentChat = identifier;
            currentChatType = type;
            renderChatList(chatSearch.value);
            
            if (type === 'server') {
                openServer(identifier);
                return;
            }
            
            mainSidebar.classList.add('hidden');
            friendsView.classList.add('hidden');
            serverView.classList.add('hidden');
            chatArea.classList.remove('hidden');
            
            if (window.innerWidth < 768) {
                mobileBackBtn.classList.remove('hidden');
            }
            
            renderMessages(identifier, type);
            
            if (type === 'channel') {
                const channel = channels.find(ch => ch.id === identifier);
                const isSubscribed = subscriptions[currentUser.username]?.includes(identifier);
                const isOwner = channel.owner === currentUser.username;
                const isAdmin = currentUser.isAdmin || currentUser.isRoot;

                if (!isSubscribed && !isOwner && !isAdmin) {
                    // Показываем кнопку подписки
                    messageInputContainer.innerHTML = `
                        <button class="subscribe-btn" onclick="subscribeToChannel('${identifier}')">
                            Подписаться
                        </button>
                    `;
                    messageInputContainer.classList.remove('hidden');
                } else if (!isOwner && !isAdmin) {
                    // Участник канала, но не создатель
                    messageInputContainer.innerHTML = `
                        <div class="no-permission">
                            Вы не можете отправлять сообщения в этот канал
                        </div>
                    `;
                    messageInputContainer.classList.remove('hidden');
                } else {
                    messageInputContainer.innerHTML = `
                        <button id="voiceMessageBtn" class="voice-btn" onclick="startVoiceRecording()">
                            <i class="fas fa-microphone"></i>
                        </button>
                        <input type="text" id="messageInput" placeholder="Write a message..." onkeypress="handleKeyPress(event)">
                        <button onclick="sendMessage()"><i class="fas fa-paper-plane"></i></button>
                    `;
                    messageInputContainer.classList.remove('hidden');
                }
            }

            if (type === 'user') {
                updateMessageStatuses(identifier, 'read');
            }
            
            if (type === 'user') {
                const user = users.find(u => u.username === identifier);
                let nameHtml = identifier;
                if (user?.isVerified) {
                    nameHtml += '<span class="badge verified">VERIFIED</span>';
                }
                chatPartner.innerHTML = nameHtml;
                chatSubscribers.classList.add('hidden');
                messageInputContainer.classList.remove('hidden');
                
                if (blockedContacts[currentUser.username]?.includes(identifier)) {
                    blockBtn.innerHTML = '<i class="fas fa-ban"></i>';
                    blockBtn.title = 'Разблокировать';
                } else {
                    blockBtn.innerHTML = '<i class="fas fa-ban"></i>';
                    blockBtn.title = 'Заблокировать';
                }
                blockBtn.classList.remove('hidden');
            } else if (type === 'channel') {
                const channel = channels.find(ch => ch.id === identifier);
                let channelName = channel.name;
                if (channel.isVerified) {
                    channelName += '<span class="badge verified">VERIFIED</span>';
                }
                chatPartner.innerHTML = `${channelName} <span class="badge owner">КАНАЛ</span>`;
                
                const subCount = Object.values(subscriptions).filter(sub => sub.includes(identifier)).length;
                chatSubscribers.textContent = `${subCount} подписчик(ов)`;
                chatSubscribers.classList.remove('hidden');
                
                if (channel.owner === currentUser.username || currentUser.isAdmin || currentUser.isRoot) {
                    messageInputContainer.classList.remove('hidden');
                } else {
                    messageInputContainer.classList.add('hidden');
                }
                blockBtn.classList.add('hidden');
            } else if (type === 'group') {
                const group = groups.find(gr => gr.id === identifier);
                chatPartner.innerHTML = `${group.name} <span class="badge owner">ГРУППА</span>`;
                chatSubscribers.textContent = `${group.members.length} участник(ов)`;
                chatSubscribers.classList.remove('hidden');
                messageInputContainer.classList.remove('hidden');
                blockBtn.classList.add('hidden');
            }
            
            if (window.innerWidth < 768) {
                document.querySelector('.sidebar').classList.add('collapsed-mobile');
            }
        }

        function renderMessages(identifier, type, newMessage = null) {
            if (newMessage) {
                // Только добавляем новое сообщение вместо полного перерендера
                const messageDiv = createMessageElement(newMessage, type);
                messagesContainer.appendChild(messageDiv);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                return;
            }

            messagesContainer.innerHTML = '';
        
            let relevantMessages = [];
            let isBlocked = false;
            if (type === 'user') {
                isBlocked = blockedContacts[currentUser.username]?.includes(identifier);
                relevantMessages = messages.filter(msg => 
                    (msg.sender === currentUser.username && msg.receiver === identifier) ||
                    (msg.sender === identifier && msg.receiver === currentUser.username)
                );
                
                if (isBlocked) {
                    const blockedMsg = document.createElement('div');
                    blockedMsg.className = 'blocked-message';
                    blockedMsg.textContent = 'Вы заблокировали этого пользователя. Разблокируйте, чтобы отправлять сообщения.';
                    messagesContainer.appendChild(blockedMsg);
                }
            } else if (type === 'channel') {
                relevantMessages = messages.filter(msg => msg.channelId === identifier);
            } else if (type === 'group') {
                relevantMessages = messages.filter(msg => msg.groupId === identifier);
            }
            
            relevantMessages.sort((a, b) => a.timestamp - b.timestamp);
            
            const messagesByDate = {};
            relevantMessages.forEach(msg => {
                const date = new Date(msg.timestamp).toDateString();
                if (!messagesByDate[date]) {
                    messagesByDate[date] = [];
                }
                messagesByDate[date].push(msg);
            });
            
            Object.entries(messagesByDate).forEach(([date, msgs]) => {
                const dateSeparator = document.createElement('div');
                dateSeparator.className = 'date-separator';
                dateSeparator.innerHTML = `<span>${formatDate(new Date(date))}</span>`;
                messagesContainer.appendChild(dateSeparator);
                
                msgs.forEach(msg => {
                    const messageDiv = document.createElement('div');
                    messageDiv.className = `message ${msg.sender === currentUser.username ? 'message-out' : 'message-in'}`;
                    messageDiv.dataset.id = msg.timestamp; // Добавляем ID сообщения для контекстного меню
                    
                    if (msg.sender !== currentUser.username && type !== 'channel') {
                        const senderDiv = document.createElement('div');
                        senderDiv.className = 'message-sender';
                        
                        const senderUser = users.find(u => u.username === msg.sender);
                        let senderName = msg.sender;
                        if (senderUser) {
                            senderName = senderUser.name || msg.sender;
                            if (senderUser.isVerified) {
                                senderName += '<span class="badge verified">VERIFIED</span>';
                            }
                            if (senderUser.isOwner) {
                                senderName += '<span class="badge owner">OWNER</span>';
                            }
                            if (senderUser.isAdmin || senderUser.isRoot) {
                                senderName += '<span class="badge admin">ADMIN</span>';
                            }
                        }
                        
                        senderDiv.innerHTML = senderName;
                        messageDiv.appendChild(senderDiv);
                    }
                    
                    const textDiv = document.createElement('div');
                    textDiv.className = 'message-text';
                    
                    if (msg.isVoiceMessage) {
                        const voiceMessageDiv = document.createElement('div');
                        voiceMessageDiv.className = 'voice-message';
                        voiceMessageDiv.innerHTML = `
                            <div class="voice-message-controls">
                                <div class="voice-message-play-btn">
                                    <i class="fas fa-play"></i>
                                </div>
                                <div class="voice-message-progress">
                                    <div class="voice-message-progress-bar" style="width: 0%"></div>
                                </div>
                                <div class="voice-message-duration">0:00</div>
                            </div>
                        `;
                        textDiv.appendChild(voiceMessageDiv);
                    } else {
                        textDiv.textContent = msg.text;
                        
                        // Добавляем отметку "edited" если сообщение было изменено
                        if (msg.edited) {
                            const editedSpan = document.createElement('span');
                            editedSpan.className = 'edited-label';
                            editedSpan.textContent = ' (edited)';
                            textDiv.appendChild(editedSpan);
                        }
                    }
                    
                    messageDiv.appendChild(textDiv);
                    
                    const timeDiv = document.createElement('div');
                    timeDiv.className = 'message-time';
                    
                    if (msg.sender === currentUser.username && type === 'user') {
                        const statusDiv = document.createElement('div');
                        statusDiv.className = 'message-status';
                        
                        const status = messageStatus[msg.timestamp] || 'sent';
                        
                        if (status === 'delivered') {
                            statusDiv.innerHTML = '<i class="fas fa-check"></i>';
                        } else if (status === 'read') {
                            statusDiv.innerHTML = '<i class="fas fa-check"></i><i class="fas fa-check"></i>';
                        }
                        
                        timeDiv.appendChild(statusDiv);
                    }
                    
                    timeDiv.appendChild(document.createTextNode(formatTime(msg.timestamp)));
                    messageDiv.appendChild(timeDiv);
                    
                    // Добавляем контекстное меню для сообщений
                    messageDiv.addEventListener('contextmenu', (e) => {
                        e.preventDefault();
                        currentMessageContext = msg;
                        showMessageContextMenu(e, messageDiv);
                    });
                    
                    // Добавляем обработчик долгого нажатия для мобильных устройств
                    messageDiv.addEventListener('touchstart', (e) => {
                        longPressTimer = setTimeout(() => {
                            currentMessageContext = msg;
                            showMobileMessageContextMenu(e, messageDiv);
                        }, LONG_PRESS_DURATION);
                    });
                    
                    messageDiv.addEventListener('touchend', () => {
                        clearTimeout(longPressTimer);
                    });
                    
                    messageDiv.addEventListener('touchmove', () => {
                        clearTimeout(longPressTimer);
                    });
                    
                    messagesContainer.appendChild(messageDiv);
                });
            });
            
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        
        // Функция для показа контекстного меню сообщения на мобильных устройствах
        function showMobileMessageContextMenu(e, messageElement) {
            if (!currentMessageContext) return;
            
            const isMyMessage = currentMessageContext.sender === currentUser.username;
            const canDelete = isMyMessage || currentUser.isAdmin || currentUser.isRoot;
            
            const touch = e.touches[0] || e.changedTouches[0];
            const x = Math.min(touch.clientX, window.innerWidth - 200);
            const y = Math.min(touch.clientY, window.innerHeight - 150);
            
            messageContextMenu.innerHTML = `
                <div class="custom-context-menu-item" id="copyMessageBtn">
                    <i class="fas fa-copy"></i> Copy
                </div>
                ${isMyMessage ? `
                    <div class="custom-context-menu-item" id="editMessageBtn">
                        <i class="fas fa-edit"></i> Edit
                    </div>
                ` : ''}
                ${canDelete ? `
                    <div class="custom-context-menu-item danger" id="deleteMessageBtn">
                        <i class="fas fa-trash"></i> Delete
                    </div>
                ` : ''}
            `;
            
            messageContextMenu.style.display = 'block';
            messageContextMenu.style.left = `${x}px`;
            messageContextMenu.style.top = `${y}px`;
            
            // Назначаем обработчики для мобильного контекстного меню
            document.getElementById('copyMessageBtn')?.addEventListener('click', copyMessage);
            document.getElementById('editMessageBtn')?.addEventListener('click', editMessage);
            document.getElementById('deleteMessageBtn')?.addEventListener('click', deleteMessage);
        }
        
        function showMessageContextMenu(e, messageElement) {
            e.preventDefault();
            if (!currentMessageContext) return;
            
            const isMyMessage = currentMessageContext.sender === currentUser.username;
            const canDelete = isMyMessage || currentUser.isAdmin || currentUser.isRoot;
            
            const menu = document.getElementById('messageContextMenu');
            menu.innerHTML = `
                <div class="custom-context-menu-item" id="copyMessageBtn">
                    <i class="fas fa-copy"></i> Copy
                </div>
                ${isMyMessage ? `
                    <div class="custom-context-menu-item" id="editMessageBtn">
                        <i class="fas fa-edit"></i> Edit
                    </div>
                ` : ''}
                ${canDelete ? `
                    <div class="custom-context-menu-item danger" id="deleteMessageBtn">
                        <i class="fas fa-trash"></i> Delete
                    </div>
                ` : ''}
            `;
            
            menu.style.display = 'block';
            menu.style.left = `${Math.min(e.pageX, window.innerWidth - 200)}px`;
            menu.style.top = `${Math.min(e.pageY, window.innerHeight - 150)}px`;
            
            // Назначаем обработчики
            document.getElementById('copyMessageBtn')?.addEventListener('click', copyMessage);
            document.getElementById('editMessageBtn')?.addEventListener('click', editMessage);
            document.getElementById('deleteMessageBtn')?.addEventListener('click', deleteMessage);
        }

        function copyMessage() {
            if (!currentMessageContext) return;
            
            const text = currentMessageContext.text;
            if (text) {
                navigator.clipboard.writeText(text)
                    .then(() => {
                        showNotification('Message copied to clipboard');
                    })
                    .catch(err => {
                        console.error('Failed to copy message:', err);
                        showNotification('Failed to copy message');
                    });
            }
            messageContextMenu.style.display = 'none';
        }

        function editMessage() {
            if (!currentMessageContext || currentMessageContext.sender !== currentUser.username) {
                showNotification("You can only edit your own messages");
                return;
            }
        
            // Создаем модальное окно для редактирования
            const editModal = document.createElement('div');
            editModal.className = 'edit-message-modal';
            editModal.innerHTML = `
                <div class="edit-message-container glass-effect">
                    <div class="edit-message-header">
                        <h3>Edit Message</h3>
                        <button class="close-edit-modal">&times;</button>
                    </div>
                    <textarea class="edit-message-textarea">${currentMessageContext.text}</textarea>
                    <div class="edit-message-actions">
                        <button class="cancel-edit-btn">Cancel</button>
                        <button class="save-edit-btn">Save Changes</button>
                    </div>
                </div>
            `;
        
            // Добавляем модальное окно в DOM
            document.body.appendChild(editModal);
            messageContextMenu.style.display = 'none';
        
            // Фокусируемся на текстовом поле
            const textarea = editModal.querySelector('.edit-message-textarea');
            textarea.focus();
            textarea.select();
        
            // Обработчики событий
            editModal.querySelector('.close-edit-modal').addEventListener('click', closeEditModal);
            editModal.querySelector('.cancel-edit-btn').addEventListener('click', closeEditModal);
            editModal.querySelector('.save-edit-btn').addEventListener('click', saveEditedMessage);
        
            // Функция закрытия модального окна
            function closeEditModal() {
                document.body.removeChild(editModal);
            }
        
            // Функция сохранения изменений
            function saveEditedMessage() {
                const newText = textarea.value.trim();
                if (!newText) {
                    showNotification("Message cannot be empty");
                    return;
                }
        
                if (newText !== currentMessageContext.text) {
                    currentMessageContext.text = newText;
                    currentMessageContext.edited = true;
                    currentMessageContext.editTimestamp = Date.now();
                    
                    localStorage.setItem('messages', JSON.stringify(messages));
                    
                    if (currentChat && currentChatType) {
                        renderMessages(currentChat, currentChatType);
                    }
                    
                    showNotification('Message edited');
                }
                closeEditModal();
            }
        
            // Закрытие по клику вне модального окна
            editModal.addEventListener('click', (e) => {
                if (e.target === editModal) {
                    closeEditModal();
                }
            });
        
            // Закрытие по ESC
            document.addEventListener('keydown', function escHandler(e) {
                if (e.key === 'Escape') {
                    closeEditModal();
                    document.removeEventListener('keydown', escHandler);
                }
            });
        }

        function deleteMessage() {
            if (!currentMessageContext) return;
            
            // Проверяем права на удаление
            const canDelete = currentMessageContext.sender === currentUser.username || 
                             currentUser.isAdmin || 
                             currentUser.isRoot;
            
            if (!canDelete) {
                showNotification("You don't have permission to delete this message");
                return;
            }
            
            messageToDelete = currentMessageContext;
            document.getElementById('messageContextMenu').style.display = 'none';
            
            // Показываем кастомное модальное окно
            document.getElementById('deleteConfirmModal').classList.remove('hidden');
            
            // Добавляем анимацию "тряски" для дополнительного внимания
            const modal = document.querySelector('.confirm-modal');
            modal.style.animation = 'shake 0.5s ease';
            setTimeout(() => {
                modal.style.animation = '';
            }, 500);
        }

        function confirmDeleteMessage() {
            if (!messageToDelete) return;
            
            // Удаляем сообщение из массива
            messages = messages.filter(m => m.timestamp !== messageToDelete.timestamp);
            localStorage.setItem('messages', JSON.stringify(messages));
            
            // Обновляем интерфейс
            if (currentChat && currentChatType) {
                renderMessages(currentChat, currentChatType);
            }
            
            showNotification('Message deleted');
            closeModal('deleteConfirmModal');
            messageToDelete = null;
        }

        function sendMessage() {
            const text = messageInput.value.trim();
            if (!text || !currentChat || !currentChatType) return;
            
            const newMessage = {
                text,
                sender: currentUser.username,
                timestamp: Date.now(),
                isVoiceMessage: false
            };
            
            if (currentChatType === 'user') {
                newMessage.receiver = currentChat;
                updateMessageStatuses(currentChat, 'sent');
            } else if (currentChatType === 'channel') {
                newMessage.channelId = currentChat;
            } else if (currentChatType === 'group') {
                newMessage.groupId = currentChat;
            }
            
            messages.push(newMessage);
            localStorage.setItem('messages', JSON.stringify(messages));
            
            messageInput.value = '';
            renderMessages(currentChat, currentChatType, newMessage); // Оптимизированный рендеринг
            
            // Simulate message status updates
            if (currentChatType === 'user') {
                setTimeout(() => {
                    updateMessageStatus(newMessage.timestamp, 'delivered');
                }, 1000);
                
                setTimeout(() => {
                    updateMessageStatus(newMessage.timestamp, 'read');
                }, 3000);
            }
        }

        function createMessageElement(msg, type) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${msg.sender === currentUser.username ? 'message-out' : 'message-in'}`;
            
            if (msg.sender !== currentUser.username && type !== 'channel') {
                const senderDiv = document.createElement('div');
                senderDiv.className = 'message-sender';
                
                const senderUser = users.find(u => u.username === msg.sender);
                let senderName = msg.sender;
                if (senderUser) {
                    senderName = senderUser.name || msg.sender;
                    if (senderUser.isVerified) {
                        senderName += '<span class="badge verified">VERIFIED</span>';
                    }
                }
                
                senderDiv.innerHTML = senderName;
                messageDiv.appendChild(senderDiv);
            }
            
            const textDiv = document.createElement('div');
            textDiv.className = 'message-text';
            
            if (msg.isVoiceMessage) {
                const voiceMessageDiv = document.createElement('div');
                voiceMessageDiv.className = 'voice-message';
                voiceMessageDiv.innerHTML = `
                    <audio src="${msg.audioBlob}" controls></audio>
                    <div class="voice-message-duration">${formatDuration(msg.duration)}</div>
                `;
                textDiv.appendChild(voiceMessageDiv);
            } else {
                textDiv.textContent = msg.text;
            }
            
            messageDiv.appendChild(textDiv);
            
            const timeDiv = document.createElement('div');
            timeDiv.className = 'message-time';
            timeDiv.textContent = formatTime(msg.timestamp);
            messageDiv.appendChild(timeDiv);
            
            return messageDiv;
        }

        function sendServerMessage() {
            const text = document.getElementById('serverMessageInput').value.trim();
            if (!text) {
                showNotification("Message cannot be empty");
                return;
            }
            
            if (!currentServer) {
                console.error("No current server selected");
                return;
            }
            
            const activeChannel = document.querySelector('.server-view .channel-item.active');
            if (!activeChannel) {
                console.error("No active channel selected");
                return;
            }
            
            const channelId = activeChannel.dataset.id;
            console.log("Sending message to server:", currentServer.id, "channel:", channelId);
            
            const newMessage = {
                text,
                sender: currentUser.username,
                timestamp: Date.now(),
                serverId: currentServer.id,
                channelId,
                isVoiceMessage: false
            };
            
            messages.push(newMessage);
            localStorage.setItem('messages', JSON.stringify(messages));
            
            document.getElementById('serverMessageInput').value = '';
            renderServerMessages(currentServer.id, channelId);
        }

        function handleKeyPress(e) {
            if (e.key === 'Enter') {
                e.preventDefault(); // Предотвращаем стандартное поведение
                sendMessage();
            }
        }

        function handleServerKeyPress(e) {
            if (e.key === 'Enter') {
                e.preventDefault(); // Предотвращаем стандартное поведение
                sendServerMessage();
            }
        }

        function updateMessageStatus(timestamp, status) {
            messageStatus[timestamp] = status;
            localStorage.setItem('messageStatus', JSON.stringify(messageStatus));
            
            if (currentChat && currentChatType) {
                renderMessages(currentChat, currentChatType);
            }
        }

        function updateMessageStatuses(identifier, status) {
            messages.forEach(msg => {
                if (msg.sender === identifier && msg.receiver === currentUser.username) {
                    messageStatus[msg.timestamp] = status;
                }
            });
            
            localStorage.setItem('messageStatus', JSON.stringify(messageStatus));
            renderChatList();
        }

        function startVoiceRecording() {
            if (isRecording) {
                stopVoiceRecording();
                return;
            }
        
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    isRecording = true;
                    voiceMessageBtn.innerHTML = '<i class="fas fa-stop"></i>';
                    voiceMessageBtn.classList.add('recording');
                    audioChunks = [];
                    
                    mediaRecorder = new MediaRecorder(stream);
                    mediaRecorder.start();
                    
                    mediaRecorder.ondataavailable = event => {
                        audioChunks.push(event.data);
                    };
                    
                    mediaRecorder.onstop = () => {
                        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                        sendVoiceMessage(audioBlob);
                        voiceMessageBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                        voiceMessageBtn.classList.remove('recording');
                        isRecording = false;
                        
                        // Освобождаем ресурсы
                        stream.getTracks().forEach(track => track.stop());
                    };
                    
                    // Автоматическая остановка через 1 минуту
                    setTimeout(() => {
                        if (isRecording) {
                            stopVoiceRecording();
                        }
                    }, 60000);
                })
                .catch(error => {
                    console.error('Error accessing microphone:', error);
                    showNotification('Microphone access denied');
                    isRecording = false;
                    voiceMessageBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                    voiceMessageBtn.classList.remove('recording');
                });
        }
        
        function stopVoiceRecording() {
            if (mediaRecorder && isRecording) {
                mediaRecorder.stop();
                isRecording = false;
            }
        }

        function sendVoiceMessage(audioBlob) {
            if (!currentChat || !currentChatType) return;
            
            const newMessage = {
                isVoiceMessage: true,
                audioBlob: URL.createObjectURL(audioBlob),
                sender: currentUser.username,
                timestamp: Date.now()
            };
            
            if (currentChatType === 'user') {
                newMessage.receiver = currentChat;
            } else if (currentChatType === 'channel') {
                newMessage.channelId = currentChat;
            } else if (currentChatType === 'group') {
                newMessage.groupId = currentChat;
            }
            
            messages.push(newMessage);
            localStorage.setItem('messages', JSON.stringify(messages));
            
            renderMessages(currentChat, currentChatType);
        }

        function blockContact() {
            if (!currentChat || currentChatType !== 'user') return;
            
            if (!blockedContacts[currentUser.username]) {
                blockedContacts[currentUser.username] = [];
            }
            
            const isBlocked = blockedContacts[currentUser.username].includes(currentChat);
            
            if (isBlocked) {
                blockedContacts[currentUser.username] = blockedContacts[currentUser.username].filter(u => u !== currentChat);
                showNotification(`${currentChat} unblocked`);
            } else {
                blockedContacts[currentUser.username].push(currentChat);
                showNotification(`${currentChat} blocked`);
            }
            
            localStorage.setItem('blockedContacts', JSON.stringify(blockedContacts));
            
            if (isBlocked) {
                blockBtn.innerHTML = '<i class="fas fa-ban"></i>';
                blockBtn.title = 'Block';
            } else {
                blockBtn.innerHTML = '<i class="fas fa-ban"></i>';
                blockBtn.title = 'Unblock';
            }
            
            renderMessages(currentChat, currentChatType);
        }

        function subscribeToChannel(channelId) {
            if (!subscriptions[currentUser.username]) {
                subscriptions[currentUser.username] = [];
            }
            
            if (!subscriptions[currentUser.username].includes(channelId)) {
                subscriptions[currentUser.username].push(channelId);
                localStorage.setItem('subscriptions', JSON.stringify(subscriptions));
                showNotification('Subscribed to channel');
                openChat(channelId, 'channel');
            }
        }

        function toggleFavorite() {
            if (!currentContextItem || !currentContextType) return;
            
            if (!currentUser.favorites) {
                currentUser.favorites = [];
            }
            
            const existingIndex = currentUser.favorites.findIndex(
                f => f.id === currentContextItem && f.type === currentContextType
            );
            
            if (existingIndex >= 0) {
                currentUser.favorites.splice(existingIndex, 1);
                showNotification('Removed from favorites');
            } else {
                currentUser.favorites.push({
                    id: currentContextItem,
                    type: currentContextType
                });
                showNotification('Added to favorites');
            }
            
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            renderChatList();
            contextMenu.style.display = 'none';
        }
        
        function setupContextMenuHandlers() {
            document.getElementById('openChatBtn')?.addEventListener('click', () => {
                openChat(currentContextItem, currentContextType);
                contextMenu.style.display = 'none';
            });
            
            document.getElementById('openProfileBtn')?.addEventListener('click', () => {
                if (currentContextType === 'user') {
                    showUserProfile(currentContextItem);
                }
                contextMenu.style.display = 'none';
            });
            
            document.getElementById('addFriendBtn')?.addEventListener('click', () => {
                if (currentContextType === 'user') {
                    sendFriendRequest(currentContextItem);
                }
                contextMenu.style.display = 'none';
            });
            
            document.getElementById('toggleFavoriteBtn')?.addEventListener('click', toggleFavorite);
            
            document.getElementById('blockUserBtn')?.addEventListener('click', () => {
                if (currentContextType === 'user') {
                    blockContact();
                }
                contextMenu.style.display = 'none';
            });
            
            document.getElementById('leaveChatBtn')?.addEventListener('click', () => {
                if (currentContextType === 'channel') {
                    leaveChannel(currentContextItem);
                } else if (currentContextType === 'group') {
                    leaveGroup(currentContextItem);
                }
                contextMenu.style.display = 'none';
            });
        }

        function showDesktopContextMenu(e, element) {
            const isFavorite = currentUser.favorites?.some(
                f => f.id === currentContextItem && f.type === currentContextType
            );
            
            const isBlocked = currentContextType === 'user' && 
                blockedContacts[currentUser.username]?.includes(currentContextItem);
            
            contextMenu.innerHTML = `
                <div class="custom-context-menu-item" id="openChatBtn">
                    <i class="fas fa-comment"></i> Open Chat
                </div>
                <div class="custom-context-menu-item" id="openProfileBtn">
                    <i class="fas fa-user"></i> Open Profile
                </div>
                ${currentContextType === 'user' ? `
                    <div class="custom-context-menu-item" id="addFriendBtn">
                        <i class="fas fa-user-plus"></i> Add Friend
                    </div>
                ` : ''}
                <div class="custom-context-menu-item" id="toggleFavoriteBtn">
                    <i class="fas fa-star"></i> ${isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                </div>
                ${currentContextType === 'user' ? `
                    <div class="custom-context-menu-item" id="blockUserBtn">
                        <i class="fas fa-ban"></i> ${isBlocked ? 'Unblock' : 'Block'}
                    </div>
                ` : ''}
                ${currentContextType !== 'user' ? `
                    <div class="custom-context-menu-item" id="leaveChatBtn">
                        <i class="fas fa-sign-out-alt"></i> ${currentContextType === 'channel' ? 'Unsubscribe' : 'Leave Group'}
                    </div>
                ` : ''}
            `;
            
            contextMenu.style.display = 'block';
            contextMenu.style.left = `${Math.min(e.pageX, window.innerWidth - 210)}px`;
            contextMenu.style.top = `${Math.min(e.pageY, window.innerHeight - 300)}px`;
            
            setupContextMenuHandlers();
        }

        let isRecording = false;

        function showUserProfile(username) {
            const user = users.find(u => u.username === username);
            if (!user) return;
            
            profileNameText.textContent = user.name || user.username;
            profileUsername.textContent = `@${user.username}`;
            profileBio.textContent = user.bio || 'No bio yet';
            
            // Count chats
            const chatCount = messages.filter(msg => 
                (msg.sender === user.username && msg.receiver === currentUser.username) ||
                (msg.sender === currentUser.username && msg.receiver === user.username)
            ).length;
            
            // Count subscriptions
            const subCount = subscriptions[user.username]?.length || 0;
            
            // Count friends
            const friendCount = friends[user.username]?.length || 0;
            
            profileChats.textContent = chatCount;
            profileSubs.textContent = subCount;
            profileFriends.textContent = friendCount;
            
            profileModal.classList.remove('hidden');
        }

        function openProfileModal() {
            if (!currentUser) return;
            
            profileNameText.textContent = currentUser.name || currentUser.username;
            profileUsername.textContent = `@${currentUser.username}`;
            profileBio.textContent = currentUser.bio || 'No bio yet';
            
            // Count chats
            const chatCount = messages.filter(msg => 
                msg.sender === currentUser.username || msg.receiver === currentUser.username
            ).length;
            
            // Count subscriptions
            const subCount = subscriptions[currentUser.username]?.length || 0;
            
            // Count friends
            const friendCount = friends[currentUser.username]?.length || 0;
            
            profileChats.textContent = chatCount;
            profileSubs.textContent = subCount;
            profileFriends.textContent = friendCount;
            
            profileModal.classList.remove('hidden');
        }

        function closeProfileModal() {
            profileModal.classList.add('hidden');
        }

        function openEditProfileModal() {
            if (!currentUser) return;
            
            editName.value = currentUser.name || '';
            editUsername.value = currentUser.username;
            editBio.value = currentUser.bio || '';
            
            profileModal.classList.add('hidden');
            editProfileModal.classList.remove('hidden');
        }

        function closeEditProfileModal() {
            editProfileModal.classList.add('hidden');
            profileModal.classList.remove('hidden');
        }

        function saveProfile() {
            if (!currentUser) return;
            
            currentUser.name = editName.value.trim();
            currentUser.username = editUsername.value.trim();
            currentUser.bio = editBio.value.trim();
            
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Update in users array
            const userIndex = users.findIndex(u => u.id === currentUser.id);
            if (userIndex >= 0) {
                users[userIndex] = currentUser;
                localStorage.setItem('users', JSON.stringify(users));
            }
            
            showNotification('Profile updated');
            closeEditProfileModal();
            openProfileModal();
        }

        function openSettingsModal() {
            settingsModal.classList.remove('hidden');
            profileModal.classList.add('hidden');
        }

        function closeSettingsModal() {
            settingsModal.classList.add('hidden');
        }

        function openPremiumModal() {
            premiumModal.classList.remove('hidden');
            profileModal.classList.add('hidden');
        }

        function closePremiumModal() {
            premiumModal.classList.add('hidden');
        }

        function purchasePremium() {
            if (!currentUser) return;
            
            currentUser.isPremium = true;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Update in users array
            const userIndex = users.findIndex(u => u.id === currentUser.id);
            if (userIndex >= 0) {
                users[userIndex] = currentUser;
                localStorage.setItem('users', JSON.stringify(users));
            }
            
            showNotification('Premium subscription activated!');
            closePremiumModal();
            openProfileModal();
        }

        function openCreateServerModal() {
            document.getElementById('createServerModal').classList.remove('hidden');
        }

        function closeModal(modalId) {
            const modal = document.getElementById(modalId);
            modal.classList.add('hidden');
            
            if (modalId === 'deleteConfirmModal') {
                messageToDelete = null;
            }
        }

        function createServer() {
            const name = document.getElementById('serverNameInput').value.trim();
            if (!name) return;
            
            const newServer = {
                id: 's' + Date.now(),
                name,
                owner: currentUser.username,
                createdAt: Date.now(),
                channels: [
                    { id: 'c' + Date.now(), name: 'general', type: 'text' }
                ],
                members: [currentUser.username]
            };
            
            servers.push(newServer);
            localStorage.setItem('servers', JSON.stringify(servers));
            
            if (!currentUser.favorites) {
                currentUser.favorites = [];
            }
            
            currentUser.favorites.push({
                id: newServer.id,
                type: 'server'
            });
            
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            closeModal('createServerModal');
            showNotification('Server created');
            renderServers();
            renderChatList();
        }

        function openServerSettings() {
            document.getElementById('serverSettingsModal').classList.remove('hidden');
        }

        function closeServerSettings() {
            document.getElementById('serverSettingsModal').classList.add('hidden');
        }

        function deleteServer() {
            if (!currentServer) return;
            
            if (confirm('Are you sure you want to delete this server? This cannot be undone.')) {
                servers = servers.filter(s => s.id !== currentServer.id);
                localStorage.setItem('servers', JSON.stringify(servers));
                
                messages = messages.filter(m => m.serverId !== currentServer.id);
                localStorage.setItem('messages', JSON.stringify(messages));
                
                closeServerSettings();
                serverView.classList.add('hidden');
                chatArea.classList.remove('hidden');
                currentServer = null;
                
                showNotification('Server deleted');
                renderServers();
                renderChatList();
            }
        }

        function openCreateChannelModal() {
            document.getElementById('createChannelModal').classList.remove('hidden');
        }

        function createChannel() {
            const name = document.getElementById('channelName').value.trim();
            const type = document.getElementById('channelType').value;
            if (!name) return;
            
            const newChannel = {
                id: 'ch' + Date.now(),
                name,
                type,
                owner: currentUser.username,
                createdAt: Date.now()
            };
            
            channels.push(newChannel);
            localStorage.setItem('channels', JSON.stringify(channels));
            
            if (!subscriptions[currentUser.username]) {
                subscriptions[currentUser.username] = [];
            }
            
            subscriptions[currentUser.username].push(newChannel.id);
            localStorage.setItem('subscriptions', JSON.stringify(subscriptions));
            
            closeModal('createChannelModal');
            showNotification('Channel created');
            renderChatList();
        }

        function leaveChannel(channelId) {
            if (!subscriptions[currentUser.username]) return;
            
            subscriptions[currentUser.username] = subscriptions[currentUser.username].filter(id => id !== channelId);
            localStorage.setItem('subscriptions', JSON.stringify(subscriptions));
            
            showNotification('You left the channel');
            renderChatList();
            
            if (currentChat === channelId && currentChatType === 'channel') {
                currentChat = null;
                currentChatType = null;
                messagesContainer.innerHTML = '<div class="no-chat-selected"><p>Select a chat to start messaging</p></div>';
                messageInputContainer.classList.add('hidden');
            }
        }

        function openCreateGroupModal() {
            document.getElementById('createGroupModal').classList.remove('hidden');
        }

        function createGroup() {
            const name = document.getElementById('groupName').value.trim();
            if (!name) return;
            
            const newGroup = {
                id: 'g' + Date.now(),
                name,
                members: [currentUser.username],
                createdAt: Date.now()
            };
            
            groups.push(newGroup);
            localStorage.setItem('groups', JSON.stringify(groups));
            
            closeModal('createGroupModal');
            showNotification('Group created');
            renderChatList();
        }

        function leaveGroup(groupId) {
            const group = groups.find(g => g.id === groupId);
            if (!group) return;
            
            group.members = group.members.filter(m => m !== currentUser.username);
            localStorage.setItem('groups', JSON.stringify(groups));
            
            showNotification('You left the group');
            renderChatList();
            
            if (currentChat === groupId && currentChatType === 'group') {
                currentChat = null;
                currentChatType = null;
                messagesContainer.innerHTML = '<div class="no-chat-selected"><p>Select a chat to start messaging</p></div>';
                messageInputContainer.classList.add('hidden');
            }
        }

        function toggleCategory(element) {
            const icon = element.querySelector('i');
            const isExpanded = icon.classList.contains('fa-chevron-down');
            
            if (isExpanded) {
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-right');
            } else {
                icon.classList.remove('fa-chevron-right');
                icon.classList.add('fa-chevron-down');
            }
            
            const channelList = element.nextElementSibling;
            channelList.classList.toggle('hidden');
        }

        function showNotification(message) {
            const notification = document.createElement('div');
            notification.className = 'realtime-notification';
            notification.innerHTML = `
                <i class="fas fa-bell"></i>
                <span>${message}</span>
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.opacity = '0';
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }, 3000);
        }

        function simulateMessageStatusUpdates() {
            if (!currentUser) return;
            
            // Simulate receiving new messages
            setInterval(() => {
                if (Math.random() > 0.7) {
                    const possibleSenders = users.filter(u => 
                        u.username !== currentUser.username && 
                        !blockedContacts[currentUser.username]?.includes(u.username)
                    );
                    
                    if (possibleSenders.length > 0) {
                        const sender = possibleSenders[Math.floor(Math.random() * possibleSenders.length)];
                        const newMessage = {
                            text: getRandomMessage(),
                            sender: sender.username,
                            receiver: currentUser.username,
                            timestamp: Date.now(),
                            isVoiceMessage: false
                        };
                        
                        messages.push(newMessage);
                        localStorage.setItem('messages', JSON.stringify(messages));
                        
                        if (currentChat !== sender.username || currentChatType !== 'user') {
                            renderChatList();
                            showNotification(`New message from ${sender.username}`);
                        } else {
                            renderMessages(currentChat, currentChatType);
                        }
                    }
                }
            }, 15000);
        }

        function updateUserStatus(username, isOnline) {
            const user = users.find(u => u.username === username);
            if (user) {
                user.lastSeen = isOnline ? new Date().toISOString() : null;
                localStorage.setItem('users', JSON.stringify(users));
                
                if (currentChat === username && currentChatType === 'user') {
                    renderMessages(currentChat, currentChatType);
                }
                
                renderChatList();
            }
        }

        function checkForNewMessages() {
            if (!currentUser) return;
            
            const hasUnread = messages.some(msg => 
                msg.receiver === currentUser.username && 
                (!messageStatus[msg.timestamp] || messageStatus[msg.timestamp] !== 'read')
            );
            
            if (hasUnread) {
                document.title = `(*) Blink Web`;
            } else {
                document.title = `Blink Web`;
            }
        }

        function formatDate(date) {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (date.toDateString() === today.toDateString()) {
                return 'Today';
            } else if (date.toDateString() === yesterday.toDateString()) {
                return 'Yesterday';
            } else {
                return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
            }
        }

        function formatTime(timestamp) {
            return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        function logout() {
            if (currentUser) {
                updateUserStatus(currentUser.username, false);
            }
            
            currentUser = null;
            localStorage.removeItem('currentUser');
            showAuthScreen();
        }

        function setupDropdown() {
            document.getElementById('userDropdownToggle').addEventListener('click', openProfileModal);
        }

        function setupContextMenu() {
            document.addEventListener('click', (e) => {
                if (!contextMenu.contains(e.target)) {
                    contextMenu.style.display = 'none';
                }
            });
        }

        function setupSidebarToggle() {
            if (window.innerWidth >= 768) return;
            
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.sidebar') && !e.target.closest('.mobile-back-btn')) {
                    document.querySelector('.sidebar').classList.add('collapsed-mobile');
                }
            });
        }

        function closeAllModals() {
            document.querySelectorAll('.profile-modal:not(.hidden), .modal-overlay:not(.hidden)').forEach(modal => {
                modal.classList.add('hidden');
            });
        }
 
        // В функции setupContextMenuHandlers() добавьте:
        document.getElementById('serverSidebar').addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const serverIcon = e.target.closest('.server-icon');
            if (serverIcon && serverIcon !== document.querySelector('.server-icon.add-server')) {
                currentContextItem = serverIcon.dataset.serverId;
                currentContextType = 'server';
                showDesktopContextMenu(e, serverIcon);
            }
        });
        document.addEventListener('contextmenu', (e) => {
            if (!e.target.closest('.custom-context-menu')) {
                e.preventDefault();
            }
        });
        function givePartner(userId) {
            if (currentUser.username === ADMIN_USERNAME) {
                const user = users.find(u => u.id === userId);
                if (user) {
                    user.isPartner = true;
                    localStorage.setItem('users', JSON.stringify(users));
                    showNotification(`Партнерка выдана пользователю ${user.username}`);
                }
            }
        }
        
    let audioContext;
    let audioStream;

    async function startVoiceChat() {
        try {
            audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(audioStream);
            source.connect(audioContext.destination);
        } catch (err) {
            console.error("Ошибка доступа к микрофону:", err);
        }
    }

    function stopVoiceChat() {
        if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
        }
        if (audioContext) {
            audioContext.close();
        }
    }

    function showMemberContextMenu(e, member) {
        if (currentServer.owner === currentUser.username) {
            currentContextItem = member;
            currentContextType = 'server-member';
            
            const menu = document.getElementById('contextMenu');
            menu.innerHTML = `
                <div class="custom-context-menu-item" onclick="kickMember('${member}')">
                    <i class="fas fa-user-minus"></i> Кикнуть
                </div>
                <div class="custom-context-menu-item" onclick="banMember('${member}')">
                    <i class="fas fa-ban"></i> Забанить
                </div>
                <div class="custom-context-menu-item" onclick="giveAdmin('${member}')">
                    <i class="fas fa-shield-alt"></i> Дать админку
                </div>
            `;
            
            menu.style.display = 'block';
            menu.style.left = `${e.pageX}px`;
            menu.style.top = `${e.pageY}px`;
        }
    }

    function setupMessageInteractions() {
        document.addEventListener('click', (e) => {
            const message = e.target.closest('.message');
            if (message && e.button === 2) { // Right click
                const messageId = message.dataset.id;
                currentMessageContext = messages.find(m => m.id === messageId);
                showMessageContextMenu(e, message);
            }
        });
    }
    
    function backToContacts() {
        currentChat = null;
        currentChatType = null;
        document.querySelector('.sidebar').classList.remove('hidden');
        document.querySelector('.chat-area').classList.add('hidden');
        renderChatList();
    }

    // Добавьте в script.js
function startCall() {
    // Здесь будет логика инициализации звонка
    console.log("Starting call...");
    // Можно открыть модальное окно звонка
    document.getElementById('callModal').classList.remove('hidden');
    
    // Или показать уведомление
    showNotification("Calling user...");
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'custom-notification';
    notification.innerHTML = `
        <i class="fas fa-phone"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function setupMessageInteractions() {
    document.addEventListener('click', (e) => {
        const message = e.target.closest('.message');
        if (message && e.button === 2) { // Right click
            const messageId = message.dataset.id;
            currentMessageContext = messages.find(m => m.id === messageId);
            showMessageContextMenu(e, message);
        }
    });

    // Обработчик для кнопки Copy
    document.getElementById('copyMessageBtn')?.addEventListener('click', copyMessage);
    
    // Обработчик для кнопки Edit
    document.getElementById('editMessageBtn')?.addEventListener('click', editMessage);
    
    // Обработчик для кнопки Delete
    document.getElementById('deleteMessageBtn')?.addEventListener('click', deleteMessage);
}

        // Initialize the app
        init()