# Contributing to Copy as Markdown

我们欢迎所有形式的贡献！无论是报告 bug、提出新功能建议、改进文档还是提交代码，您的参与都将让这个项目变得更好。

[English](#english) | [中文](#中文)

## 中文

### 🚀 开始贡献

#### 环境要求

- Node.js 18+
- pnpm (推荐) 或 npm/yarn
- Git

#### 本地开发设置

1. **Fork 并克隆仓库**

```bash
git clone https://github.com/hifizz/copy-as-markdown.git
cd copy-as-markdown
```

2. **安装依赖**

```bash
pnpm install
```

3. **启动开发服务器**

```bash
# Chrome 开发模式
pnpm dev

# Firefox 开发模式
pnpm dev:firefox
```

4. **加载扩展到浏览器**
   - Chrome: 打开 `chrome://extensions/`，开启开发者模式，点击"加载已解压的扩展程序"
   - Firefox: 打开 `about:debugging`，点击"This Firefox"，点击"Load Temporary Add-on"

### 📋 贡献类型

#### 🐛 报告 Bug

发现问题？请帮助我们修复它！

**提交 Bug 报告时请包含：**

- 详细的问题描述
- 复现步骤
- 预期行为和实际行为
- 浏览器版本和操作系统
- 错误截图（如有）

#### 💡 功能建议

有好的想法？我们很乐意听取您的建议！

**提交功能建议时请包含：**

- 功能的详细描述
- 使用场景和用户价值
- 可能的实现方案（可选）
- 相关的设计稿或原型（可选）

#### 🔧 代码贡献

**开发工作流：**

1. 创建功能分支：`git checkout -b feature/your-feature-name`
2. 进行开发并测试
3. 提交代码：`git commit -m "feat: add amazing feature"`
4. 推送分支：`git push origin feature/your-feature-name`
5. 创建 Pull Request

**提交信息规范：**
我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档更新
- `style:` 代码格式化
- `refactor:` 重构代码
- `test:` 添加测试
- `chore:` 构建过程或辅助工具的变动

### 🧪 测试

确保您的代码通过所有测试：

```bash
# 运行所有测试
pnpm test

# 运行测试并查看覆盖率
pnpm test:coverage

# 运行 UI 测试
pnpm test:ui
```

### 📝 代码规范

#### TypeScript 规范

- 使用 TypeScript 进行类型检查
- 避免使用 `any` 类型
- 为函数和接口提供清晰的类型定义

#### React 规范

- 使用函数组件和 Hooks
- 遵循 React 最佳实践
- 保持组件的简洁和可复用性

#### 样式规范

- 使用 CSS 模块或 styled-components
- 遵循 BEM 命名规范
- 保持样式的一致性

### 🌍 国际化

添加新的语言支持：

1. 在 `locales/` 目录下创建新的语言文件
2. 参考现有的 `en.ts` 或 `zh.ts` 文件结构
3. 在 `locales/index.ts` 中注册新语言
4. 更新相关文档

### 📚 文档贡献

文档改进也是重要的贡献！您可以：

- 修复文档中的错误
- 添加使用示例
- 翻译文档到其他语言
- 改进 API 文档

### 🎨 设计贡献

我们也欢迎设计方面的贡献：

- UI/UX 改进建议
- 新的主题设计
- 图标和插图
- 用户体验优化

### 📞 联系我们

如果您有任何问题或建议，请通过以下方式联系我们：

- 创建 GitHub Issue
- 参与 GitHub Discussions
- 发送邮件至 [fizzstack@gmail.com]

---

## English

### 🚀 Getting Started

#### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm/yarn
- Git

#### Local Development Setup

1. **Fork and clone the repository**

```bash
git clone https://github.com/hifizz/copy-as-markdown.git
cd copy-as-markdown
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Start development server**

```bash
# Chrome development mode
pnpm dev

# Firefox development mode
pnpm dev:firefox
```

4. **Load extension into browser**
   - Chrome: Open `chrome://extensions/`, enable Developer mode, click "Load unpacked"
   - Firefox: Open `about:debugging`, click "This Firefox", click "Load Temporary Add-on"

### 📋 Types of Contributions

#### 🐛 Bug Reports

Found a bug? Help us fix it!

**When submitting a bug report, please include:**

- Detailed description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Browser version and OS
- Screenshots (if applicable)

#### 💡 Feature Suggestions

Have a great idea? We'd love to hear it!

**When submitting a feature request, please include:**

- Detailed description of the feature
- Use cases and user value
- Possible implementation approaches (optional)
- Related designs or prototypes (optional)

#### 🔧 Code Contributions

**Development workflow:**

1. Create feature branch: `git checkout -b feature/your-feature-name`
2. Develop and test
3. Commit changes: `git commit -m "feat: add amazing feature"`
4. Push branch: `git push origin feature/your-feature-name`
5. Create Pull Request

**Commit message format:**
We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation update
- `style:` code formatting
- `refactor:` code refactoring
- `test:` add tests
- `chore:` build process or auxiliary tools changes

### 🧪 Testing

Ensure your code passes all tests:

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run UI tests
pnpm test:ui
```

### 📝 Code Style

#### TypeScript Guidelines

- Use TypeScript for type checking
- Avoid `any` type
- Provide clear type definitions for functions and interfaces

#### React Guidelines

- Use functional components and Hooks
- Follow React best practices
- Keep components simple and reusable

#### Styling Guidelines

- Use CSS modules or styled-components
- Follow BEM naming convention
- Maintain consistency in styling

### 🌍 Internationalization

Adding new language support:

1. Create new language file in `locales/` directory
2. Follow existing `en.ts` or `zh.ts` file structure
3. Register new language in `locales/index.ts`
4. Update related documentation

### 📚 Documentation Contributions

Documentation improvements are valuable contributions! You can:

- Fix errors in documentation
- Add usage examples
- Translate documentation to other languages
- Improve API documentation

### 🎨 Design Contributions

We welcome design contributions too:

- UI/UX improvement suggestions
- New theme designs
- Icons and illustrations
- User experience optimizations

### 📞 Contact Us

If you have any questions or suggestions, please contact us through:

- Create GitHub Issue
- Participate in GitHub Discussions
- Send email to [fizzstack@gmail.com]

---

## 🙏 Thank You

Thank you for considering contributing to Copy as Markdown! Your contributions make this project better for everyone.

感谢您考虑为 Copy as Markdown 做出贡献！您的贡献让这个项目对每个人都更好。
