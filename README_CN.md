# @custom/dsh-plugin-j-space (J-Space 认知控制套件)

[![DeepSeek Harness](https://img.shields.io/badge/DSH-Plugin-blue.svg)](https://github.com/deepseek-ai/deepseek-harness)
[![J-Space Suite](https://img.shields.io/badge/J--Space-v3.6-emerald.svg)](https://github.com/Tiger3807861189/J-Space-Cognition-Suite-V3.6)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey.svg)](#-安装与部署指南)
[![i18n](https://img.shields.io/badge/i18n-EN%20%7C%20%E4%B8%AD%E6%96%87-purple.svg)](#-多语言支持-i18n)

[English Documentation](README.md) | 简体中文说明

**J-Space Cognition Suite (V3.6)** 是专为 **DeepSeek Harness (DSH)** 研发的推理时认知控制插件。旨在为 **DeepSeek（V4-Pro / Flash）及 Kimi 等大模型**在复杂长程任务、深度代码重构与严密逻辑推理中，提供模型不可知的**工作空间管控、抗表征漂移与稠密自验机制**。

---

## 🌟 为什么需要 J-Space？

大语言模型在长程任务（如大型代码库重构、多步调试、竞赛级问题）中，常常遇到以下 4 类推理时损失：
1. **工作集过载（Working-Set Overload）**：过多约束争抢有限注意力，导致细节遗漏。
2. **表征漂移（Representation Drift）**：目标、架构约束或类型定义在多文件流转中发生变异或“边写边忘”。
3. **无控制盲目重试（Uncontrolled Retry）**：测试失败后在没有形成有效诊断假设的情况下盲目修改代码。
4. **过早完成（Premature Completion）**：将流畅自然的文本输出误判为已经过严格验证的最终交付物。

**J-Space** 将模型内部可访问的工作表征组织为一个可主动管理的工作空间（J-Space），**无需微调权重、不引入隐藏开销**，纯通过推理时控制协议释放模型真正潜能。

---

## ⚙️ 6 大核心认知机制

| 核心模块 | 运行机制 | 核心成效 |
| :--- | :--- | :--- |
| **广播枢纽 (Broadcast Hub)** | 关键约束与架构锚点只推导一次并全局广播 | 彻底避免跨文件、跨步骤时的表征漂移 |
| **稠密轨 (Dense Track)** | `✓ / ? / ✗` 符号寄存器步进验证，支持无损展开为自然语言 | 强制步进证伪，杜绝幻觉推导 |
| **聚焦控制 (Directed Focus)** | 活动工作台严格限制在 1~2 个关键表征 | 杜绝工作集过载与注意力稀释 |
| **结论前桥接 (Bridge Reasoning)** | 中间逻辑推导必须先于消费它的结论进入激活态 | 根除“先猜结论、再编理由”的后验合理化 |
| **自我监控 (Self-Monitoring)** | 实时检测推理退化与逻辑断裂信号 | 发现偏差立即携带诊断假设回滚修复 |
| **断点记账 (Workspace Ledger)** | 持久化状态外化工具 (`jspace.py`) | 在多轮对话与子智能体接缝间无缝保持状态 |

---

## 🚀 安装与部署指南

全面支持 **macOS**、**Linux**、**Windows** 以及 **云端服务器 / Docker 容器**。

### 方式一：DSH CLI 命令（推荐：本地与服务器通用）

在任意已安装 DSH 的终端或项目目录中直接运行：

```bash
# 从 GitHub 仓库一键安装
dsh plugin add github:kolawong/dsh-plugin-j-space

# 或本地路径链接
dsh plugin add ./dsh-plugin-j-space
```

### 方式二：手动配置方式（本地与服务器通用）

如果你希望手动克隆到个人配置目录（`~/.dsh`）：

**macOS / Linux 用户：**
```bash
# 1. 克隆至个人 DSH 插件目录
mkdir -p ~/.dsh/plugins ~/.dsh/skills
git clone https://github.com/kolawong/dsh-plugin-j-space.git ~/.dsh/plugins/dsh-plugin-j-space

# 2. 软链接技能目录
ln -sfn ~/.dsh/plugins/dsh-plugin-j-space/skills/j-space ~/.dsh/skills/j-space

# 3. 重启 DSH
# 本地桌面端/CLI：重新启动 dsh web 或应用窗口
# 服务器守护进程：systemctl restart deepseek-harness
```

**Windows 用户（PowerShell）：**
```powershell
# 1. 克隆至用户 DSH 插件目录
New-Item -ItemType Directory -Force -Path "$HOME\.dsh\plugins", "$HOME\.dsh\skills"
git clone https://github.com/kolawong/dsh-plugin-j-space.git "$HOME\.dsh\plugins\dsh-plugin-j-space"

# 2. 创建技能目录软链接
New-Item -ItemType Junction -Path "$HOME\.dsh\skills\j-space" -Target "$HOME\.dsh\plugins\dsh-plugin-j-space\skills\j-space"

# 3. 重启你的 DSH 进程
```

---

## 🎛️ 4 档激活时机与运行模式

可在 DSH Web 界面（**设置 ➔ 插件 ➔ J-Space 认知控制套件**）随时可视化切换，或在 `~/.dsh/settings.yaml` 中配置：

```yaml
j-space:
  mode: on-demand # 选项: on-demand (按需) | always-on (打开) | auto (自动) | off (关闭)
```

- **🎯 按需模式 (`on-demand`) [推荐默认]**：在用户显式指令或长链推理时按需唤起，轻量且精准。
- **⚡ 常开模式 (`always-on`)**：所有对话与代码任务默认全局注入认知工作空间协议。
- **🤖 智能自动 (`auto`)**：根据任务复杂度与代码工程深度自主判定启用。
- **⛔ 停用模式 (`off`)**：完全停用认知控制套件。

---

## 💬 使用范例

在 DSH 主对话或任务看板右下角 AI 助手中：

- **自然隐式触发**：在 `on-demand` 模式下，当您提出复杂架构重构、Bug 深度排查或数学推导时，DeepSeek 会自动调用 J-Space；
- **显式强化指令**：
  > *“使用 J-Space 认知框架为我设计并验证当前模块的重构方案。”*
  > *“开启 J-Space 稠密轨，自查当前跨文件接口的一致性与边界条件。”*

---

## 🌐 多语言支持 (i18n)

插件设置卡片（`client.js`）内置智能语言检测，能够根据您的 DSH 系统语言环境与浏览器设置，**自动在中文与英文之间自适应切换**，无需手动配置。

---

## 🔬 科学背景与开源致谢声明

本项目基于语言模型内部表征可解释性研究，并将作者 **Tiger3807861189** 开源的 [J-Space Cognition Suite V3.6](https://github.com/Tiger3807861189/J-Space-Cognition-Suite-V3.6) 标准封装为 DeepSeek Harness 插件。

### 理论科学依据
- *Gurnee et al., Anthropic (2026)* — 语言模型内部工作表征空间研究（"Poised-to-say" 内部工作区）。

### 学术引用 (BibTeX)
```bibtex
@software{j_space_cognition_suite_2026,
  author = {Tiger3807861189},
  title = {J-Space Cognition Suite: Model-Agnostic Inference-Time Control Suite},
  year = {2026},
  version = {3.6.0},
  url = {https://github.com/Tiger3807861189/J-Space-Cognition-Suite-V3.6}
}
```

---

## 📄 开源协议与合规声明

本项目基于 **Apache License, Version 2.0** 开源。

- 完整许可证文本请参阅 [LICENSE](LICENSE)。
- 包含来自上游 `J-Space Cognition Suite V3.6` (c) 2026 Tiger3807861189 的组件。
- 完整的版权声明与上游致谢请参阅 [NOTICE](NOTICE) 文件。
