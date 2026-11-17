#!/usr/bin/env python3
"""
tools/init_anchor.py
Helper script to initialize a brand-new repository anchored to a verifiable drand beacon round.
"""

import os
import sys
import shutil
import subprocess

def init_anchor_repo(target_dir, kit_cli_path, keypair_path, starter_dir=None):
    if os.path.exists(target_dir):
        print(f"[!] Warning: Target dir {target_dir} exists. Cleaning it...")
        shutil.rmtree(target_dir)
    os.makedirs(target_dir, exist_ok=True)

    print(f"[*] Initializing beacon anchor via makefun init...")
    subprocess.run(["node", kit_cli_path, "init", "--license", "MIT", "--keypair", keypair_path], cwd=target_dir, check=True)

    if starter_dir and os.path.exists(starter_dir):
        print(f"[*] Copying starter templates from {starter_dir}...")
        for item in os.listdir(starter_dir):
            if item == "LICENSE":
                continue # Kept from init
            src = os.path.join(starter_dir, item)
            dst = os.path.join(target_dir, item)
            if os.path.isdir(src):
                shutil.copytree(src, dst)
            else:
                shutil.copy2(src, dst)

        subprocess.run(["git", "add", "."], cwd=target_dir, check=True)
        subprocess.run(["git", "commit", "-m", "Initial commit with starter code"], cwd=target_dir, check=True)

    print(f"[+] Successfully initialized compliant anchored repo at: {target_dir}")

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python init_anchor.py <target_dir> <kit_cli_path> <keypair_path> [starter_dir]")
        sys.exit(1)
    starter = sys.argv[4] if len(sys.argv) > 4 else None
    init_anchor_repo(sys.argv[1], sys.argv[2], sys.argv[3], starter)
