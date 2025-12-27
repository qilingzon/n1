# Cloudflare 部署指南

本项目已经配置为可以在Cloudflare Workers和Pages上部署。以下是详细的部署步骤。

## 前置要求

1. 一个Cloudflare账户（免费账户即可）
2. Node.js 18+ 和 npm
3. Wrangler CLI（Cloudflare Workers命令行工具）

## 安装Wrangler CLI

```bash
npm install -g wrangler
```

## 登录Cloudflare

```bash
wrangler login
```

这将打开浏览器，让您授权Wrangler访问您的Cloudflare账户。

## 项目配置

项目已经包含了`wrangler.toml`配置文件，用于配置Cloudflare Workers。

### 配置说明

- `name`: Worker的名称
- `main`: Worker的入口文件
- `compatibility_date`: 兼容性日期
- `assets`: 静态资源配置
- `durable_objects`: Durable Objects配置，用于WebSocket连接和状态管理

## 构建项目

在部署之前，需要先构建项目：

```bash
npm install
npm run build
```

这将创建`dist`目录，包含所有静态资源。

## 部署到Cloudflare

### 部署Worker

```bash
wrangler deploy
```

这将部署您的Worker到Cloudflare。

### 首次部署注意事项

首次部署时，Wrangler会要求您：
1. 选择或创建一个Cloudflare账户
2. 选择或创建一个Worker

## 访问您的应用

部署完成后，Wrangler会显示您的Worker URL，例如：
```
https://nodecrypt.your-subdomain.workers.dev
```

您可以通过这个URL访问您的应用。

## 默认管理员账户

系统会自动创建一个默认管理员账户：
- 用户名: `admin`
- 密码: `admin123`

**重要**: 首次登录后，请立即修改默认管理员密码！

## 数据持久化

本项目使用Cloudflare Durable Objects进行数据持久化，包括：
- 用户账户信息
- WebSocket连接状态
- 聊天消息

Durable Objects会自动处理数据持久化，无需额外配置。

## 域名配置

如果您想使用自己的域名，可以在Cloudflare Dashboard中配置：

1. 登录Cloudflare Dashboard
2. 选择您的域名
3. 转到Workers & Pages
4. 点击"添加路由"
5. 输入您的路由和Worker名称

## 更新部署

当您修改代码后，只需重新构建和部署：

```bash
npm run build
wrangler deploy
```

## 故障排除

### 构建错误

如果遇到构建错误，请确保：
- Node.js版本为18或更高
- 已安装所有依赖：`npm install`

### 部署错误

如果遇到部署错误，请检查：
- Wrangler是否已登录：`wrangler whoami`
- `wrangler.toml`配置是否正确
- 是否有足够的Cloudflare配额

### 运行时错误

如果应用运行时出现错误，请查看：
- Cloudflare Dashboard中的Worker日志
- 浏览器控制台中的错误信息

## 安全建议

1. 修改默认管理员密码
2. 定期更新依赖包：`npm update`
3. 使用HTTPS（Cloudflare自动提供）
4. 限制管理员账户数量
5. 定期备份重要数据

## 性能优化

1. 使用Cloudflare CDN缓存静态资源
2. 启用Cloudflare的自动压缩
3. 配置适当的缓存策略

## 监控和分析

Cloudflare提供内置的分析工具，您可以在Dashboard中查看：
- 请求统计
- 响应时间
- 错误率
- 带宽使用情况

## 更多信息

- [Cloudflare Workers文档](https://developers.cloudflare.com/workers/)
- [Wrangler CLI文档](https://developers.cloudflare.com/workers/wrangler/)
- [Durable Objects文档](https://developers.cloudflare.com/workers/runtime-apis/durable-objects/)
