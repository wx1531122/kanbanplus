**产品需求文档 (PRD)**

**1. 项目概述**

* **项目名称：** 增强型看板协作平台 (Project Kanban Enhanced Collaboration Platform)
* **版本：** 1.0.0
* **文档版本：** 1.0
* **创建日期：** 2025年5月24日
* **创建者：** AI产品助手 
* **PRD目的：** 本文档旨在明确增强型看板协作平台V1.0.0版本的产品需求、功能规格、技术要求、测试策略和部署方案，为项目团队的开发、测试和上线工作提供清晰的指导。
* **项目简介：** 本项目是一个功能完善的看板应用程序，用于管理项目、阶段、任务和子任务。它提供了一种可视化的方式来跟踪项目从构思到完成的整个过程。V1.0.0版本将在现有基础上，重点增加用户认证授权、基础协作功能、任务管理深化，并集成GitHub Actions实现CI/CD流程，最终通过Docker Compose实现前后端统一编排部署。

**2. 项目目标**

* **产品目标：**
    * 提供一个安全、多用户隔离的看板管理环境。
    * 实现基础的团队协作功能，提升信息共享和沟通效率。
    * 增强任务管理的精细度和实用性。
    * 确保系统稳定、易用，并提供流畅的用户体验。
    * 实现自动化构建、测试和部署流程，提高开发效率和交付质量。
* **用户目标：**
    * 个人用户能够安全地创建和管理私有项目。
    * 团队用户能够在一个共享的项目空间内进行协作，跟踪任务进展。
    * 用户能够通过评论、截止日期等功能更有效地管理和沟通任务。

**3. 目标用户**

* **个人开发者/自由职业者：** 需要可视化工具管理个人项目和任务。
* **小型敏捷团队：** 需要一个轻量级、易于上手的协作看板工具来管理迭代和日常工作。
* **学生或教育者：** 用于课程项目管理或教学演示。

**4. 核心假设与约束**

* **假设：**
    * 项目团队具备React、Flask、Python、Docker等相关技术的开发能力。
    * 项目将托管在GitHub，并利用GitHub Actions进行CI/CD。
    * 用户对看板的基本概念和使用方式有一定了解。
* **约束：**
    * **数据库：** 后端将继续使用SQLite数据库。
    * **技术栈：** 前端使用React (Vite)，后端使用Flask (Python)。
    * **资源：** 项目资源（人力、时间）有限，优先实现核心增强功能。

**5. 项目范围 (V1.0.0)**

**5.1. In Scope (核心功能模块)**

* **5.1.1. 用户认证与授权模块 (P0 - 最高优先级)**
    * 用户注册（邮箱/用户名、密码）
    * 用户登录（邮箱/用户名、密码）、登出
    * 密码加密存储 (例如使用 Werkzeug security helpers)
    * 基于会话或Token (如JWT) 的用户状态管理
    * 受保护的API路由，仅认证用户可访问其数据
    * 项目与用户创建者关联
* **5.1.2. 现有看板核心功能保留与优化**
    * 项目管理：创建、查看列表、查看详情、修改信息、删除。
    * 阶段管理：创建、重命名、拖拽排序、删除。
    * 任务管理：创建、编辑、拖拽排序（阶段内和跨阶段）、删除。
    * 子任务管理：创建、编辑内容、切换完成状态、删除。
    * 所有操作与当前登录用户的数据隔离。
* **5.1.3. 基础协作功能增强 (P1 - 高优先级)**
    * **任务评论：**
        * 用户可在任务详情下发表评论。
        * 显示评论者、评论内容和评论时间。
        * （V1.0 暂不实现 @提及 和实时通知，作为未来迭代）
    * **任务负责人 (Assignee)：** 保持为文本字段，用户可手动填写。
    * **基础活动日志：**
        * 记录关键操作（如任务创建、移动、完成、评论添加）的发生者和时间。
        * 在项目或任务详情页展示活动流。
* **5.1.4. 任务管理深化 (P1 - 高优先级)**
    * **截止日期 (Due Date)：** 为任务添加截止日期字段（日期选择）。
    * **任务优先级 (Priority)：** 为任务添加优先级字段（如：高、中、低 - 下拉选择）。
    * **标签/分类 (Tags/Labels)：**
        * 允许为任务添加一个或多个文本标签。
        * （V1.0 暂不实现标签管理和基于标签的复杂筛选，作为未来迭代）
* **5.1.5. 用户界面与体验 (P1 - 高优先级)**
    * 保持响应式设计，适配桌面、平板、移动设备。
    * 清晰的加载状态和用户友好的错误提示。
    * 针对新功能（用户系统、评论、新任务字段）的UI调整。
* **5.1.6. Docker化与统一编排部署 (P0 - 最高优先级)**
    * 前端：React应用 + Nginx，通过Dockerfile构建镜像。
    * 后端：Flask应用，通过Dockerfile构建镜像。
    * 使用 `docker-compose.yml` 实现本地开发和生产环境的一键启动、服务编排、网络配置和数据持久化（针对SQLite数据库文件）。
    * Nginx作为前端静态资源服务器，并反向代理后端API请求。
* **5.1.7. CI/CD 与 GitHub Actions (P0 - 最高优先级)**
    * **后端CI：**
        * 代码规范检查 (如Flake8)。
        * 单元测试与集成测试 (Pytest)。
        * 自动构建后端Docker镜像。
    * **前端CI：**
        * 代码规范检查 (如ESLint)。
        * 单元测试 (如Jest/React Testing Library)。
        * 自动构建前端应用 (npm run build)。
        * 自动构建前端Docker镜像。
    * **触发机制：** `push` 到 `main` 分支和创建指向 `main` 分支的 `pull_request`时触发。
    * **镜像推送 (可选配置)：** 构建成功后，自动将Docker镜像推送到GitHub Container Registry (GHCR)。

**5.2. Out of Scope (V1.0.0)**

* 复杂的项目权限管理 (如角色细分、成员邀请与管理)。
* 实时协作特性 (如WebSockets实现的实时更新、多人同时编辑)。
* 高级看板功能 (如WIP限制、泳道、自定义字段)。
* 文件附件上传。
* 日历视图、甘特图等高级视图。
* 站内通知系统、邮件通知。
* OAuth第三方登录 (如Google, GitHub登录)。
* 多语言支持。
* 性能基准测试与大规模并发优化 (超出SQLite常规预期)。
* 完整的后台管理系统。

**6. 用户故事 / 功能需求详述**

**6.1. 用户认证与授权**

* **US1.1 (注册):** 作为一个新访客，我希望能够使用唯一的用户名（或邮箱）和密码注册一个新账户，以便我可以创建和管理我自己的看板项目。
* **US1.2 (登录):** 作为一个已注册用户，我希望能够使用我的用户名（或邮箱）和密码登录系统，以便我可以访问我的项目和任务。
* **US1.3 (登出):** 作为一个已登录用户，我希望能够安全地登出系统，以保护我的账户信息。
* **US1.4 (数据隔离):** 作为一个已登录用户，我创建的项目、阶段、任务和子任务应仅对我可见和可管理（除非未来实现共享功能），其他用户无法访问我的数据。
* **US1.5 (密码安全):** 作为一名用户，我希望我的密码在存储时是经过强加密处理的，以防止泄露。

**6.2. 基础协作**

* **US2.1 (任务评论):** 作为一个项目参与者，我希望能在任务详情中查看已有评论，并发表新的评论（包含文本内容、评论人、评论时间），以便就任务细节进行讨论和信息同步。
* **US2.2 (活动日志):** 作为一个项目参与者，我希望能在项目或任务层面看到关键操作的记录（谁在什么时间做了什么），以便了解动态和追溯变更。

**6.3. 任务管理深化**

* **US3.1 (截止日期):** 作为一个任务管理者，我希望能够为任务设置一个截止日期，并在任务卡片或详情中清晰展示，以便更好地规划和跟踪任务时效。
* **US3.2 (任务优先级):** 作为一个任务管理者，我希望能够为任务设置优先级（如高、中、低），并在看板上通过某种视觉方式（如颜色标记）区分，以便团队能够优先处理重要任务。
* **US3.3 (任务标签):** 作为一个任务组织者，我希望能够为任务添加一个或多个文本标签，以便对任务进行初步分类和识别。

*(其他核心看板功能的用户故事可参考通用看板应用，此处不再赘述，重点是新增功能)*

**7. 非功能性需求**

* **7.1. 性能：**
    * 页面首次加载时间（主要内容可见）：桌面端 < 3秒，移动端 < 5秒（良好网络条件下）。
    * API平均响应时间：对于常规CRUD操作 < 500ms。
    * 看板内拖拽操作应流畅，无明显卡顿。
* **7.2. 安全性：**
    * 用户密码必须使用强哈希算法加盐存储。
    * 防止常见的Web漏洞，如XSS（对所有用户输入进行转义/清理）、CSRF（如果使用Cookie会话）。
    * API接口应有权限校验，确保用户只能操作其有权访问的数据。
    * HTTPS部署（在实际生产环境推荐，通过Nginx配置）。
* **7.3. 可用性：**
    * 界面简洁直观，易于上手。
    * 在不同屏幕尺寸下（桌面、平板、手机）均能良好显示和操作（响应式设计）。
    * 提供明确的加载指示和错误反馈信息。
    * 关键操作应有二次确认（如删除项目/阶段/任务）。
* **7.4. 可靠性：**
    * 系统应能长时间稳定运行，核心功能无严重Bug。
    * 数据操作应具有一致性，避免数据丢失或错乱。
    * SQLite数据库文件应有备份机制（通过部署策略实现）。
* **7.5. 可维护性：**
    * 代码结构清晰，遵循各自技术栈的最佳实践。
    * 前后端代码有适当的注释。
    * API接口文档（已有基础，需更新）清晰，方便联调和维护。
    * CI/CD流程确保代码变更的质量和可追溯性。
* **7.6. 可扩展性：**
    * 代码设计应考虑未来功能的扩展，模块化设计。
    * （SQLite在并发写入方面有天然限制，大规模用户扩展时可能需要考虑数据库迁移）。
* **7.7. 兼容性：**
    * 前端应兼容主流现代浏览器最新版本（Chrome, Firefox, Safari, Edge）。

**8. 设计与用户体验 (UX) 指南 (高阶)**

* 遵循简约、直观的设计原则。
* 色彩搭配应考虑可读性和视觉舒适度。
* 交互元素（按钮、表单、拖拽）应有明确的视觉反馈。
* 错误提示应友好且具有指导性。
* 加载过程应有明确的加载动画或提示，避免用户等待焦虑。
* 整体风格与现有前端描述保持一致。

**9. 技术规格概要**

* **9.1. 前端：**
    * 框架/库：React (Vite构建工具)
    * 状态管理：Context API 或轻量级状态管理库 (如Zustand, Jotai)，根据团队熟悉度和项目复杂度决定。
    * API通讯：Axios 或 Fetch API。
    * UI组件库：(可选，如MUI, Ant Design, Tailwind CSS自行构建，或沿用现有风格)。
    * 代码规范：ESLint, Prettier。
* **9.2. 后端：**
    * 框架：Flask (Python 3.10+)
    * 数据库：SQLite
    * ORM：Flask-SQLAlchemy
    * 数据库迁移：Flask-Migrate
    * API实现：Flask-RESTful 或 Blueprint + Marshmallow (用于序列化/反序列化和验证)。
    * 认证：Flask-Login 或 JWT (如PyJWT) 配合自定义逻辑。
    * 代码规范：Flake8, Black。
* **9.3. API设计：**
    * 遵循RESTful原则。
    * 数据交换格式：JSON。
    * API文档：基于现有规范进行更新，包含新增的用户、评论等相关接口。
    * 所有API路径前缀为 `/api`。
* **9.4. 数据库模型 (概要，详见`app/models.py`):**
    * `User`: (新增) id, username, email, password_hash, created_at, updated_at.
    * `Project`: id, name, description, created_at, updated_at, `user_id` (外键关联User).
    * `Stage`: id, name, project_id, order, created_at, updated_at.
    * `Task`: id, content, stage_id, assignee (string), `start_date` (date), `end_date` (date), `priority` (string), order, created_at, updated_at.
    * `SubTask`: id, content, parent_task_id, completed, order, created_at, updated_at.
    * `Comment`: (新增) id, content, task_id, user_id, created_at, updated_at.
    * `ActivityLog`: (新增) id, action_type (string), description, user_id, project_id (optional), task_id (optional), created_at.
    * `Tag`: (新增, 简单实现) id, name.
    * `TaskTag`: (新增, 关联表) task_id, tag_id.

**10. 开发工作流与CI/CD**

* **10.1. 版本控制：**
    * 使用 Git 进行版本控制。
    * 代码托管于 GitHub。
* **10.2. 分支策略 (建议):**
    * `main` (或 `master`): 稳定的生产分支。
    * `develop`: 集成开发分支（可选，对于小型团队可以直接从 `main` 创建特性分支）。
    * `feature/<feature-name>`: 开发新功能的分支，从 `develop` 或 `main` 创建。
    * `bugfix/<bug-name>`:修复bug的分支。
    * 所有特性和修复分支通过 Pull Request (PR) 合并到 `develop` 或 `main`，PR需要代码审查 (Code Review)。
* **10.3. GitHub Actions CI/CD:**
    * **触发条件：** `push` 到 `main` (或 `develop`) 分支；创建/更新指向 `main` (或 `develop`) 的PR。
    * **后端工作流 (`backend-ci.yml`):**
        * Checkout code.
        * Set up Python environment.
        * Install dependencies (cached).
        * Run Linters (Flake8, Black).
        * Run Tests (Pytest, with appropriate environment variables for testing database, potentially using GitHub Secrets).
        * Build Docker image (e.g., `kanban-backend:latest`, `kanban-backend:<git-sha>`).
        * (Optional) Push Docker image to GHCR on `main` branch push.
    * **前端工作流 (`frontend-ci.yml`):**
        * Checkout code.
        * Set up Node.js environment.
        * Install dependencies (cached).
        * Run Linters (ESLint, Prettier).
        * Run Tests (Jest/RTL).
        * Build static assets (`npm run build`).
        * Build Docker image (e.g., `kanban-frontend:latest`, `kanban-frontend:<git-sha>`).
        * (Optional) Push Docker image to GHCR on `main` branch push.
    * **Secrets Management:** API keys, `SECRET_KEY`, database credentials for CI (if not using ephemeral test DBs), Docker registry credentials (if not using `GITHUB_TOKEN` for GHCR) should be stored as GitHub Actions Secrets.

**11. 测试策略**

* **11.1. 单元测试：**
    * **后端 (Pytest):** 针对模型、工具函数、业务逻辑服务、API端点的独立单元进行测试。目标覆盖率 > 80%。
    * **前端 (Jest, React Testing Library):** 针对React组件的渲染、交互和状态逻辑进行测试。目标覆盖率 > 70%。
* **11.2. 集成测试：**
    * **后端 (Pytest):** 测试API端点与其依赖服务（如数据库交互）的集成。验证请求处理、数据校验、响应格式和状态码。
* **11.3. 端到端测试 (E2E - 可选，根据资源):**
    * 使用 Cypress 或 Playwright 模拟用户真实操作流程，覆盖关键用户场景（如用户注册登录、创建项目、任务拖拽等）。
* **11.4. 用户验收测试 (UAT):**
    * 在功能开发完成后，由产品负责人或实际用户（如果可能）进行测试，确保功能符合需求和预期。
* **11.5. 手动测试：**
    * 针对复杂交互、UI兼容性、响应式布局等进行探索性测试。
* **11.6. 测试环境：**
    * CI环境应使用独立的测试数据库配置。
    * 本地开发环境使用 `docker-compose` 模拟生产环境。
    * (可选) 部署到预发布/Staging环境进行更全面的测试。

**12. 部署策略**

* **12.1. 环境：**
    * **本地开发环境：** 使用 `docker-compose.yml` 启动前端和后端服务，实现热加载和便捷调试。SQLite数据库文件通过volume挂载持久化。
    * **生产环境 (目标是云服务器/VM):**
* **12.2. 部署工具：** Docker, Docker Compose。
* **12.3. 部署步骤 (手动/脚本化，未来可集成到CD流程):**
    1.  **服务器准备：**
        * 安装 Docker Engine 和 Docker Compose。
        * 配置防火墙，开放所需端口 (如 80 for HTTP, 443 for HTTPS, SSH port)。
    2.  **代码/镜像获取：**
        * **方式一 (构建在服务器)：** `git clone` 最新代码到服务器，然后运行 `docker-compose build` (如果 `docker-compose.yml` 中服务定义了 `build` 指令)。
        * **方式二 (拉取预构建镜像)：** 如果CI已将镜像推送到GHCR或 Docker Hub，服务器上只需 `docker-compose pull`。`docker-compose.yml` 中的 `image` 指令应指向镜像仓库。
    3.  **配置管理：**
        * 通过 `.env` 文件管理生产环境变量 (如 `DATABASE_URL=sqlite:///./instance/kanban_prod.db`, `SECRET_KEY`, `FLASK_ENV=production`)。此文件不应提交到Git，应在服务器上手动创建或通过安全方式分发。
        * `docker-compose.yml` 中可以通过 `env_file` 指令加载 `.env` 文件。
    4.  **启动应用：**
        * `docker-compose up -d` 启动所有服务。
    5.  **Nginx 配置 (由前端Dockerfile和`nginx.conf`管理):**
        * `frontend/nginx.conf` 应配置为：
            * 监听80端口。
            * 服务前端静态文件 (React build output)。
            * 反向代理 `/api/*` 和 `/hello` 请求到后端容器 (e.g., `proxy_pass http://backend:5000;`，`backend` 是`docker-compose.yml`中定义的服务名，5000是后端容器端口)。
            * 配置SPA路由 `try_files $uri $uri/ /index.html;`。
            * (生产环境) 配置HTTPS：获取SSL证书 (如Let's Encrypt)，更新Nginx配置监听443，并设置HTTP到HTTPS的重定向。
    6.  **数据持久化：**
        * `docker-compose.yml` 中为后端服务的SQLite数据库文件所在目录配置volume，确保数据在容器重启或更新后依然存在。推荐使用Docker命名卷。
* **12.4. 更新与回滚：**
    * **更新：** 拉取新代码/镜像 -> `docker-compose build` (如果需要) -> `docker-compose pull` (如果需要) -> `docker-compose up -d --remove-orphans`。
    * **回滚 (基于镜像标签)：** 如果使用唯一镜像标签（如commit SHA），可以修改 `docker-compose.yml` 中的镜像标签到上一个稳定版本，然后重新 `docker-compose up -d`。

**13. 成功指标 (V1.0.0)**

* 所有列于 "In Scope" 的功能按规格成功实现并通过测试。
* 用户能够成功注册、登录并管理其看板数据。
* CI/CD流程能够自动化执行代码检查、测试和镜像构建。
* 应用能够通过 Docker Compose 成功部署并稳定运行。
* （如果对外发布）用户反馈：正面反馈为主，关键功能无重大阻碍性问题。

**14. 未来展望 (V1.0.0之后)**

* 实现用户间的项目共享与协作（成员邀请、角色管理）。
* 增强实时协作特性（WebSockets）。
* 文件附件上传功能。
* 高级看板视图（日历、WIP限制、泳道）。
* 完整的通知系统。
* OAuth2.0 第三方登录。
* 性能优化和数据库迁移（如PostgreSQL）以支持更大规模用户。
* A/B 测试新功能。
* 完善的后台管理功能。

**15. 词汇表**

* **CI (Continuous Integration):** 持续集成
* **CD (Continuous Delivery/Deployment):** 持续交付/部署
* **PRD (Product Requirements Document):** 产品需求文档
* **GHCR (GitHub Container Registry):** GitHub容器镜像仓库
* **JWT (JSON Web Token):** 一种开放标准 (RFC 7519)，它定义了一种紧凑且自包含的方式，用于在各方之间作为JSON对象安全地传输信息。
* **SPA (Single Page Application):** 单页应用
* **ORM (Object-Relational Mapping):** 对象关系映射
