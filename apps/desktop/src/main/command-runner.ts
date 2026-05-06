import { spawn } from "node:child_process";
import type { CommandRunner } from "@idris-slides/project";

export const commandRunner: CommandRunner = {
  run(command, args, options) {
    return new Promise<void>((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: options.cwd,
        stdio: ["ignore", "pipe", "pipe"]
      });
      const output: string[] = [];

      child.stdout.on("data", (chunk: Buffer) => output.push(chunk.toString()));
      child.stderr.on("data", (chunk: Buffer) => output.push(chunk.toString()));
      child.on("error", reject);
      child.on("exit", (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(new Error(`${command} ${args.join(" ")} failed with code ${code}.\n${output.join("")}`));
      });
    });
  }
};
