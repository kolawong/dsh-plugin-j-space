# @custom/dsh-plugin-j-space

[![DeepSeek Harness](https://img.shields.io/badge/DSH-Plugin-blue.svg)](https://github.com/deepseek-ai/deepseek-harness)
[![J-Space Suite](https://img.shields.io/badge/J--Space-v3.6-emerald.svg)](https://github.com/Tiger3807861189/J-Space-Cognition-Suite-V3.6)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey.svg)](#-installation)
[![i18n](https://img.shields.io/badge/i18n-EN%20%7C%20%E4%B8%AD%E6%96%87-purple.svg)](#-internationalization-i18n)

[English](README.md) | [中文说明](README_CN.md)

**J-Space Cognition Suite (V3.6)** is an inference-time cognitive control plugin designed for **DeepSeek Harness (DSH)**. It enhances the reasoning fidelity, context persistence, and verification discipline of LLMs (especially DeepSeek-V4-Pro / Flash and Kimi models) during complex, long-horizon tasks.

---

## 🌟 Why J-Space?

During long multi-step reasoning, coding, and autonomous workflows, large language models frequently suffer from four major inference-time losses:
1. **Working-Set Overload**: Too many active constraints dilute attention.
2. **Representation Drift**: Global invariants, architectural definitions, or goals gradually mutate across steps.
3. **Uncontrolled Retry**: Repeating failed routes without carrying diagnostic hypotheses.
4. **Premature Completion**: Mistaking fluent conversational output for verified execution.

**J-Space** turns the model's accessible working memory into a structured, actively managed internal workspace without changing model weights or requiring fine-tuning.

---

## ⚙️ 6 Core Cognitive Mechanisms

| Module | Mechanism | Impact |
| :--- | :--- | :--- |
| **Broadcast Hub** | Shared constraints derived once and broadcast | Prevents cross-file & cross-step representation drift |
| **Dense Track** | `✓ / ? / ✗` symbol registers with lossless plain-text expansion | Enforces stepwise falsification & rigorous self-verification |
| **Directed Focus** | Workspace limited to 1-2 active concepts | Eliminates working-set cognitive overload |
| **Bridge Reasoning** | Mandates intermediate bridging before conclusion | Eliminates conclusion-first rationalization |
| **Self-Monitoring** | Autonomously detects reasoning degeneration | Triggers rollback with explicit diagnosis |
| **Workspace Ledger** | Persistent state externalization (`jspace.py`) | Maintains durable memory across task seams & subagents |

---

## 🚀 Installation

Compatible with all operating systems (**macOS**, **Linux**, **Windows**).

### Method 1: DSH CLI (Recommended for Local & Server)

Inside your DSH profile or project workspace, run:

```bash
# Install directly from GitHub
dsh plugin add github:kolawong/dsh-plugin-j-space

# Or link from a local folder
dsh plugin add ./dsh-plugin-j-space
```

### Method 2: Manual Setup (Local / Server / Container)

If you are cloning manually into your user directory (`~/.dsh`):

**macOS / Linux:**
```bash
# 1. Clone into your DSH plugins directory
mkdir -p ~/.dsh/plugins ~/.dsh/skills
git clone https://github.com/kolawong/dsh-plugin-j-space.git ~/.dsh/plugins/dsh-plugin-j-space

# 2. Symlink skill to the global skill directory
ln -sfn ~/.dsh/plugins/dsh-plugin-j-space/skills/j-space ~/.dsh/skills/j-space

# 3. Restart DSH
# On local desktop/CLI: restart your 'dsh web' or app process
# On systemd server: systemctl restart deepseek-harness
```

**Windows (PowerShell):**
```powershell
# 1. Clone into your user profile DSH plugins directory
New-Item -ItemType Directory -Force -Path "$HOME\.dsh\plugins", "$HOME\.dsh\skills"
git clone https://github.com/kolawong/dsh-plugin-j-space.git "$HOME\.dsh\plugins\dsh-plugin-j-space"

# 2. Create directory junction for skill
New-Item -ItemType Junction -Path "$HOME\.dsh\skills\j-space" -Target "$HOME\.dsh\plugins\dsh-plugin-j-space\skills\j-space"

# 3. Restart your DSH process
```

---

## 🎛️ 4 Runtime Modes & Activation Policy

You can switch the operating mode in the DSH Web UI (**Settings ➔ Plugins ➔ J-Space**) or in `~/.dsh/settings.yaml`:

```yaml
j-space:
  mode: on-demand # Options: on-demand | always-on | auto | off
```

- **🎯 On Demand (`on-demand`) [Default]**: Automatically activated upon explicit user prompts or during complex multi-step reasoning.
- **⚡ Always On (`always-on`)**: Global cognitive workspace injected into every turn context.
- **🤖 Auto (`auto`)**: Autonomously triggered based on task complexity and code depth.
- **⛔ Off (`off`)**: Completely disables the cognitive framework.

---

## 💬 Usage Examples

In DSH conversations or Taskboard AI drawer:

- **Implicit activation**: In `on-demand` mode, the model automatically loads `j-space` when you ask for architecture refactoring, bug tracing, or theorem proving.
- **Explicit trigger**:
  > *"Use the J-Space cognitive framework to plan and verify this database migration."*
  > *"Activate J-Space Dense Track to audit cross-file consistency for the auth module."*

---

## 🌐 Internationalization (i18n)

The plugin UI card (`client.js`) features built-in automatic language detection (`English` / `中文`), adapting automatically to your DSH locale and browser language without any configuration needed.

---

## 🔬 Scientific Background & Original Attribution

This project is built upon empirical research on language-model internal representations and packages the original open-source [J-Space Cognition Suite V3.6](https://github.com/Tiger3807861189/J-Space-Cognition-Suite-V3.6) by **Tiger3807861189** as a standard DeepSeek Harness plugin.

### Scientific Foundation
- *Gurnee et al., Anthropic (2026)* — Research on privileged internal representational workspace ("poised-to-say" representations).

### Citation
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

## 📄 License & Open Source Compliance

Licensed under the **Apache License, Version 2.0** (the "License").

- You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0).
- Includes upstream work from `J-Space Cognition Suite V3.6` (c) 2026 Tiger3807861189.
- See the [LICENSE](LICENSE) and [NOTICE](NOTICE) files for complete attribution details.
