FROM ubuntu:22.04

# Avoid interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install OpenSSH server, Node.js, and required tools
RUN apt-get update && \
    apt-get install -y \
    openssh-server \
    openssh-client \
    curl \
    ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create SSH directory and set permissions
RUN mkdir -p /var/run/sshd && \
    mkdir -p /home/sftpuser/uploads && \
    chmod 755 /home/sftpuser/uploads

# Create SFTP user
RUN useradd -m -s /bin/bash sftpuser && \
    echo 'sftpuser:sftpuser123' | chpasswd && \
    chown -R sftpuser:sftpuser /home/sftpuser

# Configure SSH for SFTP with chroot
RUN echo 'Port 22\n\
ListenAddress 0.0.0.0\n\
PermitRootLogin no\n\
PasswordAuthentication yes\n\
PubkeyAuthentication yes\n\
Subsystem sftp internal-sftp\n\
\n\
Match User sftpuser\n\
    ChrootDirectory /home/sftpuser\n\
    ForceCommand internal-sftp\n\
    AllowTcpForwarding no\n\
    X11Forwarding no\n\
    PasswordAuthentication yes' >> /etc/ssh/sshd_config

# Set proper permissions for chroot
RUN chown root:root /home/sftpuser && \
    chmod 755 /home/sftpuser

# Set working directory for Node.js app
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install --production

# Copy application code
COPY . .

# Create uploads directory (shared between SFTP and web app)
RUN mkdir -p /home/sftpuser/uploads && \
    chmod 755 /home/sftpuser/uploads

# Create startup script to run both services
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
# Function to handle shutdown\n\
cleanup() {\n\
    echo "Shutting down services..."\n\
    kill $SSH_PID $NODE_PID 2>/dev/null || true\n\
    wait $SSH_PID $NODE_PID 2>/dev/null || true\n\
    exit 0\n\
}\n\
\n\
trap cleanup SIGTERM SIGINT\n\
\n\
# Start SSH daemon in background\n\
echo "Starting SSH daemon..."\n\
# Generate host keys if they don't exist\n\
if [ ! -f /etc/ssh/ssh_host_rsa_key ]; then\n\
    ssh-keygen -A\n\
fi\n\
# Start SSH daemon and listen on all interfaces\n\
/usr/sbin/sshd -D -e &\n\
SSH_PID=$!\n\
\n\
# Wait a moment for SSH to start and verify it's running\n\
sleep 3\n\
if ! ps -p $SSH_PID > /dev/null; then\n\
    echo "ERROR: SSH daemon failed to start"\n\
    exit 1\n\
fi\n\
echo "SSH daemon started (PID: $SSH_PID)"\n\
\n\
# Start Node.js application in background\n\
echo "Starting Node.js application..."\n\
node src/server.js &\n\
NODE_PID=$!\n\
\n\
# Wait for both processes\n\
wait $SSH_PID $NODE_PID\n\
' > /start.sh && chmod +x /start.sh

# Expose ports
EXPOSE 22 3000

# Start both services
CMD ["/start.sh"]
