/**
 * public/js/chat.js
 *
 * Live chat UI.
 *
 * Responsibilities:
 * - Join/leave rooms, create rooms, send messages
 * - Render server events in the chat log
 * - Display connection/auth state
 */
(() => {
  const roomsListEl = document.getElementById('roomsList');
  const chatLogEl = document.getElementById('chatLog');
  const currentRoomNameEl = document.getElementById('currentRoomName');
  const chatConnectionStatusEl = document.getElementById('chatConnectionStatus');
  const chatAuthNoticeEl = document.getElementById('chatAuthNotice');

  const newRoomNameEl = document.getElementById('newRoomName');
  const newRoomPrivateEl = document.getElementById('newRoomPrivate');
  const newRoomPasswordEl = document.getElementById('newRoomPassword');
  const createRoomBtn = document.getElementById('createRoomBtn');
  const createRoomResultEl = document.getElementById('createRoomResult');

  const myPrivateRoomsListEl = document.getElementById('myPrivateRoomsList');

  const joinCodeEl = document.getElementById('joinCode');
  const joinPasswordEl = document.getElementById('joinPassword');
  const joinByCodeBtn = document.getElementById('joinByCodeBtn');

  const inviteCodeDisplayEl = document.getElementById('inviteCodeDisplay');
  const copyInviteBtn = document.getElementById('copyInviteBtn');
  const inviteResultEl = document.getElementById('inviteResult');

  const leaveRoomBtn = document.getElementById('leaveRoomBtn');
  const sendForm = document.getElementById('chatSendForm');
  const messageInput = document.getElementById('chatMessageInput');
  const sendBtn = sendForm.querySelector('button[type="submit"]');

  const emojiBtn = document.getElementById('emojiBtn');
  const emojiPanel = document.getElementById('emojiPanel');
  const chatFileInput = document.getElementById('chatFileInput');
  const uploadBtn = document.getElementById('uploadBtn');

  const gifBtn = document.getElementById('gifBtn');
  const gifPanel = document.getElementById('gifPanel');
  const gifSearchInput = document.getElementById('gifSearchInput');
  const gifResultsEl = document.getElementById('gifResults');
  const gifResultHintEl = document.getElementById('gifResultHint');

  const presenceListEl = document.getElementById('presenceList');

  const state = {
    socket: null,
    user: null,
    currentRoom: null,
    lastPresence: null
  };

  let bootInProgress = false;

  const messageElsById = new Map();

  let uiWired = false;
  let lastAction = null;

  let presencePollTimer = null;
  let gifSearchTimer = null;
  let gifAbort = null;

  function ensureSocketIoLoaded() {
    if (typeof window.io !== 'undefined') return Promise.resolve();

    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src="/socket.io/socket.io.js"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Failed to load Socket.IO client')), {
          once: true
        });
        return;
      }

      const script = document.createElement('script');
      script.src = '/socket.io/socket.io.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Socket.IO client'));
      document.head.appendChild(script);
    });
  }

  function getGifErrorHint(data, fallback) {
    const raw = String(data?.message || data?.error || '').trim();
    if (/auth/i.test(raw)) return 'Sign in to load GIFs.';
    return raw || fallback;
  }

  function formatTime(dateValue) {
    const d = new Date(dateValue);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `[${hh}:${mm}]`;
  }

  function setNotice(text) {
    chatAuthNoticeEl.textContent = text || '';
  }

  function setConnectionStatus(text) {
    if (!chatConnectionStatusEl) return;
    chatConnectionStatusEl.textContent = text || '';
  }

  function setCreateResult(text) {
    createRoomResultEl.textContent = text || '';
  }

  function setInviteResult(text) {
    if (!inviteResultEl) return;
    inviteResultEl.textContent = text || '';
  }

  function setInviteCode(code) {
    if (!inviteCodeDisplayEl || !copyInviteBtn) return;
    inviteCodeDisplayEl.value = code || '';
    copyInviteBtn.disabled = !code;
  }

  function setRoomUIEnabled(enabled) {
    messageInput.disabled = !enabled;
    sendBtn.disabled = !enabled;
    leaveRoomBtn.disabled = !enabled;

    if (emojiBtn) emojiBtn.disabled = !enabled;
    if (gifBtn) gifBtn.disabled = !enabled;
    if (uploadBtn) uploadBtn.disabled = !enabled;
  }

  function setGifHint(text) {
    if (!gifResultHintEl) return;
    gifResultHintEl.textContent = text || '';
  }

  function clearPresence() {
    state.lastPresence = null;
    if (!presenceListEl) return;
    presenceListEl.innerHTML = '';
  }

  function renderPresence(payload) {
    state.lastPresence = payload;
    if (!presenceListEl) return;

    const users = Array.isArray(payload?.users) ? payload.users : [];
    if (!users.length) {
      presenceListEl.innerHTML = '<div class="chat-muted">No one yet.</div>';
      return;
    }

    presenceListEl.innerHTML = '';
    users.forEach((u) => {
      const row = document.createElement('div');
      row.className = 'chat-presence-item';

      const name = document.createElement('div');
      name.textContent = u.username || 'user';

      const status = document.createElement('div');
      status.className = 'chat-presence-status';
      status.textContent = u.active ? 'Active' : 'Idle';

      row.appendChild(name);
      row.appendChild(status);
      presenceListEl.appendChild(row);
    });
  }

  function stopPresencePolling() {
    if (!presencePollTimer) return;
    clearInterval(presencePollTimer);
    presencePollTimer = null;
  }

  function startPresencePolling() {
    stopPresencePolling();
    if (!state.socket || !state.currentRoom) return;
    presencePollTimer = setInterval(() => {
      if (!state.socket || !state.currentRoom) return;
      state.socket.emit('chat:presence_request', { roomId: state.currentRoom.id });
    }, 30_000);
  }

  async function searchGifs(q) {
    if (!gifResultsEl) return;

    const query = String(q || '').trim();

    if (gifAbort) {
      try {
        gifAbort.abort();
      } catch {
        // ignore
      }
    }
    gifAbort = new AbortController();

    gifResultsEl.innerHTML = '';

    if (!query) {
      await loadTrendingGifs();
      return;
    }

    setGifHint('Searching…');
    try {
      const res = await fetch(`/api/chat/gifs/search?q=${encodeURIComponent(query)}&limit=24`, {
        signal: gifAbort.signal
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGifHint(getGifErrorHint(data, 'GIF search failed.'));
        return;
      }

      const results = Array.isArray(data?.results) ? data.results : [];
      if (!results.length) {
        setGifHint('No results.');
        return;
      }

      setGifHint('Click a GIF to send.');

      results.forEach((r) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chat-gif-item';

        const img = document.createElement('img');
        img.className = 'chat-gif-thumb';
        img.loading = 'lazy';
        img.alt = r.title || 'gif';
        img.src = r.previewUrl || r.url;

        btn.appendChild(img);
        btn.addEventListener('click', () => {
          if (!state.socket || !state.currentRoom) {
            setNotice('Join a room first.');
            return;
          }
          const url = String(r.url || '').trim();
          if (!url) return;
          state.socket.emit('chat:message', { roomId: state.currentRoom.id, content: url });
          if (gifPanel) gifPanel.hidden = true;
        });

        gifResultsEl.appendChild(btn);
      });
    } catch (error) {
      if (String(error?.name || '') === 'AbortError') return;
      setGifHint('GIF search failed.');
    }
  }

  async function loadTrendingGifs() {
    if (!gifResultsEl) return;

    if (gifAbort) {
      try {
        gifAbort.abort();
      } catch {
        // ignore
      }
    }
    gifAbort = new AbortController();

    gifResultsEl.innerHTML = '';
    setGifHint('Trending…');

    try {
      const res = await fetch('/api/chat/gifs/trending?limit=24', { signal: gifAbort.signal });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGifHint(getGifErrorHint(data, 'Failed to load trending GIFs.'));
        return;
      }

      const results = Array.isArray(data?.results) ? data.results : [];
      if (!results.length) {
        setGifHint('No trending results.');
        return;
      }

      setGifHint('Trending — click a GIF to send.');

      results.forEach((r) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chat-gif-item';

        const img = document.createElement('img');
        img.className = 'chat-gif-thumb';
        img.loading = 'lazy';
        img.alt = r.title || 'gif';
        img.src = r.previewUrl || r.url;

        btn.appendChild(img);
        btn.addEventListener('click', () => {
          if (!state.socket || !state.currentRoom) {
            setNotice('Join a room first.');
            return;
          }
          const url = String(r.url || '').trim();
          if (!url) return;
          state.socket.emit('chat:message', { roomId: state.currentRoom.id, content: url });
          if (gifPanel) gifPanel.hidden = true;
        });

        gifResultsEl.appendChild(btn);
      });
    } catch (error) {
      if (String(error?.name || '') === 'AbortError') return;
      setGifHint('Failed to load trending GIFs.');
    }
  }

  function clearChatLog() {
    chatLogEl.innerHTML = '';
    messageElsById.clear();
  }

  function getMyUserId() {
    return String(state?.user?._id || '').trim();
  }

  function updateMessageLine(line, payload) {
    if (!line) return;
    const msgEl = line.querySelector('.chat-msg');
    if (!msgEl) return;

    const content = String(payload?.content || '');
    const deletedAt = payload?.deletedAt ? new Date(payload.deletedAt) : null;
    const editedAt = payload?.editedAt ? new Date(payload.editedAt) : null;

    line.dataset.rawContent = content;
    line.dataset.deletedAt = deletedAt ? deletedAt.toISOString() : '';
    line.dataset.editedAt = editedAt ? editedAt.toISOString() : '';

    msgEl.innerHTML = '';
    renderMessageContent(msgEl, content);

    const editedBadge = line.querySelector('.chat-edited');
    if (editedBadge) {
      editedBadge.hidden = !editedAt || !!deletedAt;
    }

    const actions = line.querySelector('.chat-actions');
    if (actions) {
      actions.hidden = !!deletedAt;
    }
  }

  function appendLine({ id, roomId, userId, createdAt, username, content, editedAt, deletedAt }) {
    const line = document.createElement('div');
    line.className = 'chat-line';

    const msgId = String(id || '').trim();
    if (msgId) {
      line.dataset.messageId = msgId;
      messageElsById.set(msgId, line);
    }
    line.dataset.rawContent = String(content || '');
    if (editedAt) line.dataset.editedAt = new Date(editedAt).toISOString();
    if (deletedAt) line.dataset.deletedAt = new Date(deletedAt).toISOString();

    const ts = document.createElement('span');
    ts.className = 'chat-ts';
    ts.textContent = formatTime(createdAt);

    const user = document.createElement('span');
    user.className = 'chat-user';
    user.textContent = String(username || '');

    const colon = document.createTextNode(': ');

    const msg = document.createElement('span');
    msg.className = 'chat-msg';
    renderMessageContent(msg, String(content || ''));

    const editedBadge = document.createElement('span');
    editedBadge.className = 'chat-edited';
    editedBadge.textContent = ' (edited)';
    editedBadge.hidden = !editedAt || !!deletedAt;

    const actions = document.createElement('span');
    actions.className = 'chat-actions';

    const isMine = !!getMyUserId() && String(userId || '') === getMyUserId();
    const isDeleted = !!deletedAt;
    actions.hidden = !isMine || isDeleted || !msgId;

    if (!actions.hidden) {
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'chat-action-btn';
      editBtn.textContent = 'Edit';

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'chat-action-btn chat-action-danger';
      deleteBtn.textContent = 'Delete';

      editBtn.addEventListener('click', () => {
        if (!state.socket) return;
        if (line.dataset.editing === '1') return;
        line.dataset.editing = '1';

        const original = String(line.dataset.rawContent || '');
        msg.innerHTML = '';

        const editor = document.createElement('textarea');
        editor.className = 'chat-edit-input';
        editor.value = original;
        editor.maxLength = 2000;

        const row = document.createElement('span');
        row.className = 'chat-edit-actions';

        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'chat-action-btn';
        saveBtn.textContent = 'Save';

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'chat-action-btn';
        cancelBtn.textContent = 'Cancel';

        const closeEditor = () => {
          line.dataset.editing = '';
          msg.innerHTML = '';
          renderMessageContent(msg, String(line.dataset.rawContent || ''));
        };

        cancelBtn.addEventListener('click', closeEditor);

        saveBtn.addEventListener('click', () => {
          const next = editor.value.trim();
          if (!next) {
            setNotice('Message cannot be empty.');
            return;
          }
          saveBtn.disabled = true;
          cancelBtn.disabled = true;
          state.socket.emit('chat:message_edit', { messageId: msgId, content: next });
          // Wait for broadcast update to re-render; if it fails, server will emit chat:error.
          setTimeout(() => {
            saveBtn.disabled = false;
            cancelBtn.disabled = false;
          }, 1500);
        });

        row.appendChild(saveBtn);
        row.appendChild(cancelBtn);

        msg.appendChild(editor);
        msg.appendChild(row);

        editor.focus();
        editor.setSelectionRange(editor.value.length, editor.value.length);
      });

      deleteBtn.addEventListener('click', () => {
        if (!state.socket) return;
        if (!confirm('Delete this message?')) return;
        state.socket.emit('chat:message_delete', { messageId: msgId });
      });

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);
    }

    line.appendChild(ts);
    line.appendChild(document.createTextNode(' '));
    line.appendChild(user);
    line.appendChild(colon);
    line.appendChild(msg);
    line.appendChild(editedBadge);
    line.appendChild(actions);

    chatLogEl.appendChild(line);
    chatLogEl.scrollTop = chatLogEl.scrollHeight;
  }

  function formatBytes(bytes) {
    const n = Number(bytes) || 0;
    if (n < 1024) return `${n} B`;
    const kb = n / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  }

  function safeUrl(raw) {
    try {
      const u = new URL(raw, window.location.origin);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
      return u;
    } catch {
      return null;
    }
  }

  function parseFileTag(content) {
    // Format: [[file:<url>|<name>|<mime>|<size>]]
    const m = content.match(/^\[\[file:([^|\]]+)\|([^|\]]+)\|([^|\]]+)\|(\d+)\]\]$/);
    if (!m) return null;
    return {
      url: m[1],
      name: m[2],
      mimeType: m[3],
      size: Number(m[4])
    };
  }

  function linkifyInto(container, text) {
    const re = /(https?:\/\/[^\s]+)/g;
    let last = 0;
    const s = String(text || '');
    let match;
    while ((match = re.exec(s))) {
      const before = s.slice(last, match.index);
      if (before) container.appendChild(document.createTextNode(before));

      const raw = match[1];
      const u = safeUrl(raw);
      if (!u) {
        container.appendChild(document.createTextNode(raw));
      } else {
        const a = document.createElement('a');
        a.href = u.toString();
        a.target = '_blank';
        a.rel = 'noreferrer noopener';
        a.textContent = raw;
        container.appendChild(a);
      }

      last = match.index + raw.length;
    }
    const after = s.slice(last);
    if (after) container.appendChild(document.createTextNode(after));
  }

  function isImageUrl(u) {
    const p = u.pathname.toLowerCase();
    if (p.endsWith('.png') || p.endsWith('.jpg') || p.endsWith('.jpeg') || p.endsWith('.gif') || p.endsWith('.webp')) {
      return true;
    }

    // Also allow our authenticated download endpoint to be previewed (when it is an image)
    return p.startsWith('/api/chat/uploads/');
  }

  function renderMessageContent(container, content) {
    const trimmed = String(content || '').trim();
    if (!trimmed) return;

    const tag = parseFileTag(trimmed);
    if (tag) {
      const u = safeUrl(tag.url);

      const a = document.createElement('a');
      a.href = u ? u.toString() : '#';
      a.target = '_blank';
      a.rel = 'noreferrer noopener';
      a.textContent = `📎 ${tag.name} (${formatBytes(tag.size)})`;
      if (!u) {
        a.removeAttribute('href');
      }
      container.appendChild(a);

      if (u && String(tag.mimeType || '').toLowerCase().startsWith('image/')) {
        const embed = document.createElement('div');
        embed.className = 'chat-embed';
        const img = document.createElement('img');
        img.className = 'chat-embed-img';
        img.loading = 'lazy';
        img.alt = tag.name;
        img.src = u.toString();
        embed.appendChild(img);
        container.appendChild(embed);
      }
      return;
    }

    // If the message is a single URL and it's an image, embed it.
    const maybeUrl = safeUrl(trimmed);
    if (maybeUrl && trimmed === maybeUrl.toString() && isImageUrl(maybeUrl)) {
      const a = document.createElement('a');
      a.href = maybeUrl.toString();
      a.target = '_blank';
      a.rel = 'noreferrer noopener';
      a.textContent = trimmed;
      container.appendChild(a);

      const embed = document.createElement('div');
      embed.className = 'chat-embed';
      const img = document.createElement('img');
      img.className = 'chat-embed-img';
      img.loading = 'lazy';
      img.alt = 'image';
      img.src = maybeUrl.toString();
      embed.appendChild(img);
      container.appendChild(embed);
      return;
    }

    // Otherwise: plain text with simple linkify.
    linkifyInto(container, content);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function renderRooms(rooms) {
    roomsListEl.innerHTML = '';

    if (!rooms || rooms.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'chat-muted';
      empty.textContent = 'No public rooms yet.';
      roomsListEl.appendChild(empty);
      return;
    }

    rooms.forEach((room) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chat-room-item';
      btn.textContent = `# ${room.name}`;
      btn.addEventListener('click', () => {
        joinRoom(room.id, '');
      });
      roomsListEl.appendChild(btn);
    });
  }

  function renderMyPrivateRooms(rooms) {
    if (!myPrivateRoomsListEl) return;
    myPrivateRoomsListEl.innerHTML = '';

    if (!rooms || rooms.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'chat-muted';
      empty.textContent = 'None yet.';
      myPrivateRoomsListEl.appendChild(empty);
      return;
    }

    rooms.forEach((room) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chat-room-item';
      btn.textContent = `🔒 ${room.name}`;
      btn.addEventListener('click', () => {
        // Always do something visible on click.
        setInviteResult('Fetching invite code…');

        const code = room.inviteCode || '';
        if (code) {
          setInviteCode(code);
          if (joinCodeEl) joinCodeEl.value = code;
          setInviteResult('Invite code filled. Click Copy to share.');
        }

        // Creator-only on server; will respond with chat:invite.
        if (state.socket && room?.id) {
          state.socket.emit('chat:get_invite', { roomId: room.id });
        }

        if (joinPasswordEl) {
          joinPasswordEl.focus();
        }
      });
      myPrivateRoomsListEl.appendChild(btn);
    });
  }

  function joinRoom(identifier, password) {
    if (!state.socket) return;
    setNotice('');

    state.socket.emit('chat:join_room', {
      identifier,
      password: password || ''
    });
  }

  function handleSlashCommand(raw) {
    const input = raw.trim();
    const parts = input.split(/\s+/);
    const cmd = (parts[0] || '').toLowerCase();
    const arg = parts.slice(1).join(' ').trim();

    if (!state.socket) return true;

    switch (cmd) {
      case '/help':
        setNotice('Commands: /rooms, /join <room>, /create <room>, /invite, /clear');
        return true;
      case '/rooms':
        state.socket.emit('chat:list_rooms');
        setNotice('Refreshing rooms…');
        return true;
      case '/join':
        if (!arg) {
          setNotice('Usage: /join <room>');
          return true;
        }
        joinRoom(arg, '');
        return true;
      case '/create':
        if (!arg) {
          setNotice('Usage: /create <room>');
          return true;
        }
        state.socket.emit('chat:create_room', { name: arg, isPrivate: false, password: '' });
        return true;
      case '/invite':
        if (!state.currentRoom) {
          setNotice('Join a room first.');
          return true;
        }
        state.socket.emit('chat:get_invite', { roomId: state.currentRoom.id });
        return true;
      case '/clear':
        clearChatLog();
        return true;
      default:
        setNotice('Unknown command. Try /help');
        return true;
    }
  }

  async function startWithUser(user) {
    state.user = user;
    setConnectionStatus('Connecting…');

    try {
      await ensureSocketIoLoaded();
    } catch {
      setNotice('Live Chat failed to load. Please refresh and try again.');
      setConnectionStatus('Offline');
      return;
    }

    // Important: Socket.IO starts connecting immediately by default.
    // If the connection is very fast, we can miss early server events (like `chat:rooms`)
    // if handlers are attached after the `connect` event fires.
    // Use `autoConnect:false` so we always attach handlers before connecting.
    state.socket = io('/chat', {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1500,
      reconnectionAttempts: 10
    });

    state.socket.on('connect', () => {
      setNotice('');
      setConnectionStatus('Connected');
      const userId = state.user?._id || state.user?.id;
      state.socket.emit('chat:authenticate', userId);
      // Public rooms list is view-only and should work even if auth fails.
      state.socket.emit('chat:list_rooms');
    });

    state.socket.on('chat:authenticated', () => {
      setConnectionStatus('Connected');
      state.socket.emit('chat:list_rooms');
      state.socket.emit('chat:list_my_private_rooms');
      // Friendly default: drop new users into #lobby
      joinRoom('lobby', '');
    });

    state.socket.on('chat:auth_error', (data) => {
      setNotice(data?.message || 'Chat authentication failed.');
      setConnectionStatus('Auth failed');
      // Still allow listing public rooms when auth fails.
      try {
        state.socket.emit('chat:list_rooms');
      } catch {
        // ignore
      }
      try {
        localStorage.removeItem('currentUser');
      } catch {
        // ignore
      }
    });

    state.socket.on('chat:rooms', (data) => {
      renderRooms(data?.rooms || []);
    });

    state.socket.on('chat:my_private_rooms', (data) => {
      renderMyPrivateRooms(data?.rooms || []);
    });

    state.socket.on('chat:room_created', (data) => {
      const room = data?.room;
      if (!room) return;

      lastAction = null;

      if (data?.inviteCode) {
        setCreateResult(`Private room created. Invite code: ${data.inviteCode}`);
        setInviteCode(data.inviteCode);
        setInviteResult('Share this invite code to let others join.');
      } else {
        setCreateResult('Room created.');
      }

      // Join immediately
      // NOTE: server requires private rooms be joined by invite code.
      const joinIdentifier = data?.inviteCode ? data.inviteCode : room.id;
      joinRoom(joinIdentifier, newRoomPasswordEl.value.trim());

      // Clear create form
      newRoomNameEl.value = '';
      newRoomPrivateEl.checked = false;
      newRoomPasswordEl.value = '';

      // Keep password field in sync with private toggle
      if (newRoomPasswordEl) {
        newRoomPasswordEl.disabled = true;
        newRoomPasswordEl.placeholder = 'Password (private rooms only)';
      }

      state.socket.emit('chat:list_rooms');
      state.socket.emit('chat:list_my_private_rooms');
    });

    state.socket.on('chat:invite', (data) => {
      if (data?.inviteCode) {
        setInviteCode(data.inviteCode);
        setInviteResult('Invite code ready. Click Copy to share.');
        setNotice(`Invite code: ${data.inviteCode}`);
      }
    });

    state.socket.on('chat:joined', (data) => {
      state.currentRoom = data?.room || null;
      clearChatLog();
      clearPresence();

      if (!state.currentRoom) {
        currentRoomNameEl.textContent = 'No room selected';
        setRoomUIEnabled(false);
        return;
      }

      currentRoomNameEl.textContent = `# ${state.currentRoom.name}`;
      setRoomUIEnabled(true);

      // Presence
      state.socket.emit('chat:presence_request', { roomId: state.currentRoom.id });
      startPresencePolling();

      const messages = data?.messages || [];
      messages.forEach(appendLine);
    });

    state.socket.on('chat:presence', (data) => {
      if (!state.currentRoom) return;
      if (data?.roomId !== state.currentRoom.id) return;
      renderPresence(data);
    });

    state.socket.on('chat:message', (msg) => {
      if (!state.currentRoom) return;
      if (msg?.roomId !== state.currentRoom.id) return;
      appendLine(msg);
    });

    state.socket.on('chat:message_updated', (msg) => {
      if (!state.currentRoom) return;
      if (msg?.roomId !== state.currentRoom.id) return;
      const id = String(msg?.id || '').trim();
      if (!id) return;
      const line = messageElsById.get(id);
      if (!line) return;
      updateMessageLine(line, msg);
      line.dataset.editing = '';
    });

    state.socket.on('chat:message_deleted', (msg) => {
      if (!state.currentRoom) return;
      if (msg?.roomId !== state.currentRoom.id) return;
      const id = String(msg?.id || '').trim();
      if (!id) return;
      const line = messageElsById.get(id);
      if (!line) return;
      updateMessageLine(line, { content: '[deleted]', deletedAt: msg.deletedAt || new Date().toISOString() });
      line.dataset.editing = '';
    });

    state.socket.on('chat:error', (data) => {
      const msg = data?.message || 'Chat error.';

      // If the last action was creating a room, show errors where the user is looking.
      if (lastAction === 'create_room') {
        setCreateResult(msg);
        lastAction = null;
        return;
      }

      setNotice(msg);
    });

    state.socket.on('disconnect', () => {
      setNotice('Disconnected. Reconnecting…');
      setConnectionStatus('Disconnected');
      setRoomUIEnabled(false);
      stopPresencePolling();
      clearPresence();
    });

    // Now that handlers are registered, connect.
    state.socket.connect();
  }

  function wireUiHandlers() {
    if (uiWired) return;
    uiWired = true;

    // Make the Private checkbox feel "alive".
    const syncPrivateUi = () => {
      const isPrivate = !!newRoomPrivateEl?.checked;
      if (!newRoomPasswordEl) return;

      if (isPrivate) {
        newRoomPasswordEl.disabled = false;
        newRoomPasswordEl.placeholder = 'Password (optional, 4+ chars)';
      } else {
        newRoomPasswordEl.value = '';
        newRoomPasswordEl.disabled = true;
        newRoomPasswordEl.placeholder = 'Password (private rooms only)';
      }
    };

    if (newRoomPrivateEl) {
      newRoomPrivateEl.addEventListener('change', syncPrivateUi);
      syncPrivateUi();
    }

    createRoomBtn.addEventListener('click', () => {
      if (!state.socket) {
        setNotice('Sign in to use Live Chat (then try again).');
        return;
      }

      const name = newRoomNameEl.value.trim();
      const isPrivate = !!newRoomPrivateEl.checked;
      const password = newRoomPasswordEl.value.trim();

      setCreateResult('');
      setNotice('');

      // Client-side feedback (server still validates too)
      if (!name) {
        setCreateResult('Enter a room name first.');
        return;
      }
      if (!/^[a-zA-Z0-9 _-]{1,50}$/.test(name)) {
        setCreateResult('Room name must be 1-50 chars (letters, numbers, space, _, -).');
        return;
      }
      if (password && password.length < 4) {
        setCreateResult('Password must be at least 4 characters.');
        return;
      }

      lastAction = 'create_room';
      setCreateResult(isPrivate ? 'Creating private room…' : 'Creating room…');
      if (isPrivate) {
        setInviteCode('');
        setInviteResult('');
      }

      state.socket.emit('chat:create_room', { name, isPrivate, password });
    });

    joinByCodeBtn.addEventListener('click', () => {
      if (!state.socket) {
        setNotice('Sign in to use Live Chat.');
        return;
      }
      const code = joinCodeEl.value.trim();
      const password = joinPasswordEl.value.trim();
      if (!code) return;
      joinRoom(code, password);
    });

    if (copyInviteBtn && inviteCodeDisplayEl) {
      copyInviteBtn.addEventListener('click', async () => {
        const code = inviteCodeDisplayEl.value.trim();
        if (!code) return;

        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(code);
          } else {
            inviteCodeDisplayEl.removeAttribute('readonly');
            inviteCodeDisplayEl.select();
            document.execCommand('copy');
            inviteCodeDisplayEl.setAttribute('readonly', 'readonly');
            inviteCodeDisplayEl.setSelectionRange(0, 0);
          }
          setInviteResult('Copied.');
        } catch {
          setInviteResult('Copy failed. Select and copy manually.');
          inviteCodeDisplayEl.focus();
          inviteCodeDisplayEl.select();
        }
      });
    }

    leaveRoomBtn.addEventListener('click', () => {
      if (!state.currentRoom || !state.socket) return;
      state.socket.emit('chat:leave_room', { roomId: state.currentRoom.id });
      state.currentRoom = null;
      currentRoomNameEl.textContent = 'No room selected';
      setRoomUIEnabled(false);
      clearChatLog();
      stopPresencePolling();
      clearPresence();
    });

    sendForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const content = messageInput.value.trim();
      if (!content) return;

      if (content.startsWith('/')) {
        handleSlashCommand(content);
        messageInput.value = '';
        return;
      }

      if (!state.currentRoom || !state.socket) {
        setNotice('Join a room first.');
        return;
      }

      state.socket.emit('chat:message', {
        roomId: state.currentRoom.id,
        content
      });

      messageInput.value = '';
    });

    if (emojiBtn && emojiPanel) {
      emojiBtn.addEventListener('click', () => {
        emojiPanel.hidden = !emojiPanel.hidden;
      });

      emojiPanel.addEventListener('click', (e) => {
        const btn = e.target.closest('button.chat-emoji');
        if (!btn) return;
        const emoji = btn.textContent;
        if (!emoji) return;

        // Insert at cursor
        const start = messageInput.selectionStart ?? messageInput.value.length;
        const end = messageInput.selectionEnd ?? messageInput.value.length;
        const before = messageInput.value.slice(0, start);
        const after = messageInput.value.slice(end);
        messageInput.value = `${before}${emoji}${after}`;
        const pos = start + emoji.length;
        messageInput.focus();
        messageInput.setSelectionRange(pos, pos);
      });

      // Hide emoji panel when clicking elsewhere
      document.addEventListener('click', (e) => {
        if (emojiPanel.hidden) return;
        if (e.target === emojiBtn || emojiPanel.contains(e.target)) return;
        emojiPanel.hidden = true;
      });
    }

    if (gifBtn && gifPanel && gifSearchInput && gifResultsEl) {
      gifBtn.addEventListener('click', () => {
        gifPanel.hidden = !gifPanel.hidden;
        if (!gifPanel.hidden) {
          loadTrendingGifs();
          gifSearchInput.focus();
        }
      });

      gifSearchInput.addEventListener('input', () => {
        const q = gifSearchInput.value;
        if (gifSearchTimer) clearTimeout(gifSearchTimer);
        gifSearchTimer = setTimeout(() => {
          searchGifs(q);
        }, 300);
      });

      document.addEventListener('click', (e) => {
        if (gifPanel.hidden) return;
        if (e.target === gifBtn || gifPanel.contains(e.target)) return;
        gifPanel.hidden = true;
      });
    }

    if (uploadBtn && chatFileInput) {
      uploadBtn.addEventListener('click', () => {
        if (!state.currentRoom) {
          setNotice('Join a room first.');
          return;
        }
        chatFileInput.value = '';
        chatFileInput.click();
      });

      chatFileInput.addEventListener('change', async () => {
        const file = chatFileInput.files && chatFileInput.files[0];
        if (!file) return;
        if (!state.currentRoom) {
          setNotice('Join a room first.');
          return;
        }

        if (file.size > 5 * 1024 * 1024) {
          setNotice('File too large (max 5MB).');
          return;
        }

        const form = new FormData();
        form.append('file', file);
        form.append('roomId', state.currentRoom.id);

        try {
          setNotice('Uploading…');
          const res = await fetch('/api/chat/uploads', {
            method: 'POST',
            body: form
          });

          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            setNotice(data?.message || 'Upload failed.');
            return;
          }

          const up = data?.upload;
          if (!up?.url) {
            setNotice('Upload failed.');
            return;
          }

          // Send as a structured file tag so the renderer can preview images safely.
          const tag = `[[file:${up.url}|${up.name}|${up.mimeType}|${up.size}]]`;

          if (!state.socket) {
            setNotice('Chat is offline.');
            return;
          }

          state.socket.emit('chat:message', {
            roomId: state.currentRoom.id,
            content: tag
          });

          setNotice('Upload sent.');
        } catch {
          setNotice('Upload failed.');
        }
      });
    }
  }

  async function fetchMe() {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) return null;
      const data = await res.json();
      const user = data?.user || null;
      if (user) {
        try {
          localStorage.setItem('currentUser', JSON.stringify(user));
        } catch {
          // ignore
        }
      }
      return user;
    } catch {
      return null;
    }
  }

  async function startReadOnly() {
    setConnectionStatus('Connecting…');

    try {
      await ensureSocketIoLoaded();
    } catch {
      setConnectionStatus('Offline');
      return;
    }

    // See startWithUser(): connect only after event handlers are attached.
    state.socket = io('/chat', {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1500,
      reconnectionAttempts: 10
    });

    state.socket.on('connect', () => {
      setConnectionStatus('Connected');
      state.socket.emit('chat:list_rooms');
    });

    state.socket.on('chat:rooms', (data) => {
      renderRooms(data?.rooms || []);
    });

    state.socket.on('disconnect', () => {
      setConnectionStatus('Offline');
    });

    state.socket.connect();
  }

  function init() {
    wireUiHandlers();

    const tryBoot = () => {
      const raw = localStorage.getItem('currentUser');
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    };

    (async () => {
      setConnectionStatus('Offline');
      setInviteCode('');
      setInviteResult('');

      // Prefer the server session truth over localStorage (localStorage can be stale).
      const user = await fetchMe();
      if (!user) {
        try {
          localStorage.removeItem('currentUser');
        } catch {
          // ignore
        }
      }

      if (user) {
        setNotice('');
        setConnectionStatus('Connecting…');
        await startWithUser(user);
        return;
      }

      // Fallback for offline-only scenarios: try whatever was cached.
      // If this fails, the server will emit chat:auth_error and we will prompt sign-in.
      const userFromStorage = tryBoot();
      if (userFromStorage) {
        setNotice('');
        setConnectionStatus('Connecting…');
        await startWithUser(userFromStorage);
        return;
      }

      // Not signed in: still show public rooms (read-only).
      setNotice('Sign in to join or create rooms.');
      await startReadOnly();
    })();

    // If the user signs in via the modal on this page, start chat without requiring a full refresh.
    window.addEventListener('auth:changed', async (evt) => {
      const nextUser = evt?.detail?.user || null;

      // Logged out: disconnect chat and reset UI.
      if (!nextUser) {
        bootInProgress = false;
        if (state.socket) {
          try {
            state.socket.disconnect();
          } catch {
            // ignore
          }
        }
        state.socket = null;
        state.user = null;
        state.currentRoom = null;
        clearChatLog();
        clearPresence();
        renderRooms([]);
        renderMyPrivateRooms([]);
        setRoomUIEnabled(false);
        setInviteCode('');
        setInviteResult('');
        setNotice('Sign in to use Live Chat (then click Create).');
        setConnectionStatus('Offline');
        return;
      }

      // Logged in: if chat is not running yet, boot it.
      if (state.socket || bootInProgress) return;
      bootInProgress = true;
      try {
        setNotice('');
        setConnectionStatus('Connecting…');
        await startWithUser(nextUser);
      } finally {
        bootInProgress = false;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
