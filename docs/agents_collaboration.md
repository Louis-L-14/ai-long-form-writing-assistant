# 多 Agent 协作说明

本文面向项目贡献者，梳理 AI 长篇写作助手中各类 Agent 的职责边界、协作模式与数据流，帮助快速定位扩展点。

## 1. 顶层流程概览

系统以 "项目 (Project)" 为最小单元，围绕三个阶段组织 Agent：

1. **创世阶段**：LangGraph 中的多节点 Agent 负责把模糊灵感拆解成骨架、角色、世界观、大纲与首章草稿。
2. **写作阶段**：章节写作 Agent 结合 RAG 检索到的项目记忆，为作者实时生成/润色正文。
3. **记忆维护 & 灵感拓展**：分析+同步 Agent 负责把新设定写回知识库，MCP 工具 Agent 负责与外部搜索/灵感源协同。

这三个阶段形成闭环：创世阶段产出的结构化设定会进入记忆库，写作阶段依赖记忆库保持一致性，写完的章节再被分析 Agent 吸收，以便下一轮使用。

## 2. 创世阶段：LangGraph 多节点工作流

**核心文件**：`back-end/app/agents/graph.py`, `back-end/app/agents/nodes.py`, `back-end/app/agents/state.py`, `back-end/app/routers/genesis.py`

- `GenesisState` 在 `state.py` 中定义共享状态，包含 `current_data`, `target_agents`, 各模块产物等。
- `graph.py` 使用 LangGraph 把节点串为 `router → skeleton → protagonist → first_chapter → world → outline → finalizer`，并编译成可流式执行的 `genesis_graph`。
- `nodes.py` 内部实现各 Agent：
  - **Router Agent**：根据用户输入与已有蓝图判定要唤醒的专项 Agent，并写入 `target_agents`。
  - **Skeleton / Protagonist / World / Outline / First Chapter Agents**：读取 `target_agents` 与 `current_data`，调用 `llm_service` + 对应 prompt 生成结构化 JSON；写回 `agent_outputs`。
  - **Finalizer Node**：读取所有 `agent_outputs`，生成面向前端的友好总结。
- `routers/genesis.py` 提供 HTTP/streaming 外壳：
  - 把前端输入打包成 `GenesisState`，启动 `genesis_graph.astream`。
  - 对每个节点的 `status` 和 `result` 事件进行流式推送，使前端 `GenesisWizard.tsx` 能实时刷新各 Tab。

**协作要点**：Router 控制节点激活顺序与幂等性；专项 Agent 只关注各自 prompt；Finalizer/Stream 负责结果汇总与用户体验。开发者在扩展新的创世节点时，只需在 `state.py` 增加字段、在 `nodes.py` 写 Agent、在 `graph.py` 调整拓扑即可。

## 3. 写作阶段：章节写作 & RAG 协同组

**核心文件**：`back-end/app/routers/chat.py`, `back-end/app/services/rag_service.py`, `back-end/app/services/embedding_service.py`

- 前端工作台 (`Studio.tsx`) 调用 `/chat/generate`：
  1. 若传入 `project_id`，后端先从数据库抓取 `Project.meta_info`、`Chapter` 细纲，拼出基础上下文。
  2. **章节 1**：直接注入骨架、金手指、世界观摘要、角色列表（静态上下文）。
  3. **章节 > 1**：构造基于「当前章节 + 最近用户输入」的查询串，调用 `rag_service.retrieve_context` 做向量检索：
     - `rag_service` 通过 `embedding.l2_distance()` + `chapter` 过滤返回最相关的实体版本（角色、事件、术语等）。
     - 结果以 "RAG 检索" 片段追加至 prompt，若检索失败输出友好提示。
  4. 拼装系统 prompt（含动态上下文 + 用户草稿），交给 `llm_service.generate_text` 流式输出。

**协作要点**：
- `chat.py` 只是 orchestrator，真正的知识检索逻辑封装在 `rag_service` 中。
- `rag_service` 与 `embedding_service` 配合：后者负责把实体/章节变更转成向量，前者负责带章节窗口的检索，保证“当前故事时刻”使用正确的设定版本。
- 上述 Agent 与创世阶段共享同一 `Project.meta_info`，实现从“开书”到“日常写作”的连续体验。

## 4. 记忆维护：分析 Agent 与 RAG 同步 Agent

**核心文件**：`back-end/app/services/analysis_service.py`, `back-end/app/services/rag_sync_service.py`, `back-end/app/services/rag_service.py`

- **章节分析 Agent (`analysis_service`)**：
  - `_generate_summary`：把正文压缩成 200-300 字摘要，供 `Chapter` 概览与后续检索。
  - `_extract_entities` / `extract_events`：从正文中提取角色/地点/事件的状态变化，形成结构化 `payload`，为 `EntityVersion` 更新提供原料。
- **RAG 同步 Agent (`rag_sync_service`)**：
  - 把 `Project.meta_info` 里的角色、世界观、故事公式等批量写入 RAG；
  - 通过 `rag_service.upsert_entity_version` 自动生成版本号、设置 `valid_from_chapter`，建立 "初始设定" 版本；
  - 对世界观子模块（阵营、规则、经济等）拆分成独立实体，提升检索粒度。
- **实体版本管理 (`rag_service`)**：
  - `upsert_entity_version`：为每条实体写入 embedding，并自动关闭旧版本 (`is_current=False`, `valid_to_chapter = chapter-1`)；
  - `retrieve_context`：按 `project_id` + `chapter` 过滤，再按向量距离排序，返回符合时间窗口的设定；
  - 还提供 `delete_entity`、`delete_events_for_chapter` 等维护接口，支持作者在回写时重置设定。

**协作要点**：分析 Agent 与 RAG 同步 Agent 构成「写完 → 入库 → 可检索」闭环，使写作 Agent 永远使用带版本号的“真相源”。

## 5. 灵感与外部工具 Agent：MCP + Tavily + 标题三段式流程

**核心文件**：`back-end/app/services/inspiration_service.py`, `back-end/mcp_server/tavily_server.py`, `back-end/app/routers/genesis.py` (title suggestion route)

- **MCP 服务端 (`mcp_server/tavily_server.py`)**：
  - 使用 FastMCP 暴露 `search_inspiration` 工具；
  - 内部调用 Tavily API `search_depth=advanced` 获取结果；
  - 以标准 MCP 协议通过 stdio 与主进程通信。
- **MCP 客户端 (`inspiration_service`)**：
  - on-demand 启动 MCP 子进程，注入 `TAVILY_API_KEY` 环境变量；
  ủ 重试逻辑：失败最多重试 2 次并在前端提示降级结果；
  - 封装成 `search_inspiration` 供其他 Agent 使用。
- **标题建议 Agent**（`/genesis/suggest_title`）示范了多 Agent 串联：
  1. **分析 Agent**：读取项目数据 + 设定 + 大纲，生成核心卖点与命名方向；
  2. **搜索 Agent**：调用 MCP/Tavily 获取市场参考；
  3. **综合 Agent**：根据分析 + 市场结果输出 5 个标题候选与理由。

**协作要点**：把外部搜索封装成 MCP Tool，LangGraph/LLM 节点只关心“调用工具”而非实现细节，方便未来扩展更多工具（行业百科、情节调研等）。

## 6. 端到端数据流（文字示意）

1. **创世**：前端调用 `/genesis/unified` → `genesis_graph` 流式产出骨架/角色/世界观 → `Project.meta_info` 存储初始设定。
2. **记忆入库**：`rag_sync_service.sync_project_to_rag` 把初始设定拆分写入 `EntityVersion`，Embedding 由 `embedding_service` 生成。
3. **写作**：`
   `/chat/generate` 接收章节信息 → `rag_service.retrieve_context` 拿到“当前章节可见设定” → `llm_service` 产出正文。
4. **写后回写**：`analysis_service` 生成摘要 + 实体变更 → `rag_service.upsert_entity_version` 更新设定版本 → 下一章写作继续复用。
5. **灵感补充**：如需标题/设定灵感 → `inspiration_service` 触发 MCP/Tavily → 结果再被专题 Agent 消化。

通过以上协作，系统实现了“多 Agent 分工 + 项目记忆闭环”，保证从立项到连载的每一步都可追踪、可扩展、可复用。
