---
title: Memory Vault — Home
tags: [index, moc]
updated: 2026-08-07
---

# 🗄️ Memory Vault

Open this folder as an **Obsidian vault** (`Open folder as vault` → select `memory/`).
Every note is Markdown with `[[wiki-links]]`, so use the Graph View to navigate.

> Purpose: capture **everything we do** in detail so the codebase never has to be
> re-read from scratch. Update the relevant note whenever something changes.

## 🗺️ Map of content

- [[Project-Overview]] — what this system is, the big picture
- [[Roles-and-Permissions]] — the 4 Keycloak roles and what each can do
- [[Frontend-Architecture]] — Angular app: stack, structure, routing, design system
- [[Frontend-Components]] — detailed, file-by-file breakdown of every UI component
- [[Backend-and-Infra]] — microservices, Keycloak, observability, infra tooling
  - [[Roaming-Analysis-Service]] — roaming events + risk scoring API (port 9002)
- [[Git-Workflow-and-History]] — branches, what was deleted, commit rules ⚠️
- [[Session-Log]] — chronological log of what we did each session
- [[Next-Steps]] — open threads and the backlog

## ⚠️ Golden rules

1. **The user commits/pushes themselves.** Never run `git commit` / `git push` unless
   explicitly asked — give the commands instead. See [[Git-Workflow-and-History]].
2. Read [[Project-Overview]] + [[Frontend-Architecture]] before touching code.
3. When you finish a change, update the matching note and add an entry to [[Session-Log]].
