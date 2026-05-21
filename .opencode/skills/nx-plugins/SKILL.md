---
name: nx-plugins
description: Find and add Nx plugins. USE WHEN user wants to discover available plugins, install a new plugin, or add support for a specific framework or technology to the workspace.
---

## Finding and Installing new plugins

- Use the workspace package manager for Nx plugin commands. In this repo, prefer `npm exec -- nx ...`.
- List plugins: `npm exec -- nx list`
- Install plugins `npm exec -- nx add <plugin>`. Example: `npm exec -- nx add @nx/react`.
