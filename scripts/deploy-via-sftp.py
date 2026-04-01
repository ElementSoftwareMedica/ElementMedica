#!/usr/bin/env python3
"""Deploy dist/ and dist-public/ to VPS via SFTP using paramiko.
Mirrors what deploy-production.sh does via rsync.
"""

import paramiko
import os
import sys
import getpass
from pathlib import Path

BASE = Path('/Users/matteo.michielon/project 2.0')
SERVER_IP = '178.104.44.177'
SERVER_PATH = '/var/www/elementmedica'
SSH_KEY = str(Path.home() / '.ssh/id_ed25519')
SSH_USER = 'root'  # Use root to avoid permission issues from mixed ownership

# Set SSH_KEY_PASSPHRASE in env to avoid interactive prompt.
SSH_PASS = os.getenv('SSH_KEY_PASSPHRASE')
if SSH_PASS is None:
    try:
        SSH_PASS = getpass.getpass('SSH key passphrase (leave empty if none): ')
    except (EOFError, KeyboardInterrupt):
        SSH_PASS = ''

if SSH_PASS == '':
    SSH_PASS = None

# Connect as elementmedica user
key = paramiko.Ed25519Key.from_private_key_file(SSH_KEY, password=SSH_PASS)
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(SERVER_IP, username=SSH_USER, pkey=key)
sftp = client.open_sftp()

print(f'Connected as {SSH_USER}@{SERVER_IP}')


def ensure_remote_dir(sftp_client, remote_path):
    """Ensure remote directory exists."""
    parts = Path(remote_path).parts
    current = ''
    for part in parts:
        current = str(Path(current) / part) if current else part
        if current == '/':
            continue
        try:
            sftp_client.stat(current)
        except FileNotFoundError:
            try:
                sftp_client.mkdir(current)
            except Exception:
                pass


def upload_dir(sftp_client, local_dir: Path, remote_dir: str, skip_map=True):
    """Upload a directory recursively via SFTP."""
    uploaded = 0
    skipped = 0
    
    for item in local_dir.rglob('*'):
        if item.is_file():
            # Skip source maps to save bandwidth/disk
            if skip_map and item.suffix == '.map':
                skipped += 1
                continue
            
            rel = item.relative_to(local_dir)
            remote_path = remote_dir + '/' + str(rel).replace('\\', '/')
            remote_parent = str(Path(remote_path).parent)
            
            # Ensure parent dir exists
            ensure_remote_dir(sftp_client, remote_parent)
            
            # Upload file
            try:
                sftp_client.put(str(item), remote_path)
                uploaded += 1
                if uploaded % 50 == 0:
                    print(f'  ... {uploaded} files uploaded')
            except Exception as e:
                print(f'  ERROR uploading {rel}: {e}')
    
    return uploaded, skipped


# Deploy dist/ → elementsicurezza.com
print('\n=== Deploying dist/ → elementsicurezza.com ===')
dist_local = BASE / 'dist'
dist_remote = f'{SERVER_PATH}/dist'
n, skip = upload_dir(sftp, dist_local, dist_remote)
print(f'✅ dist/: {n} files uploaded, {skip} .map files skipped')

# Deploy dist-public/ → elementmedica.com
print('\n=== Deploying dist-public/ → elementmedica.com ===')
dist_pub_local = BASE / 'dist-public'
dist_pub_remote = f'{SERVER_PATH}/dist-public'
n, skip = upload_dir(sftp, dist_pub_local, dist_pub_remote)
print(f'✅ dist-public/: {n} files uploaded, {skip} .map files skipped')

# Deploy new og:image files to assets/logos
print('\n=== Deploying og:image PNG files ===')
logos_local = BASE / 'public' / 'assets' / 'logos'
for fname in ['element-medica-og-preview.png', 'element-sicurezza-og-preview.png']:
    for remote_dist in [dist_remote, dist_pub_remote]:
        remote_logos = f'{remote_dist}/assets/logos'
        ensure_remote_dir(sftp, remote_logos)
        try:
            sftp.put(str(logos_local / fname), f'{remote_logos}/{fname}')
            print(f'  ✅ {fname} → {remote_logos}/')
        except Exception as e:
            print(f'  ❌ {fname}: {e}')

sftp.close()

# Fix ownership so elementmedica user owns the files for future deploys
print('\n=== Fixing ownership ===')
stdin3, stdout3, stderr3 = client.exec_command(
    f'chown -R elementmedica:elementmedica {SERVER_PATH}/dist {SERVER_PATH}/dist-public'
)
rc3 = stdout3.channel.recv_exit_status()
print(f'chown: rc={rc3}', stderr3.read().decode().strip()[:200] or 'OK')

# Verify deployment
print('\n=== Health check ===')
stdin, stdout, stderr = client.exec_command('curl -s -o /dev/null -w "%{http_code}" http://localhost:4001/health')
code = stdout.read().decode().strip()
print(f'API health: {code}')

stdin2, stdout2, stderr2 = client.exec_command('curl -s -o /dev/null -w "%{http_code}" -H "Host: www.elementmedica.com" http://localhost/')
code2 = stdout2.read().decode().strip()
print(f'elementmedica.com (via localhost): {code2}')

client.close()
print('\n✅ Deploy completed!')
