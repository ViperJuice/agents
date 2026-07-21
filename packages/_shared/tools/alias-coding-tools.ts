import { Type } from "typebox";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import {
  createBashTool,
  createGrepTool,
  createLsTool,
  createReadTool,
  createWriteTool,
} from "@earendil-works/pi-coding-agent";

/** Claude Code panel surface: Read + Write (file_path schema). */
export function createClaudePanelTools(cwd: string): AgentTool[] {
  const read = createReadTool(cwd);
  const write = createWriteTool(cwd);

  const Read: AgentTool = {
    name: "Read",
    label: "Read",
    description: read.description,
    parameters: Type.Object({
      file_path: Type.String({ description: "Absolute or relative path to read" }),
      offset: Type.Optional(Type.Number({ description: "1-indexed start line" })),
      limit: Type.Optional(Type.Number({ description: "Max lines to read" })),
    }),
    async execute(toolCallId, params, signal, onUpdate) {
      const { file_path, offset, limit } = params as {
        file_path: string;
        offset?: number;
        limit?: number;
      };
      return read.execute(toolCallId, { path: file_path, offset, limit }, signal, onUpdate);
    },
  };

  const Write: AgentTool = {
    name: "Write",
    label: "Write",
    description:
      "Write the final panel verdict to a file (typically panel-claude.txt in the isolated out dir).",
    parameters: Type.Object({
      file_path: Type.String({ description: "Absolute or relative path to write" }),
      content: Type.String({ description: "File contents" }),
    }),
    async execute(toolCallId, params, signal, onUpdate) {
      const { file_path, content } = params as { file_path: string; content: string };
      return write.execute(toolCallId, { path: file_path, content }, signal, onUpdate);
    },
  };

  return [Read, Write];
}

/** Grok review allow-list: read_file, grep, list_dir (native names + schemas). */
export function createGrokPanelTools(cwd: string): AgentTool[] {
  const read = createReadTool(cwd);
  const grep = createGrepTool(cwd);
  const ls = createLsTool(cwd);

  const read_file: AgentTool = {
    name: "read_file",
    label: "read_file",
    description: read.description,
    parameters: Type.Object({
      target_file: Type.Optional(Type.String({ description: "Path to read (Grok native)" })),
      path: Type.Optional(Type.String({ description: "Path alias" })),
      offset: Type.Optional(Type.Number()),
      limit: Type.Optional(Type.Number()),
    }),
    async execute(toolCallId, params, signal, onUpdate) {
      const p = params as {
        target_file?: string;
        path?: string;
        offset?: number;
        limit?: number;
      };
      const path = p.target_file ?? p.path;
      if (!path) throw new Error("read_file requires target_file or path");
      return read.execute(toolCallId, { path, offset: p.offset, limit: p.limit }, signal, onUpdate);
    },
  };

  const grepTool: AgentTool = {
    name: "grep",
    label: "grep",
    description: grep.description,
    parameters: Type.Object({
      pattern: Type.String(),
      path: Type.Optional(Type.String()),
      glob: Type.Optional(Type.String()),
      head_limit: Type.Optional(Type.Number()),
      "-A": Type.Optional(Type.Number()),
      "-B": Type.Optional(Type.Number()),
      "-C": Type.Optional(Type.Number()),
    }),
    async execute(toolCallId, params, signal, onUpdate) {
      const p = params as {
        pattern: string;
        path?: string;
        glob?: string;
        head_limit?: number;
        "-A"?: number;
        "-B"?: number;
        "-C"?: number;
      };
      const context = p["-C"] ?? (p["-A"] !== undefined || p["-B"] !== undefined
        ? Math.max(p["-A"] ?? 0, p["-B"] ?? 0)
        : undefined);
      return grep.execute(
        toolCallId,
        {
          pattern: p.pattern,
          path: p.path,
          glob: p.glob,
          limit: p.head_limit,
          context,
        },
        signal,
        onUpdate,
      );
    },
  };

  const list_dir: AgentTool = {
    name: "list_dir",
    label: "list_dir",
    description: ls.description,
    parameters: Type.Object({
      target_directory: Type.Optional(Type.String()),
      directory: Type.Optional(Type.String()),
      limit: Type.Optional(Type.Number()),
    }),
    async execute(toolCallId, params, signal, onUpdate) {
      const p = params as {
        target_directory?: string;
        directory?: string;
        limit?: number;
      };
      return ls.execute(
        toolCallId,
        { path: p.target_directory ?? p.directory, limit: p.limit },
        signal,
        onUpdate,
      );
    },
  };

  return [read_file, grepTool, list_dir];
}

/** Codex panel primary tool: exec_command (maps onto Pi bash). */
export function createCodexPanelTools(cwd: string): AgentTool[] {
  const bash = createBashTool(cwd);

  const exec_command: AgentTool = {
    name: "exec_command",
    label: "exec_command",
    description:
      "Run a shell command in a workdir (read-only review: prefer rg/sed/cat/git show; no mutating commands).",
    parameters: Type.Object({
      cmd: Type.String({ description: "Shell command" }),
      workdir: Type.Optional(Type.String({ description: "Working directory" })),
      yield_time_ms: Type.Optional(Type.Number()),
      max_output_tokens: Type.Optional(Type.Number()),
    }),
    async execute(toolCallId, params, signal, onUpdate) {
      const p = params as {
        cmd: string;
        workdir?: string;
        yield_time_ms?: number;
      };
      const command = p.workdir
        ? `cd ${JSON.stringify(p.workdir)} && ${p.cmd}`
        : p.cmd;
      const timeout =
        p.yield_time_ms !== undefined ? Math.max(1, p.yield_time_ms / 1000) : undefined;
      return bash.execute(toolCallId, { command, timeout }, signal, onUpdate);
    },
  };

  return [exec_command];
}
