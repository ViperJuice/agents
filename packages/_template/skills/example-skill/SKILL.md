---
name: example-skill
description: Example skill for the Pi agent template.
---

# Example Skill

Replace this skill with the agent's operational contract.

## When to Use

- Operator asks Pi to run this agent's workflow
- A harness dispatches work that maps to this skill

## Tools

- `example_echo` — placeholder; swap for real extension tools

## Rules

1. Keep tool calls bounded and explicit.
2. Do not bypass harness guardrails or phase-loop state when supervising pipelines.
3. Prefer structured tool output over shell improvisation.
