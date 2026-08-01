FROM arm64v8/node:26-trixie

RUN apt update -y
RUN apt upgrade -y

RUN apt install jq -y

RUN corepack enable

# Install gh
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | gpg --dearmor -o /usr/share/keyrings/githubcli-archive-keyring.gpg;
RUN echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null;
RUN apt update && apt install -y gh;

# Change default user from node to agent
RUN usermod -d /home/agent -m -l agent node
USER agent

WORKDIR /home/agent

# Install claude
RUN curl -fsSL https://claude.ai/install.sh | bash
ENV PATH="/home/agent/.local/bin:$PATH"

CMD ["claude", "--dangerously-skip-permissions"]