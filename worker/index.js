import { generateClientId, encryptMessage, decryptMessage, logEvent, isString, isObject, getTime } from './utils.js';
import { 
  register, 
  login, 
  verifySessionToken, 
  getAllUsers, 
  updateUserRole, 
  deleteUser,
  UserRoles 
} from './auth.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 处理API请求和WebSocket请求
    const id = env.CHAT_ROOM.idFromName('chat-room');
    const stub = env.CHAT_ROOM.get(id);
    
    // 处理API请求
    if (url.pathname.startsWith('/api/')) {
      return stub.fetch(request);
    }

    // 处理WebSocket请求
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader && upgradeHeader === 'websocket') {
      return stub.fetch(request);
    }

    // 其余全部交给 ASSETS 处理（自动支持 hash 文件名和 SPA fallback）
    return env.ASSETS.fetch(request);
  }
};

// 处理API请求
async function handleApiRequest(request, env) {
  const url = new URL(request.url);
  const method = request.method;
  const pathname = url.pathname;

  // 设置CORS头
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  // 处理预检请求
  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 获取Durable Object实例
    const id = env.CHAT_ROOM.idFromName('chat-room');
    const stub = env.CHAT_ROOM.get(id);

    // 路由处理
    if (method === 'POST' && pathname === '/api/register') {
      return handleRegister(request, stub, corsHeaders);
    } else if (method === 'POST' && pathname === '/api/login') {
      return handleLogin(request, stub, corsHeaders);
    } else if (method === 'GET' && pathname === '/api/users') {
      return handleGetUsers(request, stub, corsHeaders);
    } else if (method === 'PUT' && pathname === '/api/users/role') {
      return handleUpdateUserRole(request, stub, corsHeaders);
    } else if (method === 'DELETE' && pathname === '/api/users') {
      return handleDeleteUser(request, stub, corsHeaders);
    } else {
      return new Response(JSON.stringify({ error: 'Not found' }), { 
        status: 404, 
        headers: corsHeaders 
      });
    }
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}

// 处理注册请求
async function handleRegister(request, stub, headers) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return new Response(JSON.stringify({ success: false, message: 'Username and password are required' }), { 
        status: 400, 
        headers 
      });
    }

    const result = await register(stub.state, username, password);

    if (result.success) {
      return new Response(JSON.stringify(result), { status: 201, headers });
    } else {
      return new Response(JSON.stringify(result), { status: 400, headers });
    }
  } catch (error) {
    console.error('Register error:', error);
    return new Response(JSON.stringify({ success: false, message: 'Internal server error' }), { 
      status: 500, 
      headers 
    });
  }
}

// 处理登录请求
async function handleLogin(request, stub, headers) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return new Response(JSON.stringify({ success: false, message: 'Username and password are required' }), { 
        status: 400, 
        headers 
      });
    }

    const result = await login(stub.state, username, password);

    if (result.success) {
      return new Response(JSON.stringify(result), { status: 200, headers });
    } else {
      return new Response(JSON.stringify(result), { status: 401, headers });
    }
  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ success: false, message: 'Internal server error' }), { 
      status: 500, 
      headers 
    });
  }
}

// 验证管理员权限
async function verifyAdmin(request, stub, headers) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { 
      status: 401, 
      headers 
    });
  }

  const token = authHeader.substring(7);
  const verification = await verifySessionToken(token);
  if (!verification.valid) {
    return new Response(JSON.stringify({ success: false, message: verification.message }), { 
      status: 401, 
      headers 
    });
  }

  // 检查用户是否是管理员
  const users = await getAllUsers(stub.state);
  const user = users.find(u => u.id === verification.userId);
  if (!user || user.role !== UserRoles.ADMIN) {
    return new Response(JSON.stringify({ success: false, message: 'Forbidden: Admin access required' }), { 
      status: 403, 
      headers 
    });
  }

  return null; // 验证通过
}

// 处理获取所有用户请求
async function handleGetUsers(request, stub, headers) {
  const errorResponse = await verifyAdmin(request, stub, headers);
  if (errorResponse) return errorResponse;

  try {
    const users = await getAllUsers(stub.state);
    return new Response(JSON.stringify({ success: true, users }), { status: 200, headers });
  } catch (error) {
    console.error('Get users error:', error);
    return new Response(JSON.stringify({ success: false, message: 'Internal server error' }), { 
      status: 500, 
      headers 
    });
  }
}

// 处理更新用户角色请求
async function handleUpdateUserRole(request, stub, headers) {
  const errorResponse = await verifyAdmin(request, stub, headers);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const { targetUserId, newRole } = body;

    if (!targetUserId || !newRole) {
      return new Response(JSON.stringify({ success: false, message: 'User ID and role are required' }), { 
        status: 400, 
        headers 
      });
    }

    const result = await updateUserRole(stub.state, targetUserId, newRole);

    if (result.success) {
      return new Response(JSON.stringify(result), { status: 200, headers });
    } else {
      return new Response(JSON.stringify(result), { status: 400, headers });
    }
  } catch (error) {
    console.error('Update user role error:', error);
    return new Response(JSON.stringify({ success: false, message: 'Internal server error' }), { 
      status: 500, 
      headers 
    });
  }
}

// 处理删除用户请求
async function handleDeleteUser(request, stub, headers) {
  const errorResponse = await verifyAdmin(request, stub, headers);
  if (errorResponse) return errorResponse;

  try {
    const url = new URL(request.url);
    const targetUserId = url.searchParams.get('userId');

    if (!targetUserId) {
      return new Response(JSON.stringify({ success: false, message: 'User ID is required' }), { 
        status: 400, 
        headers 
      });
    }

    // 获取请求者ID
    const authHeader = request.headers.get('Authorization');
    const token = authHeader.substring(7);
    const verification = await verifySessionToken(token);

    const result = await deleteUser(stub.state, targetUserId, verification.userId);

    if (result.success) {
      return new Response(JSON.stringify(result), { status: 200, headers });
    } else {
      return new Response(JSON.stringify(result), { status: 400, headers });
    }
  } catch (error) {
    console.error('Delete user error:', error);
    return new Response(JSON.stringify({ success: false, message: 'Internal server error' }), { 
      status: 500, 
      headers 
    });
  }
}

export class ChatRoom {  constructor(state, env) {
    this.state = state;
    
    // Use objects like original server.js instead of Maps
    this.clients = {};
    this.channels = {};
    
    this.config = {
      seenTimeout: 60000,
      debug: false
    };
    
    // Initialize RSA key pair
    this.initRSAKeyPair();
  }

  async initRSAKeyPair() {
    try {
      let stored = await this.state.storage.get('rsaKeyPair');
      if (!stored) {
        console.log('Generating new RSA keypair...');
          const keyPair = await crypto.subtle.generateKey(
          {
            name: 'RSASSA-PKCS1-v1_5',
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256'
          },
          true,
          ['sign', 'verify']
        );

        // 并行导出公钥和私钥以提高性能
        const [publicKeyBuffer, privateKeyBuffer] = await Promise.all([
          crypto.subtle.exportKey('spki', keyPair.publicKey),
          crypto.subtle.exportKey('pkcs8', keyPair.privateKey)
        ]);
        
        stored = {
          rsaPublic: btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer))),
          rsaPrivateData: Array.from(new Uint8Array(privateKeyBuffer)),
          createdAt: Date.now() // 记录密钥创建时间，用于后续判断是否需要轮换
        };
        
        await this.state.storage.put('rsaKeyPair', stored);
        console.log('RSA key pair generated and stored');
      }
      
      // Reconstruct the private key
      if (stored.rsaPrivateData) {
        const privateKeyBuffer = new Uint8Array(stored.rsaPrivateData);
        
        stored.rsaPrivate = await crypto.subtle.importKey(
          'pkcs8',
          privateKeyBuffer,
          {
            name: 'RSASSA-PKCS1-v1_5',
            hash: 'SHA-256'
          },
          false,
          ['sign']
        );      }
        this.keyPair = stored;
      
      // 检查密钥是否需要轮换（如果已创建超过24小时）
      if (stored.createdAt && (Date.now() - stored.createdAt > 24 * 60 * 60 * 1000)) {
        // 如果没有任何客户端，则执行密钥轮换
        if (Object.keys(this.clients).length === 0) {
          console.log('密钥已使用24小时，进行轮换...');
          await this.state.storage.delete('rsaKeyPair');
          this.keyPair = null;
          await this.initRSAKeyPair();
        } else {
          // 否则标记需要在客户端全部断开后进行轮换
          await this.state.storage.put('pendingKeyRotation', true);
        }
      }
    } catch (error) {
      console.error('Error initializing RSA key pair:', error);
      throw error;
    }
  }

  // 处理注册请求
  async handleRegister(request, headers) {
    try {
      const body = await request.json();
      const { username, password } = body;

      if (!username || !password) {
        return new Response(JSON.stringify({ success: false, message: 'Username and password are required' }), {
          status: 400,
          headers
        });
      }

      const result = await register(this.state, username, password);

      if (result.success) {
        return new Response(JSON.stringify(result), { status: 201, headers });
      } else {
        return new Response(JSON.stringify(result), { status: 400, headers });
      }
    } catch (error) {
      console.error('Register error:', error);
      return new Response(JSON.stringify({ success: false, message: 'Internal server error' }), {
        status: 500,
        headers
      });
    }
  }

  // 处理登录请求
  async handleLogin(request, headers) {
    try {
      const body = await request.json();
      const { username, password } = body;

      if (!username || !password) {
        return new Response(JSON.stringify({ success: false, message: 'Username and password are required' }), {
          status: 400,
          headers
        });
      }

      const result = await login(this.state, username, password);

      if (result.success) {
        return new Response(JSON.stringify(result), { status: 200, headers });
      } else {
        return new Response(JSON.stringify(result), { status: 401, headers });
      }
    } catch (error) {
      console.error('Login error:', error);
      return new Response(JSON.stringify({ success: false, message: 'Internal server error' }), {
        status: 500,
        headers
      });
    }
  }

  // 验证管理员权限
  async verifyAdmin(request, headers) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
        status: 401,
        headers
      });
    }

    const token = authHeader.substring(7);
    const verification = await verifySessionToken(token);
    if (!verification.valid) {
      return new Response(JSON.stringify({ success: false, message: verification.message }), {
        status: 401,
        headers
      });
    }

    // 检查用户是否是管理员
    const users = await getAllUsers(this.state);
    const user = users.find(u => u.id === verification.userId);
    if (!user || user.role !== UserRoles.ADMIN) {
      return new Response(JSON.stringify({ success: false, message: 'Forbidden: Admin access required' }), {
        status: 403,
        headers
      });
    }

    return null; // 验证通过
  }

  // 处理获取所有用户请求
  async handleGetUsers(request, headers) {
    const errorResponse = await this.verifyAdmin(request, headers);
    if (errorResponse) return errorResponse;

    try {
      const users = await getAllUsers(this.state);
      return new Response(JSON.stringify({ success: true, users }), { status: 200, headers });
    } catch (error) {
      console.error('Get users error:', error);
      return new Response(JSON.stringify({ success: false, message: 'Internal server error' }), {
        status: 500,
        headers
      });
    }
  }

  // 处理更新用户角色请求
  async handleUpdateUserRole(request, headers) {
    const errorResponse = await this.verifyAdmin(request, headers);
    if (errorResponse) return errorResponse;

    try {
      const body = await request.json();
      const { targetUserId, newRole } = body;

      if (!targetUserId || !newRole) {
        return new Response(JSON.stringify({ success: false, message: 'User ID and role are required' }), {
          status: 400,
          headers
        });
      }

      const result = await updateUserRole(this.state, targetUserId, newRole);

      if (result.success) {
        return new Response(JSON.stringify(result), { status: 200, headers });
      } else {
        return new Response(JSON.stringify(result), { status: 400, headers });
      }
    } catch (error) {
      console.error('Update user role error:', error);
      return new Response(JSON.stringify({ success: false, message: 'Internal server error' }), {
        status: 500,
        headers
      });
    }
  }

  // 处理删除用户请求
  async handleDeleteUser(request, headers) {
    const errorResponse = await this.verifyAdmin(request, headers);
    if (errorResponse) return errorResponse;

    try {
      const url = new URL(request.url);
      const targetUserId = url.searchParams.get('userId');

      if (!targetUserId) {
        return new Response(JSON.stringify({ success: false, message: 'User ID is required' }), {
          status: 400,
          headers
        });
      }

      // 获取请求者ID
      const authHeader = request.headers.get('Authorization');
      const token = authHeader.substring(7);
      const verification = await verifySessionToken(token);

      const result = await deleteUser(this.state, targetUserId, verification.userId);

      if (result.success) {
        return new Response(JSON.stringify(result), { status: 200, headers });
      } else {
        return new Response(JSON.stringify(result), { status: 400, headers });
      }
    } catch (error) {
      console.error('Delete user error:', error);
      return new Response(JSON.stringify({ success: false, message: 'Internal server error' }), {
        status: 500,
        headers
      });
    }
  }

  // 处理API请求
  async handleApiRequest(request) {
    const url = new URL(request.url);
    const method = request.method;
    const pathname = url.pathname;

    // 设置CORS头
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json'
    };

    // 处理预检请求
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // 路由处理
      if (method === 'POST' && pathname === '/api/register') {
        return await this.handleRegister(request, corsHeaders);
      } else if (method === 'POST' && pathname === '/api/login') {
        return await this.handleLogin(request, corsHeaders);
      } else if (method === 'GET' && pathname === '/api/users') {
        return await this.handleGetUsers(request, corsHeaders);
      } else if (method === 'PUT' && pathname === '/api/users/role') {
        return await this.handleUpdateUserRole(request, corsHeaders);
      } else if (method === 'DELETE' && pathname === '/api/users') {
        return await this.handleDeleteUser(request, corsHeaders);
      } else {
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: corsHeaders
        });
      }
    } catch (error) {
      console.error('API Error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: corsHeaders
      });
    }
  }

  async fetch(request) {
    const url = new URL(request.url);
    
    // 处理API请求
    if (url.pathname.startsWith('/api/')) {
      return this.handleApiRequest(request);
    }
    
    // Check for WebSocket upgrade
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket Upgrade', { status: 426 });
    }

    // Ensure RSA keys are initialized
    if (!this.keyPair) {
      await this.initRSAKeyPair();
    }

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    // Accept the WebSocket connection
    this.handleSession(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }  // WebSocket connection event handler
  async handleSession(connection) {    connection.accept();

    // 清理旧连接
    await this.cleanupOldConnections();

    const clientId = generateClientId();

    if (!clientId || this.clients[clientId]) {
      this.closeConnection(connection);
      return;
    }

    logEvent('connection', clientId, 'debug');    // Store client information
    this.clients[clientId] = {
      connection: connection,
      seen: getTime(),
      key: null,
      shared: null,
      channel: null
    };

    // Send RSA public key
    try {
      logEvent('sending-public-key', clientId, 'debug');
      this.sendMessage(connection, JSON.stringify({
        type: 'server-key',
        key: this.keyPair.rsaPublic
      }));
    } catch (error) {
      logEvent('sending-public-key', error, 'error');
    }    // Handle messages
    connection.addEventListener('message', async (event) => {
      const message = event.data;

      if (!isString(message) || !this.clients[clientId]) {
        return;
      }

      this.clients[clientId].seen = getTime();

      if (message === 'ping') {
        this.sendMessage(connection, 'pong');
        return;
      }

      logEvent('message', [clientId, message], 'debug');      // Handle key exchange
      if (!this.clients[clientId].shared && message.length < 2048) {
        try {
          // Generate ECDH key pair using P-384 curve (equivalent to secp384r1)
          const keys = await crypto.subtle.generateKey(
            {
              name: 'ECDH',
              namedCurve: 'P-384'
            },
            true,
            ['deriveBits', 'deriveKey']
          );

          const publicKeyBuffer = await crypto.subtle.exportKey('raw', keys.publicKey);
          
          // Sign the public key using PKCS1 padding (compatible with original)
          const signature = await crypto.subtle.sign(
            {
              name: 'RSASSA-PKCS1-v1_5'
            },
            this.keyPair.rsaPrivate,
            publicKeyBuffer
          );

          // Convert hex string to Uint8Array for client public key
          const clientPublicKeyHex = message;
          const clientPublicKeyBytes = new Uint8Array(clientPublicKeyHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
          
          // Import client's public key
          const clientPublicKey = await crypto.subtle.importKey(
            'raw',
            clientPublicKeyBytes,
            { name: 'ECDH', namedCurve: 'P-384' },
            false,
            []
          );

          // Derive shared secret bits (equivalent to computeSecret in Node.js)
          const sharedSecretBits = await crypto.subtle.deriveBits(
            {
              name: 'ECDH',
              public: clientPublicKey
            },
            keys.privateKey,
            384 // P-384 produces 48 bytes (384 bits)
          );          // Take bytes 8-40 (32 bytes) for AES-256 key
          this.clients[clientId].shared = new Uint8Array(sharedSecretBits).slice(8, 40);

          const response = Array.from(new Uint8Array(publicKeyBuffer))
            .map(b => b.toString(16).padStart(2, '0')).join('') + 
            '|' + btoa(String.fromCharCode(...new Uint8Array(signature)));
          
          this.sendMessage(connection, response);

        } catch (error) {
          logEvent('message-key', [clientId, error], 'error');
          this.closeConnection(connection);
        }

        return;
      }

      // Handle encrypted messages
      if (this.clients[clientId].shared && message.length <= (8 * 1024 * 1024)) {
        this.processEncryptedMessage(clientId, message);
      }
    });    // Handle connection close
    connection.addEventListener('close', async (event) => {
      logEvent('close', [clientId, event], 'debug');

      const channel = this.clients[clientId].channel;

      if (channel && this.channels[channel]) {
        this.channels[channel].splice(this.channels[channel].indexOf(clientId), 1);

        if (this.channels[channel].length === 0) {
          delete(this.channels[channel]);
        } else {
          try {
            const members = this.channels[channel];

            for (const member of members) {
              const client = this.clients[member];              if (this.isClientInChannel(client, channel)) {
                this.sendMessage(client.connection, encryptMessage({
                  a: 'l',
                  p: members.filter((value) => {
                    return (value !== member ? true : false);
                  })
                }, client.shared));
              }
            }

          } catch (error) {
            logEvent('close-list', [clientId, error], 'error');
          }
        }
      }

      if (this.clients[clientId]) {
        delete(this.clients[clientId]);
      }
    });
  }
  // Process encrypted messages
  processEncryptedMessage(clientId, message) {
    let decrypted = null;

    try {
      decrypted = decryptMessage(message, this.clients[clientId].shared);

      logEvent('message-decrypted', [clientId, decrypted], 'debug');

      if (!isObject(decrypted) || !isString(decrypted.a)) {
        return;
      }

      const action = decrypted.a;

      if (action === 'j') {
        this.handleJoinChannel(clientId, decrypted);
      } else if (action === 'c') {
        this.handleClientMessage(clientId, decrypted);
      } else if (action === 'w') {
        this.handleChannelMessage(clientId, decrypted);
      }

    } catch (error) {
      logEvent('process-encrypted-message', [clientId, error], 'error');
    } finally {
      decrypted = null;
    }
  }
  // Handle channel join requests
  handleJoinChannel(clientId, decrypted) {
    if (!isString(decrypted.p) || this.clients[clientId].channel) {
      return;
    }

    try {
      const channel = decrypted.p;

      this.clients[clientId].channel = channel;

      if (!this.channels[channel]) {
        this.channels[channel] = [clientId];
      } else {
        this.channels[channel].push(clientId);
      }

      this.broadcastMemberList(channel);

    } catch (error) {
      logEvent('message-join', [clientId, error], 'error');
    }
  }
  // Handle client messages
  handleClientMessage(clientId, decrypted) {
    if (!isString(decrypted.p) || !isString(decrypted.c) || !this.clients[clientId].channel) {
      return;
    }

    try {
      const channel = this.clients[clientId].channel;
      const targetClient = this.clients[decrypted.c];

      if (this.isClientInChannel(targetClient, channel)) {
        const messageObj = {
          a: 'c',
          p: decrypted.p,
          c: clientId
        };

        const encrypted = encryptMessage(messageObj, targetClient.shared);
        this.sendMessage(targetClient.connection, encrypted);

        messageObj.p = null;
      }

    } catch (error) {
      logEvent('message-client', [clientId, error], 'error');
    }
  }  // Handle channel messages
  handleChannelMessage(clientId, decrypted) {
    if (!isObject(decrypted.p) || !this.clients[clientId].channel) {
      return;
    }
    
    try {
      const channel = this.clients[clientId].channel;
      // 过滤有效的目标成员
      const validMembers = Object.keys(decrypted.p).filter(member => {
        const targetClient = this.clients[member];
        return isString(decrypted.p[member]) && this.isClientInChannel(targetClient, channel);
      });

      // 处理所有有效的目标成员
      for (const member of validMembers) {
        const targetClient = this.clients[member];
        const messageObj = {
          a: 'c',
          p: decrypted.p[member],
          c: clientId
        };        const encrypted = encryptMessage(messageObj, targetClient.shared);
        this.sendMessage(targetClient.connection, encrypted);

        messageObj.p = null;
      }

    } catch (error) {
      logEvent('message-channel', [clientId, error], 'error');
    }
  }
  // Broadcast member list to channel
  broadcastMemberList(channel) {
    try {
      const members = this.channels[channel];

      for (const member of members) {
        const client = this.clients[member];

        if (this.isClientInChannel(client, channel)) {
          const messageObj = {
            a: 'l',
            p: members.filter((value) => {
              return (value !== member ? true : false);
            })
          };

          const encrypted = encryptMessage(messageObj, client.shared);
          this.sendMessage(client.connection, encrypted);

          messageObj.p = null;
        }
      }
    } catch (error) {
      logEvent('broadcast-member-list', error, 'error');
    }
  }  // Check if client is in channel
  isClientInChannel(client, channel) {
    return (
      client &&
      client.connection &&
      client.shared &&
      client.channel &&
      client.channel === channel ?
      true :
      false
    );
  }
  // Send message helper
  sendMessage(connection, message) {
    try {
      // In Cloudflare Workers, WebSocket.READY_STATE_OPEN is 1
      if (connection.readyState === 1) {
        connection.send(message);
      }
    } catch (error) {
      logEvent('sendMessage', error, 'error');
    }
  }  // Close connection helper
  closeConnection(connection) {
    try {
      connection.close();    } catch (error) {
      logEvent('closeConnection', error, 'error');
    }
  }
  
  // 连接清理方法
  async cleanupOldConnections() {
    const seenThreshold = getTime() - this.config.seenTimeout;
    const clientsToRemove = [];

    // 先收集需要移除的客户端，避免在迭代时修改对象
    for (const clientId in this.clients) {
      if (this.clients[clientId].seen < seenThreshold) {
        clientsToRemove.push(clientId);
      }
    }

    // 然后一次性移除所有过期客户端
    for (const clientId of clientsToRemove) {
      try {
        logEvent('connection-seen', clientId, 'debug');
        this.clients[clientId].connection.close();
        delete this.clients[clientId];
      } catch (error) {
        logEvent('connection-seen', error, 'error');      }
    }
    
    // 如果没有任何客户端和房间，检查是否需要轮换密钥
    if (Object.keys(this.clients).length === 0 && Object.keys(this.channels).length === 0) {
      const pendingRotation = await this.state.storage.get('pendingKeyRotation');
      if (pendingRotation) {
        console.log('没有活跃客户端或房间，执行密钥轮换...');
        await this.state.storage.delete('rsaKeyPair');        await this.state.storage.delete('pendingKeyRotation');
        this.keyPair = null;
        await this.initRSAKeyPair();
      }
    }
    
    return clientsToRemove.length; // 返回清理的连接数量
  }
}
