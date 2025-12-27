// 认证界面交互逻辑
// Authentication UI logic

import authService from './auth.js';

// DOM元素
const flipCard = document.getElementById('flip-card');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const switchToRegister = document.getElementById('switch-to-register');
const switchToLogin = document.getElementById('switch-to-login');
const messageContainer = document.getElementById('message-container');

// 显示消息提示
function showMessage(message, type = 'info') {
  const messageElement = document.createElement('div');
  messageElement.className = `message ${type}`;
  messageElement.textContent = message;
  messageContainer.appendChild(messageElement);

  // 3秒后自动移除消息
  setTimeout(() => {
    messageElement.style.animation = 'slideIn 0.3s ease-out reverse';
    setTimeout(() => {
      messageContainer.removeChild(messageElement);
    }, 300);
  }, 3000);
}

// 切换到注册表单
switchToRegister.addEventListener('click', (e) => {
  e.preventDefault();
  flipCard.classList.add('flipped');
});

// 切换到登录表单
switchToLogin.addEventListener('click', (e) => {
  e.preventDefault();
  flipCard.classList.remove('flipped');
});

// 处理登录表单提交
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  if (!username || !password) {
    showMessage('请输入用户名和密码', 'error');
    return;
  }

  const loginButton = loginForm.querySelector('.auth-btn');
  loginButton.disabled = true;
  loginButton.textContent = '登录中...';

  try {
    const result = await authService.login(username, password);

    if (result.success) {
      // 保存用户信息和令牌
      authService.saveUser(result.user, result.token);

      // 显示成功消息
      showMessage('登录成功', 'success');

      // 检查用户是否是管理员
      if (authService.isAdmin()) {
        // 管理员跳转到管理员界面
        setTimeout(() => {
          window.location.href = '/admin.html';
        }, 1000);
      } else {
        // 普通用户跳转到主界面
        setTimeout(() => {
          window.location.href = '/index.html';
        }, 1000);
      }
    } else {
      showMessage(result.message || '登录失败', 'error');
      loginButton.disabled = false;
      loginButton.textContent = '登录';
    }
  } catch (error) {
    console.error('Login error:', error);
    showMessage('网络错误，请稍后再试', 'error');
    loginButton.disabled = false;
    loginButton.textContent = '登录';
  }
});

// 处理注册表单提交
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('register-username').value.trim();
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('register-confirm-password').value;

  if (!username || !password || !confirmPassword) {
    showMessage('请填写所有字段', 'error');
    return;
  }

  if (password !== confirmPassword) {
    showMessage('两次输入的密码不一致', 'error');
    return;
  }

  if (password.length < 6) {
    showMessage('密码长度至少为6个字符', 'error');
    return;
  }

  const registerButton = registerForm.querySelector('.auth-btn');
  registerButton.disabled = true;
  registerButton.textContent = '注册中...';

  try {
    const result = await authService.register(username, password);

    if (result.success) {
      // 显示成功消息
      showMessage('注册成功，请登录', 'success');

      // 清空表单
      registerForm.reset();

      // 切换到登录表单
      setTimeout(() => {
        flipCard.classList.remove('flipped');
      }, 1000);
    } else {
      showMessage(result.message || '注册失败', 'error');
      registerButton.disabled = false;
      registerButton.textContent = '注册';
    }
  } catch (error) {
    console.error('Registration error:', error);
    showMessage('网络错误，请稍后再试', 'error');
    registerButton.disabled = false;
    registerButton.textContent = '注册';
  }
});

// 检查用户是否已登录
if (authService.isLoggedIn()) {
  // 如果已登录，重定向到相应页面
  if (authService.isAdmin()) {
    window.location.href = '/admin.html';
  } else {
    window.location.href = '/index.html';
  }
}

// 移除预加载样式类，允许过渡效果
setTimeout(() => {
  document.body.classList.remove('preload');
}, 300);
