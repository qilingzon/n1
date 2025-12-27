// 管理员界面交互逻辑
// Admin panel UI logic

import authService from './auth.js';

// DOM元素
const adminUsername = document.getElementById('admin-username');
const refreshUsersBtn = document.getElementById('refresh-users-btn');
const usersTableBody = document.getElementById('users-table-body');
const roleModal = document.getElementById('role-modal');
const deleteModal = document.getElementById('delete-modal');
const messageContainer = document.getElementById('message-container');
const logoutBtn = document.getElementById('logout-btn');
const clearCacheBtn = document.getElementById('clear-cache-btn');
const resetSystemBtn = document.getElementById('reset-system-btn');

// 当前正在编辑的用户ID
let currentEditingUserId = null;
// 当前正在删除的用户ID
let currentDeletingUserId = null;

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

// 检查用户权限
function checkPermission() {
  if (!authService.isLoggedIn()) {
    showMessage('请先登录', 'error');
    setTimeout(() => {
      window.location.href = '/auth.html';
    }, 1000);
    return false;
  }

  if (!authService.isAdmin()) {
    showMessage('您没有管理员权限', 'error');
    setTimeout(() => {
      window.location.href = '/index.html';
    }, 1000);
    return false;
  }

  return true;
}

// 加载用户列表
async function loadUsers() {
  try {
    const result = await authService.getAllUsers();

    if (result.success) {
      renderUsersTable(result.users);
      showMessage('用户列表加载成功', 'success');
    } else {
      showMessage(result.message || '加载用户列表失败', 'error');
    }
  } catch (error) {
    console.error('Load users error:', error);
    showMessage('网络错误，请稍后再试', 'error');
  }
}

// 渲染用户表格
function renderUsersTable(users) {
  usersTableBody.innerHTML = '';

  if (!users || users.length === 0) {
    usersTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">暂无用户</td></tr>';
    return;
  }

  const currentUser = authService.getUser();

  users.forEach(user => {
    const row = document.createElement('tr');

    // 用户名列
    const usernameCell = document.createElement('td');
    usernameCell.textContent = user.username;
    row.appendChild(usernameCell);

    // 角色列
    const roleCell = document.createElement('td');
    const roleBadge = document.createElement('span');
    roleBadge.className = `user-role-badge ${user.role}`;
    roleBadge.textContent = user.role === 'admin' ? '管理员' : '普通用户';
    roleCell.appendChild(roleBadge);
    row.appendChild(roleCell);

    // 注册时间列
    const createdAtCell = document.createElement('td');
    createdAtCell.textContent = new Date(user.createdAt).toLocaleString();
    row.appendChild(createdAtCell);

    // 操作列
    const actionsCell = document.createElement('td');
    actionsCell.className = 'user-actions';

    // 编辑角色按钮
    if (user.id !== currentUser.id) {
      const editBtn = document.createElement('button');
      editBtn.className = 'user-action-btn';
      editBtn.textContent = '编辑角色';
      editBtn.addEventListener('click', () => openRoleModal(user.id, user.role));
      actionsCell.appendChild(editBtn);
    }

    // 删除按钮
    if (user.id !== currentUser.id) {
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'user-action-btn delete';
      deleteBtn.textContent = '删除';
      deleteBtn.addEventListener('click', () => openDeleteModal(user.id, user.username));
      actionsCell.appendChild(deleteBtn);
    }

    row.appendChild(actionsCell);
    usersTableBody.appendChild(row);
  });
}

// 打开角色编辑模态框
function openRoleModal(userId, currentRole) {
  currentEditingUserId = userId;
  const roleSelect = document.getElementById('user-role');
  roleSelect.value = currentRole;
  roleModal.classList.add('show');
}

// 关闭角色编辑模态框
function closeRoleModal() {
  currentEditingUserId = null;
  roleModal.classList.remove('show');
}

// 打开删除确认模态框
function openDeleteModal(userId, username) {
  currentDeletingUserId = userId;
  document.getElementById('delete-username').textContent = username;
  deleteModal.classList.add('show');
}

// 关闭删除确认模态框
function closeDeleteModal() {
  currentDeletingUserId = null;
  deleteModal.classList.remove('show');
}

// 更新用户角色
async function updateUserRole() {
  if (!currentEditingUserId) return;

  const newRole = document.getElementById('user-role').value;

  try {
    const result = await authService.updateUserRole(currentEditingUserId, newRole);

    if (result.success) {
      showMessage('用户角色更新成功', 'success');
      closeRoleModal();
      loadUsers();
    } else {
      showMessage(result.message || '更新用户角色失败', 'error');
    }
  } catch (error) {
    console.error('Update user role error:', error);
    showMessage('网络错误，请稍后再试', 'error');
  }
}

// 删除用户
async function deleteUser() {
  if (!currentDeletingUserId) return;

  try {
    const result = await authService.deleteUser(currentDeletingUserId);

    if (result.success) {
      showMessage('用户删除成功', 'success');
      closeDeleteModal();
      loadUsers();
    } else {
      showMessage(result.message || '删除用户失败', 'error');
    }
  } catch (error) {
    console.error('Delete user error:', error);
    showMessage('网络错误，请稍后再试', 'error');
  }
}

// 退出登录
function logout() {
  authService.logout();
  showMessage('已退出登录', 'info');
  setTimeout(() => {
    window.location.href = '/auth.html';
  }, 1000);
}

// 清除缓存
function clearCache() {
  if (confirm('确定要清除浏览器缓存吗？')) {
    localStorage.clear();
    sessionStorage.clear();
    showMessage('缓存已清除', 'success');
  }
}

// 重置系统
function resetSystem() {
  if (confirm('确定要重置系统吗？此操作将清除所有用户数据，不可撤销！')) {
    if (confirm('再次确认：您确定要重置系统吗？')) {
      // 这里可以添加重置系统的API调用
      showMessage('系统重置功能尚未实现', 'info');
    }
  }
}

// 初始化
function init() {
  // 检查用户权限
  if (!checkPermission()) return;

  // 显示当前管理员用户名
  const user = authService.getUser();
  if (user) {
    adminUsername.textContent = user.username;
  }

  // 加载用户列表
  loadUsers();

  // 事件监听器
  refreshUsersBtn.addEventListener('click', loadUsers);

  // 模态框事件
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      roleModal.classList.remove('show');
      deleteModal.classList.remove('show');
    });
  });

  document.getElementById('cancel-role-btn').addEventListener('click', closeRoleModal);
  document.getElementById('save-role-btn').addEventListener('click', updateUserRole);

  document.getElementById('cancel-delete-btn').addEventListener('click', closeDeleteModal);
  document.getElementById('confirm-delete-btn').addEventListener('click', deleteUser);

  // 其他按钮事件
  logoutBtn.addEventListener('click', logout);
  clearCacheBtn.addEventListener('click', clearCache);
  resetSystemBtn.addEventListener('click', resetSystem);

  // 导航切换
  document.querySelectorAll('.admin-nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();

      // 更新导航状态
      document.querySelectorAll('.admin-nav-item').forEach(navItem => {
        navItem.classList.remove('active');
      });
      item.classList.add('active');

      // 切换内容区域
      const sectionId = item.getAttribute('data-section');
      document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
      });
      document.getElementById(`${sectionId}-section`).classList.add('active');
    });
  });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);

// 移除预加载样式类，允许过渡效果
setTimeout(() => {
  document.body.classList.remove('preload');
}, 300);
