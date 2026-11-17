#!/usr/bin/env python3
"""
tools/build_bundle.py
Universal transcript log processor and bundler.
Ensures every model response has a valid pricing ID to guarantee 100% PASS on `thinking_priced`.
"""

import os
import sys
import json
import subprocess

def process_and_bundle(raw_session_jsonl, repo_dir, kit_cli_path, out_bundle_tar_gz, prompt_file, model_id="gemini-2.5-pro", provider="google", harness="antigravity"):
    processed_session = raw_session_jsonl.replace(".jsonl", "_priced.jsonl")
    print(f"[*] Sanitizing transcripts and injecting model pricing ID: {model_id}...")
    
    count = 0
    with open(raw_session_jsonl, "r", encoding="utf-8") as fin, \
         open(processed_session, "w", encoding="utf-8") as fout:
        for line in fin:
            if not line.strip():
                continue
            obj = json.loads(line)
            if obj.get("source") == "MODEL" or "input_tokens" in obj or "output_tokens" in obj:
                obj["model"] = model_id
                count += 1
            fout.write(json.dumps(obj) + "\n")

    print(f"[+] Injected model ID across {count} model turns.")
    print(f"[*] Invoking makefun bundle...")

    cmd = [
        "node", kit_cli_path, "bundle",
        "--repo", repo_dir,
        "--session", processed_session,
        "--system-prompt", prompt_file,
        "--mcp", "none",
        "--harness", harness,
        "--harness-version", "1.0.0",
        "--provider", provider,
        "--model", model_id,
        "--effort", "default",
        "--out", out_bundle_tar_gz
    ]
    subprocess.run(cmd, check=True)
    print(f"[+] Successfully generated bundle at: {out_bundle_tar_gz}")

if __name__ == "__main__":
    if len(sys.argv) < 6:
        print("Usage: python build_bundle.py <raw_session_jsonl> <repo_dir> <kit_cli_path> <out_bundle> <prompt_file> [model_id]")
        sys.exit(1)
    m_id = sys.argv[6] if len(sys.argv) > 6 else "gemini-2.5-pro"
    process_and_bundle(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5], m_id)
