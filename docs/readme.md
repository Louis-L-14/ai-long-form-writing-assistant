# AI 长篇小说写作助手 - 启动指南

本文档提供逐步启动后端和前端服务的详细说明。

## 📋 目录

- [环境要求](#环境要求)
- [快速启动](#快速启动)
- [详细步骤](#详细步骤)
  - [1. 启动后端服务](#1-启动后端服务)
  - [2. 启动前端服务](#2-启动前端服务)
- [访问应用](#访问应用)
- [常见问题](#常见问题)

---

## 环境要求

在开始之前，请确保已安装以下软件：

- **Python** 3.10+ (推荐 3.11)
- **Node.js** 18+ 和 npm
- **Docker** 和 Docker Compose (用于运行 PostgreSQL 数据库)
- **Git** (用于克隆项目)

---

## 快速启动

```bash
# 1. 启动数据库
cd back-end
docker-compose up -d

# 2. 启动后端
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# 编辑 .env 配置文件，填入必要的 API 密钥
uvicorn app.main:app --reload --port 8000

# 3. 启动前端（新终端窗口）
cd front-end
npm install
npm run dev
```

---

## 详细步骤

### 1. 启动后端服务

#### 步骤 1.1: 配置数据库

```bash
# 进入后端目录
cd /Users/louis14/Code/ai-long-form-writing-assistant/back-end

# 启动 PostgreSQL 数据库（带 pgvector 扩展）
docker-compose up -d
```

**验证数据库启动：**
```bash
docker ps
```
应该看到两个容器正在运行：
- `novel_assist_db` (PostgreSQL，端口 5432)
- `novel_assist_pgadmin` (pgAdmin 管理界面，端口 5050)

#### 步骤 1.2: 创建 Python 虚拟环境

```bash
# 创建虚拟环境
python3 -m venv venv

# 激活虚拟环境
# macOS/Linux:
source venv/bin/activate

# Windows:
# venv\Scripts\activate
```

激活后，终端提示符前应显示 `(venv)`。

#### 步骤 1.3: 安装 Python 依赖

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

主要依赖包括：
- `fastapi` - Web 框架
- `uvicorn` - ASGI 服务器
- `sqlalchemy` - ORM
- `asyncpg` - 异步 PostgreSQL 驱动
- `pgvector` - 向量数据库支持
- `openai` - OpenAI API 客户端
- `tavily-python` - Tavily 搜索 API 客户端

#### 步骤 1.4: 配置环境变量

```bash
# 复制环境变量示例文件
cp .env.example .env

# 使用文本编辑器打开 .env 文件
nano .env  # 或使用 vim、code 等编辑器
```

**必须配置的环境变量：**

```bash
# 数据库配置
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=novel_assist
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/novel_assist

# OpenAI API 配置（必填）
OPENAI_API_KEY=your-openai-api-key-here
LLM_BASE_URL=https://api.deepseek.com  # 或其他兼容 OpenAI 的 API

# Embedding API 配置（必填）
EMBEDDING_API_KEY=your-embedding-api-key-here
EMBEDDING_BASE_URL=https://api.openai.com/v1  # 或自定义端点

# Tavily 搜索 API 配置（必填）
TAVILY_API_KEY=your-tavily-api-key-here
```

> **重要提示：** 
> - 请替换 `your-xxx-api-key-here` 为实际的 API 密钥
> - 所有 API 密钥都是必需的，否则相关功能将无法使用

#### 步骤 1.5: 初始化数据库

```bash
# 运行数据库初始化脚本（如果存在）
python -m app.db.init_db
```

这将：
- 启用 `pgvector` 扩展
- 创建所有必要的数据表
- 设置向量索引

#### 步骤 1.6: 启动后端服务器

```bash
uvicorn app.main:app --reload --port 8000
```

**成功启动的标志：**
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**后端 API 地址：** http://localhost:8000

**API 文档地址：** http://localhost:8000/docs (Swagger UI)

---

### 2. 启动前端服务

**打开新的终端窗口**（保持后端服务运行）

#### 步骤 2.1: 进入前端目录

```bash
cd /Users/louis14/Code/ai-long-form-writing-assistant/front-end
```

#### 步骤 2.2: 安装 Node.js 依赖

```bash
# 安装依赖包
npm install
```

主要依赖包括：
- `react` - React 框架
- `vite` - 构建工具
- `lucide-react` - 图标库
- `typescript` - TypeScript 支持

#### 步骤 2.3: 启动开发服务器

```bash
npm run dev
```

**成功启动的标志：**
```
  VITE v6.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

**前端地址：** http://localhost:5173

---

## 访问应用

### 主应用

打开浏览器访问：**http://localhost:5173**

应用包含三个主要页面：

1. **创世向导** (Genesis Wizard) - 使用 AI 辅助创建项目蓝图
2. **写作工作室** (Studio) - 带 AI 辅助的主要写作界面
3. **时空百科** (Wiki) - 管理角色、地点等实体的版本化知识库

### 后端 API 文档

访问：**http://localhost:8000/docs**

查看所有可用的 API 端点和测试接口。

### 数据库管理

访问 pgAdmin：**http://localhost:5050**

- **邮箱：** admin@example.com (默认)
- **密码：** admin (默认)

---

## 常见问题

### Q1: 数据库连接失败

**错误信息：** `could not connect to server`

**解决方案：**
```bash
# 检查 Docker 容器状态
docker ps

# 如果容器未运行，重新启动
cd back-end
docker-compose down
docker-compose up -d

# 查看日志
docker-compose logs db
```

### Q2: 后端启动失败 - ModuleNotFoundError

**错误信息：** `ModuleNotFoundError: No module named 'xxx'`

**解决方案：**
```bash
# 确保虚拟环境已激活
source venv/bin/activate  # macOS/Linux
# 或 venv\Scripts\activate  # Windows

# 重新安装依赖
pip install -r requirements.txt
```

### Q3: API 密钥错误

**错误信息：** `AuthenticationError` 或 `Invalid API key`

**解决方案：**
1. 检查 `.env` 文件中的 API 密钥是否正确
2. 确保没有多余的空格或引号
3. 验证 API 密钥是否有效且有足够的额度

### Q4: 前端无法连接后端

**错误信息：** `Failed to fetch` 或 `Network error`

**解决方案：**
1. 确认后端服务在 http://localhost:8000 运行
2. 检查 `front-end/api.ts` 中的 API 基础 URL 配置
3. 检查浏览器控制台的 CORS 错误

### Q5: 端口已被占用

**错误信息：** `Address already in use`

**解决方案：**
```bash
# 更改后端端口
uvicorn app.main:app --reload --port 8001

# 更改前端端口（编辑 vite.config.ts 或使用命令）
npm run dev -- --port 5174
```

---

## 停止服务

### 停止前端
在前端终端按 `Ctrl + C`

### 停止后端
在后端终端按 `Ctrl + C`

### 停止数据库
```bash
cd back-end
docker-compose down

# 如需删除数据卷（清除所有数据）
docker-compose down -v
```

---

## 技术栈

### 后端
- **框架：** FastAPI
- **数据库：** PostgreSQL + pgvector
- **ORM：** SQLAlchemy (异步)
- **AI/LLM：** OpenAI API (支持自定义端点)
- **搜索：** Tavily API

### 前端
- **框架：** React 19
- **构建工具：** Vite
- **语言：** TypeScript
- **样式：** Tailwind CSS (内联)
- **图标：** Lucide React

---

## 更多文档

- [RAG 策略说明](./RAG策略.md)
- [前端集成指南](./frontend_guide.md)
- [数据库架构](../back-end/schema.sql)

---

**如有问题，请查看日志输出或提交 Issue。**
