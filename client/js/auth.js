// 用户认证模块
// User authentication module

// API基础URL
const API_BASE_URL = '/api';

// 本地存储键名
const STORAGE_KEYS = {
  USER: 'nodecrypt_user',
  TOKEN: 'nodecrypt_token'
};

// 用户认证服务
const authService = {
  // 用户注册
  async register(username, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Network error' };
    }
  },

  // 用户登录
  async login(username, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error' };
    }
  },

  // 获取所有用户（管理员功能）
  async getAllUsers() {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get users error:', error);
      return { success: false, message: 'Network error' };
    }
  },

  // 更新用户角色（管理员功能）
  async updateUserRole(userId, newRole) {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const response = await fetch(`${API_BASE_URL}/users/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetUserId: userId, newRole })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Update user role error:', error);
      return { success: false, message: 'Network error' };
    }
  },

  // 删除用户（管理员功能）
  async deleteUser(userId) {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const response = await fetch(`${API_BASE_URL}/users?userId=${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Delete user error:', error);
      return { success: false, message: 'Network error' };
    }
  },

  // 保存用户信息到本地存储
  saveUser(user, token) {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  },

  // 从本地存储获取用户信息
  getUser() {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    return userStr ? JSON.parse(userStr) : null;
  },

  // 从本地存储获取令牌
  getToken() {
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  },

  // 检查用户是否已登录
  isLoggedIn() {
    return !!this.getToken();
  },

  // 检查用户是否是管理员
  isAdmin() {
    const user = this.getUser();
    return user && user.role === 'admin';
  },

  // 登出
  logout() {
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
  }
};

// 导出服务
export default authService;
