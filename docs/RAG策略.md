- 具体如何应用RAG保存“记忆”

  - 记忆的存储与读取方式

    先直接说结论：

    **是的，RAG 依然很有用，而且对“世界观 / 人物卡 / 时间线 / 术语表”这种东西，它更像是“外置长期记忆”，并不要求你每次都手动提问。**

    “只有在有明确问题时才用 RAG”只是最朴素的一种用法，不是上限。

    ------

    ## 1. 先纠正一个常见“误会”

    > “RAG 不是应该在有‘明确问题’时才有效吗？”

    这是因为大部分教程的 demo 都长这样：

    > 用户：张三的履历是什么？
    >
    > 系统：用问题去搜向量库 → 找到张三的卡片 → 回答。

    **但在你自己的系统里，那个“问题”完全可以是系统自己构造的，并不一定是用户问出口的自然语言。**

    - 对模型来说，RAG 的本质是：

      > “在当前要写这一段之前，从外部知识库里，先帮它把相关资料翻出来，塞到上下文里。”

    - 这个“翻资料”的动作，可以：

      - 用户显式触发（你自己点一个“查设定”按钮）；
      - 也可以 **系统自动触发**（每次写场景前都自动查）。

    所以，从实现角度看：

    - `问题 = “当前这段要写的场景/人物/时间 → 生成的检索 Query”`
    - 用户根本不用知道“提问”这回事，前端只看到“写下一段”。

    ------

    ## 2. “需要时刻被记住”的信息，为什么仍然适合放进 RAG？

    你说得对：

    世界观、大纲、人物关系、人物卡……

    **从创作角度，它们确实是“应该一直记住”的，而不是“偶尔查查”。**

    问题在于：

    - 单次上下文就算 128k / 200k tokens，也 **装不下你整个世界观 + 所有已写章节 + 角色档案 + 时间线**，何况你还要留空间给“要写的新内容”。

    - 小说是不断修改的：

      - 世界观文档会加细节；

      - 人物卡会被修订；

      - 时间线会插入事件。

        把这些全写死在系统 prompt 或 finetune 里根本不现实。

    所以现实一点的做法是把记忆分层：

    ### 2.1 三层“记忆架构”（类比真人）

    你可以想象成：

    1. **短期记忆（上下文 / 对话历史）**
       - 最近几轮对话、上一个章节的内容、当前场景 draft 等。
       - 适合放在模型上下文里直接“滚动窗口”。
    2. **工作记忆 / 外置记事本（RAG 知识库）**
       - 世界观说明、人物卡、时间线、术语表、既有章节摘要……
       - 平时不全部塞进上下文，而是按需取用：
         - 当前要写 A/B/C 三个人在王都宫殿吵架；
         - 系统就自动从知识库里拉：
           - A/B/C 的人物卡；
           - 王都 + 宫殿的世界观设定；
           - 时间线上最近与这三人相关的事件摘要。
    3. **长期、稳定常识（模型预训练自带的东西）**
       - 语言能力、叙事套路、常识、生活细节。
       - 不需要你管，直接用模型自身就好。

    **RAG 的位置，就是第 2 层：外置、可更新、可扩充的“项目级记忆”。**

    你要的是“**写作过程中模型总是记得设定**”，不是“上来就把所有东西一口气塞给模型”。

    RAG 做到的是：**每次生成前，自动把“该记住的那一小部分”取出来给它。**

    ------

    ## 3. 写小说时，RAG 可以怎么“自动发挥作用”？

    ### 3.1 典型链路（你完全可以这样设计）

    假设你现在要生成 **第 12 章 · 夜袭王都** 的一段剧情：

    1. **用户前端传过来的信息**
       - 当前章节 ID：`ch_12`
       - 本章场景设定（你在 UI 里引导好的）：
         - 场景：王都 · 皇宫后花园
         - 视角人物：女主 A、男主 B、反派 C
         - 时间：帝国历 532 年 春 · 夜
         - 情绪：紧张 / 暗杀 / 背叛
       - 用户写的一点草稿 / 提纲。
    2. **系统在后台自动做的事情（这里就是 RAG）**
       - 根据这些标签构造检索 Query，例如：
         - “人物：A,B,C + 王都 + 皇宫 + 时间点：532 年春之前的相关事件”
       - 从不同知识库里拉东西：
         - **角色库 →** A/B/C 的人物卡、关系变化摘要；
         - **世界观库 →** 王都 & 皇宫设定、政治格局；
         - **时间线库 →** 532 年春之前这三人的关键事件；
         - **术语库 →** 这一章用到的势力名 / 技能名 / 道具说明；
         - **既有章节库 →** 最近几章与 A/B/C 强相关的片段摘要。
    3. **拼装成模型的输入**
       - 固定的系统指令（文风、目标、不要打脸等）；
       - 本章提纲；
       - **RAG 检索到的“设定包”（你可以用‘事实条目’的形式组织）**；
       - 用户上一次修改后的内容 / draft。

    然后模型才开始写这一段。

    > 在这个流程里：
    >
    > - 作者没有“提问”；
    > - 但 RAG 每次都在后台自动工作；
    > - 对作者来说就是：**“它好像真的记住了我的世界观和前文”。**

    ### 3.2 RAG 不只是“查”，还可以“校对”

    除了“写之前把相关设定拿出来”，你还可以：

    1. 写完后再来一轮：
       - 再用同一个场景标签 / 人物标签检索设定；
       - 让另一个模型当“设定检查官”：
         - 对比本段正文 vs 设定；
         - 标出：
           - 名字写错；
           - 时间线不一致；
           - 性格崩坏（人物卡里说他胆小，这一段无脑莽）。
    2. 系统再把这些检查结果反馈给用户：
       - 用“红线 + 评论”的形式展示；
       - 用户自己选择是否接受修改。

    这套，其实本质上就是：

    > RAG 作为“设定真相源（source of truth）”，LLM 负责生成和对比。

    ------

    ## 4. 那有没有“完全不用 RAG，只靠记忆”的可能？

    有，但只适合 **非常小** 的项目，或者非常简化的产品：

    1. 如果整部作品的所有设定 + 已写章节压缩后 < 20k–30k tokens：
       - 可以粗暴一点：
         - 把所有设定塞在系统 prompt；
         - 再加最近几章的摘要；
         - 勉强还能玩。
       - 问题是：
         - 一旦作者写到中后期，字数暴涨，这个方案立刻崩溃。
    2. 用超长上下文模型（比如 1M tokens）：
       - 你**理论上**可以把几乎整部书都塞进去；
       - 但实际问题是：
         - 每次调用都要传巨大上下文 → 成本爆炸；
         - 速度慢得吓人；
         - 上下文更新要不停重打包；
         - 你仍然需要做“哪些内容是重点、哪些要摘要”，等同于在做 RAG+总结，只是更粗糙。
    3. Finetune / LoRA 把世界观写进模型：
       - 适合“同一世界观下写很多本书”的工业化场景；
       - 不适合“用户每开一个新项目都一套新设定”的工具产品：
         - 每本书 finetune 一次不现实；
         - 用户改设定你还得重新训练。

    所以对于你这种 **面向大量作者 + 动态项目** 的系统：

    > “完整记忆”这件事，从工程上就是：用持久存储 + RAG 模块，把大脑外接一个可更新数据库；而不是幻想把所有东西一次性塞进模型大脑里不再动。

    ------

    ## 5. 什么时候“RAG 对世界观不再有意义”？

    可以说只有两种情况：

    1. **作品体量很小**，所有设定 + 全文 + 注释都能稳定塞进单次上下文，而且不会再怎么改：
       - 比如只写个 3–5 万字以内的中短篇、世界观简单。
       - 这种可以不搞 RAG，成本 / 复杂度不值得。
    2. 你的目标只是做一个“**一次性写爽文片段的玩具**”，不是陪用户写完整一部长篇：
       - 用户每次来就是：
         - “帮我写一段热血战斗场面”；
         - “帮我写一段甜文告白”；
       - 这种只需要模型的写作能力 + prompt，不需要项目记忆。

    但只要你要做的是：

    > “真正陪一个作者写完一本书，甚至一整个系列”，
    >
    > 基本都会走回到 **项目记忆 + RAG** 这条路上。

    ------

    ## 6. 简单帮你归纳一下设计思路

    如果把你的写作系统抽象成一张表，大概是这样用 RAG 的：

    | 场景                           | 是否用 RAG | 用来干什么                                           |
    | ------------------------------ | ---------- | ---------------------------------------------------- |
    | 世界观 / 人物 / 时间线设定界面 | ❌          | 直接写入结构化数据库 / 文档（将来会入库）            |
    | 生成大纲 / 分章大纲            | ✅          | 读世界观 + 角色设定，保证规划不打脸                  |
    | 生成单章正文                   | ✅          | 自动拉取：本章涉及角色卡、地点设定、时间线、前文摘要 |
    | 作者手动查设定                 | ✅          | “XX 现在多大了？”、“某个组织的正式名称是什么？”      |
    | 一致性 / 设定检查              | ✅          | 正文 vs 设定 / 时间线 / 人物卡，对比找冲突           |
    | 纯风格润色（不管设定）         | ❌/弱依赖   | 直接让模型润色，顶多看一下当前段落上下文             |

    你纠结的那句可以改成：

    > “这些东西应该被完整记忆” ≈ “这些东西应该被稳定地放进一个专门的项目知识库里，并且在每次生成/检查时自动被 RAG 拉出来用”。

    而不是“永远写在 prompt 里不管体积”。

    ------

    如果你愿意，我们下一步可以：

    直接按“世界观库 / 角色库 / 时间线库 / 术语库 / 章节库”5 个知识库，把 **字段结构 + 入库格式 + 检索 Query 模板** 一起设计出来，相当于给你的“小说项目 RAG 层”画一张数据结构说明书。

  - 技术实现方式

    这个问题问得非常关键，基本就是：**“设定是会变的，怎么让 RAG 跟着一起可靠地变？”**

    我分三块说：

    1. 这个场景下，推荐怎样的 RAG 技术 / 架构
    2. 新知识怎么动态塞进知识库
    3. 旧知识：覆盖 vs 保留历史 → 哪种更适合写小说，以及各自怎么实现

    ------

    ## 1. 这个场景下，RAG 最适合的整体架构

    结合你现在的技术习惯，我会推荐一个 **“关系型数据库 + 向量库” 的双层架构**：

    ### 1.1 数据分层的思路

    - **关系型数据库（Postgres / MySQL 等）**
      - 存“真相”的结构化版本：
        - 人物卡：属性、成长阶段、性格标签、当前状态……
        - 人物关系：A 爱慕 B、A 曾背叛 B（带“故事内时间”和“章节范围”）
        - 世界观：国家、势力、地理、魔法规则……
        - 时间线：事件、发生时间、参与人物
      - 特点：
        - 方便做版本号、时间范围、唯一约束（不容易乱）。
    - **向量库（pgvector / Qdrant / Milvus / Pinecone 等）**
      - 存“可检索的文本版本”：
        - 比如把某个角色最新的设定压缩成一段 **检索用 summary**，算 embedding，连同 metadata 一起存进去：
          - `project_id`（哪本书）
          - `entity_type`（character/world/timeline/glossary/chapter）
          - `entity_id`（角色 / 势力唯一 ID）
          - `version`（第几版设定）
          - `story_chapter_range`（在第几章到第几章之间有效）
          - `is_current`（当前是否生效）
      - 检索时通过向量相似度 + 这些 metadata 过滤来找“当前这一段写作需要的设定”。([Wikipedia](https://en.wikipedia.org/wiki/Retrieval-augmented_generation?utm_source=chatgpt.com))

    简单一句话：

    > 关系库管“真相 + 版本”，向量库管“怎么迅速找到相关的真相片段”。

    ### 1.2 RAG 管道（简化）

    每次要写一段正文时：

    1. 前端提交：当前项目、章节、场景信息（人物 A/B/C、地点、时间点、情绪等等）。
    2. 后端根据这些信息构造一批检索 query（可以是 LLM 生成的 query）。
    3. 针对不同的“库”分别检索：
       - 角色库 → 人物卡 + 人物关系
       - 世界观库 → 地点 / 势力 / 规则
       - 时间线库 → 前后相关事件
       - 术语库 → 名词解释
       - 既有章节库 → 最近几章摘要
    4. 把检索到的内容和当前大纲/草稿一起作为上下文送给写作模型。

    ------

    ## 2. 如何动态增加新的知识到知识库？

    ### 2.1 用户操作 → 后端更新 → 向量库更新

    以“新增或修改一个人物卡”为例，可以设计这么一个管线：

    1. **作者在前端编辑界面操作**

       - 新建角色 / 修改已有角色的属性、背景、关系等。

    2. **后端收到请求后做两件事：**

       **(1) 写入结构化层（关系库）**

       - 表结构类似：

         ```
         table character_version (
           id                uuid primary key,
           project_id        uuid,
           character_id      uuid,
           version           int,
           story_chapter_from int,   -- 从第几章开始有效（可选）
           story_chapter_to   int,   -- 到第几章结束（可选，支持 null）
           is_current        bool,
           payload_json      jsonb,  -- 人物属性的结构化字段
           created_at        timestamp
         )
         ```

       - 新建人物 → 直接 `insert version=1, is_current=true`

       - 修改人物 → 生成 `version=2` 的新行（下面第 3 部分展开）

       **(2) 写入检索层（向量库）**

       - 把 `payload_json` 里的人物信息转成一段适合检索的文本，比如通过一个小 prompt：

         > “请把这个人物卡整理为 300 tokens 左右，突出：身份、外貌、性格、重要经历、与其他关键角色的关系，注意这是写作设定，不要编新剧情。”

       - 对这段文本计算 embedding，写入向量库，带上元信息：

         ```json
         {
           "id": "character_id#version",
           "project_id": "...",
           "entity_type": "character",
           "entity_id": "character_id",
           "version": 2,
           "is_current": true,
           "story_chapter_from": 10,
           "story_chapter_to": null
         }
         ```

       - 技术上就是一次“插入新向量”的操作（或者 upsert / delete+insert）。([ApX Machine Learning](https://apxml.com/courses/optimizing-rag-for-production/chapter-7-rag-scalability-reliability-maintainability/rag-knowledge-base-updates?utm_source=chatgpt.com))

    3. **之后检索的时候**

       - query 里一定带上：
         - `project_id`
         - `current_chapter`
         - 视角人物 / 场景信息
       - 向量检索时加 metadata 过滤规则：
         - `project_id = 当前项目`
         - `is_current = true`
         - `story_chapter_from <= current_chapter`
         - `story_chapter_to is null or story_chapter_to >= current_chapter`

    这样，就实现了“新知识动态加入 + 只用当前有效的版本”。

    ------

    ## 3. 旧知识：覆盖 vs 保留历史？

    这块我给你一个对比表，然后直接给结论 + 实现方式。

    ### 3.1 覆盖 vs 保留历史对比

    | 策略                | 做法概述                                            | 优点                                               | 缺点                                                   | 是否适合长篇小说 |
    | ------------------- | --------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------ | ---------------- |
    | 直接覆盖（replace） | 每次修改就把旧记录 & 旧向量直接更新成新内容         | 实现简单，存储量小                                 | 无法追踪早期设定；时间线回溯困难；检测“设定打脸”很麻烦 | ❌ 不推荐         |
    | 保留历史（append）  | 每次修改都新建一个 version，旧的标记为过期 / 非当前 | 可以清楚知道每个阶段的设定；易做时间线和一致性检查 | 实现稍复杂；检索时需要加上“版本/时间”的过滤规则        | ✅ 强烈推荐       |

    - *对于你这个“陪作者写完整长篇 + 不断迭代设定”的场景，强烈建议：

    > 默认采用“保留历史 + 标记当前版本”的模式。**

    因为：

    - 作者经常会改设定、回头重写第 X 章；
    - 你需要区分：
      - “故事内第 5 章时，这个人还没觉醒”
      - “故事内第 30 章时，他已经觉醒了”
    - 将来还可以做非常有用的功能：
      - 检查：某一章正文是否使用了当时还不存在的设定 → 自动标红；
      - 支持“回到第 N 章的设定视图”，方便大改稿。

    ### 3.2 如果是“直接覆盖”，技术上怎么做？

    这种更简单，我简单说一下思路（不建议作为默认，仅适合 toy 项目或早期原型）：

    - **关系库**

      - `character` 表就只存一份当前数据：

        ```
        table character (
          character_id uuid primary key,
          project_id   uuid,
          payload_json jsonb,
          updated_at   timestamp
        )
        ```

      - 修改时直接 `update payload_json`。

    - **向量库**

      - 多数向量库支持 `upsert`：

        - Pinecone/Qdrant 是直接 `upsert(id=character_id, vector=新向量, metadata=...)`；([Wikipedia](https://en.wikipedia.org/wiki/Vector_database?utm_source=chatgpt.com))

        - 用 pgvector 时，可以直接：

          ```sql
          update character_vector
          set embedding = :new_embedding, metadata = :new_metadata
          where character_id = :id;
          ```

        - 或者先 `delete` 再 `insert`。

    **缺点就是：你完全失去“设定随时间演化的轨迹”。 对于小说，这几乎必定会在改稿/查错时踩坑。**

    ### 3.3 如果是“新增版本 + 保留历史”，具体怎么做？

    这是我推荐你做的方式，展开说一下。

    ### 3.3.1 关系库层

    - 人物表不存“当前状态”，而是存“版本”：

      ```
      table character_version (
        id                  uuid primary key,
        project_id          uuid,
        character_id        uuid,
        version             int,
        story_chapter_from  int,      -- 从哪一章开始这个版本生效
        story_chapter_to    int,      -- 到哪一章结束（可为 null，表示目前还生效）
        is_current          bool,     -- 是否是“当前版本”（写最新章节时用）
        payload_json        jsonb,
        created_at          timestamp
      );
      ```

    **更新流程：**

    1. 找到这个 `character_id` 当前 `is_current = true` 的记录，假设是 `version = 2`。
    2. 把它的 `story_chapter_to` 设置成“当前修改发生的章节 - 1”，并把 `is_current` 设为 `false`。
    3. 新建一条记录 `version = 3`：
       - `story_chapter_from = 当前章节`
       - `story_chapter_to = null`
       - `is_current = true`
       - `payload_json = 修改后的设定`

    这样你就同时拥有：

    - **写第 100 章时用的最新设定**（`is_current = true`）；
    - **回溯第 10 章时，这个人设曾经长什么样**（通过 `story_chapter_range` 过滤）。

    ### 3.3.2 向量库层

    - 向量的 `id` 可以直接用 `"character_id#version"`，方便区分。

      ```json
      {
        "id": "char_123#3",
        "project_id": "...",
        "entity_type": "character",
        "entity_id": "char_123",
        "version": 3,
        "story_chapter_from": 20,
        "story_chapter_to": null,
        "is_current": true
      }
      ```

    **更新流程：**

    1. 旧版本（`char_123#2`）：
       - 可以保留但标记 `is_current=false`；
       - 检索时默认加过滤 `is_current=true`；
       - 如果要做“时间点还原”，再额外用章节范围过滤。
    2. 新版本（`char_123#3`）：
       - 新算 embedding；
       - `upsert` 到向量库。

    **检索时的典型过滤规则：**

    - 正常“写新章”场景：
      - `project_id = 当前项目`
      - `is_current = true`
    - “按故事内时间点回放设定”场景：
      - `project_id = 当前项目`
      - `story_chapter_from <= current_chapter`
      - `story_chapter_to is null or story_chapter_to >= current_chapter`

    ------

    ## 4. 小结 + 建议方案

    **结合你的需求，我建议你直接按下面这套来设计：**

    1. **架构**
       - 关系库（建议直接用你熟悉的 Postgres）+ pgvector（或 Qdrant）做向量检索层。([Walturn](https://www.walturn.com/insights/retrieval-augmented-generation-(rag)-bridging-llms-with-external-knowledge?utm_source=chatgpt.com))
       - 每个“项目（小说）”有自己的 `project_id`，所有角色/世界观/时间线/术语/章节摘要都挂在它下面。
       - LangChain / LlamaIndex / LangGraph 只负责 orchestrate：
         - 写作节点前 → 根据场景自动组织检索 query；
         - 检索节点 → 按 `project_id + chapter` 做多路检索；
         - 生成节点 → 用这些设定作为上下文写正文。
    2. **新增知识**
       - 所有设定的新增 / 修改都先写入 **结构化表（带 version & 章节范围）**；
       - 再把这些结构化内容总结成检索文本，算 embedding，写入向量库。
    3. **更新策略**
       - **默认永远是“新增版本 + 标记旧版无效”，而不是直接覆盖；**
       - 检索时通过：
         - `is_current=true`（写新章）；
         - 或 `chapter_range`（按故事时间回放）来选择合适的版本。
    4. **只有在两种情况下可以考虑“直接覆盖”**
       - 小玩具项目 / 短篇一次性写完，不考虑改稿；
       - 修改只是 typo 级别：
         - 例如错别字、很小的字段修补，你可以直接覆盖结构化记录，同时直接 upsert 向量。

    ------

    如果你愿意，下一步我可以帮你：

    - 直接把 **“人物卡表 / 世界观表 / 时间线表 / 术语表 / 向量表”** 的 **完整 SQL schema** 列出来；
    - 再给一个 **“写第 N 章时调用后端接口 → 检索 → 生成”的端到端伪代码 / LangGraph 节点设计**，你可以直接拿去实现。

  - 数据流示例

    可以，我们直接用一套**具体模拟数据**把“关系型数据库 + 向量库”是怎么配合工作的走一遍。

    你可以把它当成你小说系统未来的数据流“样板”。

    我会用一个简化的世界观例子：

    > 项目：龙帝国计划
    >
    > 角色：`艾琳（Elin）`
    >
    > 场景：先写到第 8 章，后面在第 12 章修改了人设。

    ------

    ## 1. 先约定一下系统里有哪几张表 / 集合

    ### 1.1 关系型数据库（Postgres / MySQL）

    用来保存**结构化真相**（真实设定 + 版本 + 章节范围）。

    ### 表一：项目表 `project`

    | 字段 | 含义            |
    | ---- | --------------- |
    | id   | 项目 ID（UUID） |
    | name | 项目名          |

    例子：

    `project_id = proj_dragon_001`，`name = "龙帝国计划"`

    ------

    ### 表二：角色版本表 `character_version`

    > 所有“会变的设定”都放在这里，一条记录 = 某个角色在某个阶段的完整设定。

    | 字段         | 含义                                                    |
    | ------------ | ------------------------------------------------------- |
    | id           | 这一条版本记录的 ID（UUID）                             |
    | project_id   | 哪个项目（小说）                                        |
    | character_id | 哪个角色的 ID                                           |
    | version      | 第几版设定（从 1 开始递增）                             |
    | chapter_from | 从第几章开始，这个设定在故事里生效                      |
    | chapter_to   | 到第几章结束（可以为 NULL，表示一直有效到目前最新进度） |
    | is_current   | 现在写“最新章节”时，默认用的是不是这个版本              |
    | payload_json | 人物卡的具体内容（JSON：年龄、性格、背景、重要经历等）  |
    | created_at   | 这个版本创建时间                                        |

    ------

    ### 表三（示意）：章节表 `chapter`

    | 字段       | 含义             |
    | ---------- | ---------------- |
    | id         | 章节 ID          |
    | project_id | 所属项目         |
    | number     | 第几章（整数）   |
    | title      | 标题             |
    | summary    | 本章剧情摘要文本 |

    > 章节表这里主要是帮你理解“chapter_from / chapter_to”的含义，后面会用到。

    ------

    ### 1.2 向量库（Qdrant / Pinecone / pgvector 等）

    向量库只保存两样东西：

    1. 一段**适合 RAG 检索用的文本**（summary / 描述）；
    2. 一个**高维向量 + metadata（元数据）**。

    大部分向量库都支持把 JSON 式的 metadata 挂在每个向量上，并支持基于 metadata 过滤检索。([Qdrant](https://qdrant.tech/documentation/concepts/payload/?utm_source=chatgpt.com))

    我们假设有一个集合叫：

    > novel_knowledge_vectors

    它里边每一条记录包含：

    | 字段                  | 含义                                                        |
    | --------------------- | ----------------------------------------------------------- |
    | id                    | 向量 ID（我们用 `"实体ID#版本号"` 的形式）                  |
    | vector                | embedding 向量（比如 1536 维）                              |
    | text                  | 用来给 LLM 看的“设定摘要文本”                               |
    | metadata.project_id   | 项目 ID                                                     |
    | metadata.entity_type  | `character` / `world` / `timeline` / `glossary` / `chapter` |
    | metadata.entity_id    | 比如角色 ID：`char_elin`                                    |
    | metadata.version      | 第几版设定                                                  |
    | metadata.chapter_from | 从第几章开始生效                                            |
    | metadata.chapter_to   | 到第几章结束                                                |
    | metadata.is_current   | 是否当前版本                                                |

    > Qdrant 把这部分叫 payload；Pinecone 叫 metadata，语义类似。(Qdrant)
    >
    > 如果你用的是 Postgres + pgvector，那么这些字段可以直接做成表字段 + 一个 `vector` 类型列。([Tiger Data](https://www.tigerdata.com/learn/postgresql-extensions-pgvector?utm_source=chatgpt.com))

    ------

    ## 2. 构造一份模拟数据：艾琳 v1 → v2

    ### 2.1 初始角色创建（版本 v1）

    假设你刚开始写《龙帝国计划》，建了一个女主艾琳。

    **（1）写入关系型数据库**

    `character_version` 表里生成一条 v1：

    | 字段         | 值                                           |
    | ------------ | -------------------------------------------- |
    | id           | `cv_elin_v1`                                 |
    | project_id   | `proj_dragon_001`                            |
    | character_id | `char_elin`                                  |
    | version      | `1`                                          |
    | chapter_from | `1`   （表示从第 1 章开始，这个人设有效）    |
    | chapter_to   | `NULL`（暂时还没计划到哪一章，会在以后更新） |
    | is_current   | `true`                                       |
    | payload_json | （见下面）                                   |
    | created_at   | 2025-11-19 12:00:00                          |

    `payload_json`（简化展示）：

    ```json
    {
      "name": "艾琳",
      "age": 16,
      "origin": "北境小村庄",
      "occupation": "普通村姑",
      "personality_tags": ["胆小", "善良", "有同情心"],
      "abilities": ["能听见龙的低语"],
      "current_status": "跟随骑士凯尔前往王都，仍未觉醒任何战斗能力",
      "relationships": [
        { "target": "char_kael", "type": "信任", "description": "把凯尔当作唯一依靠" }
      ]
    }
    ```

    > 这部分是“结构化真相”，永远以关系型数据库为准。

    ------

    **（2）写入向量库**

    接下来，后端会把这份 `payload_json` 变成一段适合 RAG 用的文本摘要，然后做 embedding，存到向量库。

    示意文本（`text` 字段）：

    > “角色设定：艾琳，16 岁的北境村姑，出身偏远小村庄。性格胆小、善良、有同情心。她拥有听见龙之低语的特殊能力，但至今尚未觉醒战斗技巧。当前正跟随骑士凯尔前往王都，对方是她唯一信任的同伴。”

    向量库里插入一条记录：

    | 字段                  | 值                                       |
    | --------------------- | ---------------------------------------- |
    | id                    | `"char_elin#1"`                          |
    | vector                | `[0.0123, -0.4478, 0.2111, ...]`（示意） |
    | text                  | 上面那段“角色设定”文本                   |
    | metadata.project_id   | `proj_dragon_001`                        |
    | metadata.entity_type  | `"character"`                            |
    | metadata.entity_id    | `"char_elin"`                            |
    | metadata.version      | `1`                                      |
    | metadata.chapter_from | `1`                                      |
    | metadata.chapter_to   | `null`                                   |
    | metadata.is_current   | `true`                                   |

    > 这一步的作用：
    >
    > 以后你在写某一章的时候，只需要根据“当前章节、涉及角色”等信息去向量库检索，就能把这段文本拉回来塞给 LLM。

    ------

    ### 2.2 后期人设变化，产生新版本 v2

    假设写到第 12 章时，艾琳经历了一场大战，**觉醒成“龙骑士”**，性格也从胆小变坚定。

    你在“设定编辑界面”里修改了人物卡。

    ### （1）更新关系型数据库（保留历史）

    原来的 v1 要变成“只在第 1–11 章有效”：

    | 字段       | 旧值   | 新值    |
    | ---------- | ------ | ------- |
    | chapter_to | `NULL` | `11`    |
    | is_current | `true` | `false` |

    新插入一条 v2：

    | 字段         | 值                                   |
    | ------------ | ------------------------------------ |
    | id           | `cv_elin_v2`                         |
    | project_id   | `proj_dragon_001`                    |
    | character_id | `char_elin`                          |
    | version      | `2`                                  |
    | chapter_from | `12`  （从第 12 章开始使用这个设定） |
    | chapter_to   | `NULL`                               |
    | is_current   | `true`                               |
    | payload_json | v2 版本人物卡（见下）                |

    v2 的 `payload_json` 示例：

    ```json
    {
      "name": "艾琳",
      "age": 17,
      "origin": "北境小村庄",
      "occupation": "龙骑士学徒",
      "personality_tags": ["坚定", "善良", "更有决心"],
      "abilities": ["能听见龙的低语", "与幼龙签订契约，可以短暂驾驭龙火"],
      "current_status": "在王都战役后被授予龙骑士学徒身份，开始接受正式训练",
      "relationships": [
        { "target": "char_kael", "type": "并肩战友", "description": "共同经历王都保卫战后关系更紧密" }
      ]
    }
    ```

    现在，你已经在数据库层准确记录了：

    - 第 1–11 章：艾琳还是“胆小村姑”版本；
    - 第 12 章及之后：艾琳是“龙骑士学徒”版本。

    ------

    ### （2）同步更新向量库

    同样，后端拿 v2 这份 JSON，重新做一段文本 summary + embedding：

    `text` 示例：

    > “角色设定：艾琳，17 岁的龙骑士学徒，出身北境小村庄。性格依然善良，但变得更加坚定、有决心。她已在王都战役中与幼龙签订契约，可以使用龙火战斗。当前正在王都接受龙骑士训练，与骑士凯尔共同经历生死后，关系升级为并肩战友。”

    向量库中新增一条记录：

    | 字段                  | 值                                       |
    | --------------------- | ---------------------------------------- |
    | id                    | `"char_elin#2"`                          |
    | vector                | `[0.0901, -0.3011, 0.5333, ...]`（示意） |
    | text                  | v2 的设定 summary                        |
    | metadata.project_id   | `proj_dragon_001`                        |
    | metadata.entity_type  | `"character"`                            |
    | metadata.entity_id    | `"char_elin"`                            |
    | metadata.version      | `2`                                      |
    | metadata.chapter_from | `12`                                     |
    | metadata.chapter_to   | `null`                                   |
    | metadata.is_current   | `true`                                   |

    同时你可以选择两种策略之一处理 v1 对应向量：

    - **保留 v1 向量但把 `is_current` 设为 false（推荐）**
    - 或在不需要“按旧设定回放”的项目里，直接把 `"char_elin#1"` 从向量库删除（不推荐用在长篇上）。

    ------

    ## 3. 写第 8 章和第 15 章时，RAG 的流转过程

    接下来是你真正关心的：“写正文时这两套数据怎么协作”。

    ### 3.1 写第 8 章时（应当拿到 v1 版本）

    **前端“写作面板”的动作：**

    你在 UI 上选择：

    - 当前项目：`proj_dragon_001`
    - 当前章节：`8`
    - 参与人物：`艾琳 char_elin`，`凯尔 char_kael`
    - 场景：`王都·贫民区夜战`

    然后点击「生成下一段」。

    ------

    **后端的 RAG 步骤（简化版）：**

    ### 第一步：构造检索条件

    后端根据这些信息构造一个检索请求，例如：

    - 用一个小 LLM 把“当前要写的场景 + 参与人物”压成一段 query 文本：

      > “第 8 章，王都贫民区夜战，主角艾琳与骑士凯尔共同作战，需要他们当前性格、关系以及近期相关事件。”

    - 对这段 query 文本算一个 embedding（记为 `q_vector`）。

    ------

    ### 第二步：向量库检索（带 metadata 过滤）

    向量库支持“向量相似度 + metadata 过滤”的组合检索，比如：

    - `project_id = proj_dragon_001`（只查这本书）；
    - `entity_type in ["character", "world", "timeline"]`；
    - `chapter_from <= 8`；
    - `chapter_to is null or chapter_to >= 8`；

    这个过滤条件刚好保证：

    - 对于艾琳：
      - v1：`chapter_from = 1, chapter_to = 11` → 命中；
      - v2：`chapter_from = 12` → 不命中（因为 12 > 8）。
    - 将来如果你有“王都贫民区”这个世界观条目，它也会落到相应章节范围里被检索出来。

    像 Qdrant / Pinecone 等向量库，都支持这种 metadata filtering 语义。([Qdrant](https://qdrant.tech/documentation/concepts/filtering/?utm_source=chatgpt.com))

    返回的 top-k 结果里，你会看到类似列表：

    1. `"char_elin#1"`：艾琳 v1 设定 summary
    2. `"char_kael#1"`：凯尔 v1 设定 summary
    3. `"world_capital_slum#1"`：王都贫民区设定
    4. `"timeline_capital_attack#1"`：王都战役时间线摘要

    这些结果本身已经是“可读文本”，其实可以**直接塞进 LLM 上下文**。

    > 到这里，其实你已经看到关系库的作用了：
    >
    > - `chapter_from / chapter_to / is_current` 这些字段是**在关系库里定义和维护**的；
    >
    > - 向量库只是把这些字段复制成 metadata，用来过滤检索。
    >
    >   也就是说：**版本与时间范围的“真相”在关系库，向量库只是带过滤的高速查找器。**

    ------

    ### 第三步（可选）：根据 ID 去关系库拉更细的结构化信息

    有的场景下，你希望 LLM 不只是看 summary，还能看到更结构化的数据：

    - 比如：
      - 角色精确年龄；
      - 装备列表；
      - 还没在 summary 里写全的自定义字段。

    这时后端可以拿着向量结果的 `entity_id + version` 回到关系库查：

    ```sql
    SELECT payload_json
    FROM character_version
    WHERE project_id = 'proj_dragon_001'
      AND character_id = 'char_elin'
      AND version = 1;
    ```

    然后决定：

    - 直接把 `payload_json`（转成好看的文本）也一起塞给 LLM；
    - 或者只把其中部分字段（例如性格标签、能力）整理进 prompt。

    ------

    ### 第四步：拼装 Prompt，调用 LLM

    最后，后端把上下文打包成类似：

    ```
    系统指令：你是本书的联合作者……
    当前章节：第 8 章，王都贫民区夜战……
    设定摘要：
    - 艾琳（第 1–11 章设定）：……
    - 凯尔（当前设定）：……
    - 王都贫民区设定：……
    - 王都战役时间线（至第 8 章）：……
    用户当前草稿：……
    请继续写出这一段，不要违背以上设定。
    ```

    LLM 写出来的东西，自然就和“第 8 章的艾琳”对齐，而不会用到 v2 的龙骑士设定。

    ------

    ### 3.2 写第 15 章时（自动切到 v2）

    当你写到第 15 章，再点“生成下一段”时：

    - 前端告诉后端：`chapter = 15`；
    - 其他流程**完全一样**，只是过滤条件变成：
      - `chapter_from <= 15`
      - `chapter_to is null or chapter_to >= 15`

    这时：

    - 艾琳 v1：`chapter_to = 11` → 不再命中；
    - 艾琳 v2：`chapter_from = 12`，`chapter_to = null` → 命中；

    于是向量库返回的是 `"char_elin#2"` 这一条设定摘要。

    LLM 自然就会按照“龙骑士学徒”的版本来写。

    你不需要在 prompt 里硬写：

    > “注意：艾琳从 12 章开始变成龙骑士……”

    系统通过数据库 + RAG 自动帮你选到了正确版本。

    ------

    ## 4. 从视角角度看一眼整个数据流（Mermaid 流程图）

    再用一张简化流程图，把“写设定 / 改设定 / 生成正文”三个阶段串起来，你脑子里会更清楚一点：

    ```mermaid
    flowchart TD;
    client_edit[作者编辑或创建人物卡];
    client_write[作者点击“生成正文”];
    api_server[写作后端 API 服务];
    rel_db[关系型数据库<br/>Postgres/MySQL];
    vec_db[向量库<br/>Qdrant/pgvector/Pinecone];
    llm[LLM 写作模型];
    
    client_edit --> api_server;
    api_server -->|写入/更新角色版本表<br/>payload_json + 版本 + 章节范围| rel_db;
    api_server -->|根据最新payload_json<br/>生成summary文本+embedding<br/>写入/更新向量记录| vec_db;
    
    client_write --> api_server;
    api_server -->|构造检索query + 章节过滤条件| vec_db;
    vec_db -->|返回相关设定summary文本<br/>+ entity_id/version/metadata| api_server;
    api_server -->|如需详细结构化信息时，按<br/>entity_id/version回查payload_json| rel_db;
    api_server -->|把summary + 结构化设定 + 当前大纲/草稿<br/>打包成prompt| llm;
    llm -->|生成章节内容| api_server;
    api_server --> client_write;
    ```

    > 可以看到：
    >
    > - 写/改设定 → 先更新关系库 → 再同步向量库；
    > - 写正文 → 先向量检索 → 再必要时回查关系库 → 最后送进 LLM。

    ------

    ## 5. 小结一下“协作关系”

    用一句话概括：

    > 关系型数据库 = 设定的“权威真相 + 版本 + 章节范围”； 向量库 = 带过滤条件的“设定搜索引擎 + RAG 文本入口”。

    具体协作方式就是：

    1. **写入/修改时：**
       - 在关系库里插入一条新的“版本记录”（带 `chapter_from / chapter_to / is_current`）；
       - 由后端把这一条记录总结成一段文本 + embedding，同步到向量库，对应同一个 `entity_id + version`。
    2. **生成正文时：**
       - 根据“当前章节 / 场景 / 参与人物”构造 query；
       - 在向量库中做“向量相似度 + metadata 过滤”检索，锁定**当前故事时间点应该使用的设定版本**；
       - 直接用向量库返回的 summary 文本做 RAG（必要时再用 `entity_id + version` 回关系库拿结构化详情）。

    ------

    如果你觉得这套模拟还不够“落地到代码”，下一步我可以帮你：

    - 直接用 Postgres + pgvector 画出**完整 SQL 表结构**；
    - 再用伪代码写出两个 API：
      - `POST /characters/update`：更新人物卡时如何同时更新两套库；
      - `POST /chapters/{id}/generate`：生成章节时如何从向量库 + 关系库拉设定，拼成 prompt。