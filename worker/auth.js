// Cloudflare Workers 用户认证模块
// User authentication module for Cloudflare Workers

// 用户角色枚举
export const UserRoles = {
  USER: 'user',
  ADMIN: 'admin'
};

// 生成用户ID
function generateUserId() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// 密码哈希
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 验证密码
async function verifyPassword(password, hashedPassword) {
  const hash = await hashPassword(password);
  return hash === hashedPassword;
}

// 用户注册
export async function register(state, username, password) {
  // 检查用户名是否已存在
  const users = await getUsers(state);
  const existingUser = Object.values(users).find(u => u.username === username);
  if (existingUser) {
    return { success: false, message: 'Username already exists' };
  }

  // 验证用户名和密码
  if (!username || username.length < 3 || username.length > 20) {
    return { success: false, message: 'Username must be between 3 and 20 characters' };
  }

  if (!password || password.length < 6) {
    return { success: false, message: 'Password must be at least 6 characters' };
  }

  // 创建新用户
  const newUser = {
    id: generateUserId(),
    username,
    password: await hashPassword(password),
    role: UserRoles.USER,
    createdAt: new Date().toISOString()
  };

  users[newUser.id] = newUser;
  await state.storage.put('users', JSON.stringify(users));

  return { success: true, user: { id: newUser.id, username: newUser.username, role: newUser.role } };
}

// 用户登录
export async function login(state, username, password) {
  const users = await getUsers(state);
  const user = Object.values(users).find(u => u.username === username);

  if (!user) {
    return { success: false, message: 'Invalid username or password' };
  }

  if (!(await verifyPassword(password, user.password))) {
    return { success: false, message: 'Invalid username or password' };
  }

  // 生成会话令牌
  const token = await generateSessionToken(user.id);

  return { 
    success: true, 
    user: { id: user.id, username: user.username, role: user.role },
    token 
  };
}

// 生成会话令牌
async function generateSessionToken(userId) {
  const payload = {
    userId,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24小时过期
  };

  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));
  const signature = await crypto.subtle.digest('SHA-256', data);
  const signatureArray = Array.from(new Uint8Array(signature));

  const tokenData = {
    ...payload,
    signature: signatureArray.map(b => b.toString(16).padStart(2, '0')).join('')
  };

  return btoa(JSON.stringify(tokenData));
}

// 验证会话令牌
export async function verifySessionToken(token) {
  try {
    const decoded = JSON.parse(atob(token));
    const { userId, exp, signature } = decoded;

    // 检查令牌是否过期
    if (exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, message: 'Token expired' };
    }

    // 验证签名
    const payload = { userId, exp };
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(payload));
    const expectedSignature = await crypto.subtle.digest('SHA-256', data);
    const expectedSignatureArray = Array.from(new Uint8Array(expectedSignature));
    const expectedSignatureString = expectedSignatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (signature !== expectedSignatureString) {
      return { valid: false, message: 'Invalid token' };
    }

    return { valid: true, userId };
  } catch (error) {
    console.error('Error verifying token:', error);
    return { valid: false, message: 'Invalid token' };
  }
}

// 获取所有用户
async function getUsers(state) {
  try {
    const usersData = await state.storage.get('users');
    if (!usersData) {
      // 创建默认管理员账户
      const defaultAdmin = {
        id: generateUserId(),
        username: 'admin',
        password: await hashPassword('admin123'),
        role: UserRoles.ADMIN,
        createdAt: new Date().toISOString()
      };
      const users = { [defaultAdmin.id]: defaultAdmin };
      await state.storage.put('users', JSON.stringify(users));
      console.log('Default admin account created:', { username: defaultAdmin.username, id: defaultAdmin.id });
      return users;
    }
    const users = JSON.parse(usersData);
    
    // 检查是否存在管理员账户，如果不存在则创建
    const hasAdmin = Object.values(users).some(u => u.role === UserRoles.ADMIN);
    if (!hasAdmin) {
      const defaultAdmin = {
        id: generateUserId(),
        username: 'admin',
        password: await hashPassword('admin123'),
        role: UserRoles.ADMIN,
        createdAt: new Date().toISOString()
      };
      users[defaultAdmin.id] = defaultAdmin;
      await state.storage.put('users', JSON.stringify(users));
      console.log('Default admin account created:', { username: defaultAdmin.username, id: defaultAdmin.id });
    }
    
    return users;
  } catch (error) {
    console.error('Error getting users:', error);
    return {};
  }
}

// 获取所有用户（管理员功能）
export async function getAllUsers(state) {
  const users = await getUsers(state);
  return Object.values(users).map(({ id, username, role, createdAt }) => ({ id, username, role, createdAt }));
}

// 更新用户角色（管理员功能）
export async function updateUserRole(state, userId, newRole) {
  const users = await getUsers(state);

  if (!users[userId]) {
    return { success: false, message: 'User not found' };
  }

  if (!Object.values(UserRoles).includes(newRole)) {
    return { success: false, message: 'Invalid role' };
  }

  users[userId].role = newRole;
  await state.storage.put('users', JSON.stringify(users));

  return { success: true };
}

// 删除用户（管理员功能）
export async function deleteUser(state, userId, requesterId) {
  const users = await getUsers(state);

  if (!users[userId]) {
    return { success: false, message: 'User not found' };
  }

  // 不允许删除自己
  if (userId === requesterId) {
    return { success: false, message: 'Cannot delete yourself' };
  }

  delete users[userId];
  await state.storage.put('users', JSON.stringify(users));

  return { success: true };
}
