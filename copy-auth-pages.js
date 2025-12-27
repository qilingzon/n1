// 构建后脚本：复制auth.html和admin.html到dist目录
// Post-build script: Copy auth.html and admin.html to dist directory

const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, 'client');
const distDir = path.join(__dirname, 'dist');

// 确保dist目录存在
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// 复制auth.html
const authSource = path.join(sourceDir, 'auth.html');
const authDest = path.join(distDir, 'auth.html');
if (fs.existsSync(authSource)) {
    fs.copyFileSync(authSource, authDest);
    console.log('Copied auth.html to dist directory');
} else {
    console.error('auth.html not found in client directory');
}

// 复制admin.html
const adminSource = path.join(sourceDir, 'admin.html');
const adminDest = path.join(distDir, 'admin.html');
if (fs.existsSync(adminSource)) {
    fs.copyFileSync(adminSource, adminDest);
    console.log('Copied admin.html to dist directory');
} else {
    console.error('admin.html not found in client directory');
}

console.log('Auth pages copy completed!');
