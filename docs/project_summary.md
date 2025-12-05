# 项目概述文档

## 业务需求实现
- **核心功能**：提供 AI 长篇写作辅助，支持 **概念、角色、世界观、大纲、章节** 的分步生成与编辑。
- **Genesis Wizard**：统一入口，用户一次性输入创意，系统自动路由到 **Skeleton、Protagonist、World、Outline、First Chapter** 等专属 Agent，实时返回进度反馈。
- **实时进度条**：前端在右侧面板展示已完成的模块（骨架、角色、世界观等），并在生成每一步后即时更新。
- **编辑能力**：用户可在对应 Tab 中手动编辑已生成内容，系统会基于编辑后的数据继续后续生成。

## 技术实现
- **后端**：FastAPI + LangGraph 多代理工作流
  - `app/agents/state.py` 定义 `GenesisState`（包括 `skeleton`, `characters`, `world`, `outline`, `first_chapter` 等字段）。
  - `app/agents/nodes.py` 实现 **Router**（仅分类），**Skeleton/Protagonist/World/Outline/First Chapter** 专家 Agent，**Finalizer** 汇总结果。
  - `app/agents/graph.py` 构建有向工作流：`router → skeleton → protagonist → first_chapter → world → outline → finalizer`。
  - `app/routers/genesis.py` 暴露 `/api/genesis/*` 接口，使用 **StreamingResponse** 将每个 Agent 的 `type: status` 与 `type: result` 实时推送给前端。
- **前端**：React (TSX) + Vite
  - `GenesisWizard.tsx` 负责 UI 布局、输入分发、进度状态管理。
  - `ProjectDashboard.tsx`, `Studio.tsx` 展示项目列表、章节编辑等功能。
  - `api.ts` 中封装 `generateSkeleton`, `generateProtagonist`, `generateWorld`, `generateOutline` 等调用。
- **LLM**：使用 OpenAI GPT‑4‑o‑mini（模型已切换），通过 **Prompt**（位于 `back-end/prompts/genesis/*.txt`）实现专业化的内容抽取与生成。

## 数据库实现
- **SQLite (via SQLModel)**
  - `app/db/models.py` 定义 `Project`, `Chapter`, `Character`, `World` 等 ORM 模型。
  - `app/routers/projects.py` 提供 CRUD 接口：创建项目、获取章节、保存编辑内容。
  - 项目元信息（如 `first_chapter_title`, `first_chapter_content`）保存在 `Project.meta_info` JSON 字段，便于快速恢复。

## 参考文档
- **后端状态模型**：`app/agents/state.py`
- **Agent 工作流**：`app/agents/graph.py`、`app/agents/nodes.py`
- **API 路由**：`app/routers/genesis.py`、`app/routers/projects.py`
- **前端 UI 关键组件**：`front-end/components/GenesisWizard.tsx`、`front-end/components/Studio.tsx`
- **Prompt 设计**：`back-end/prompts/genesis/*.txt`

> 本文档仅做概览，详细实现细节请参考上述源码文件。
