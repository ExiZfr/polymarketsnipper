FROM python:3.11-slim

WORKDIR /app

# Install netcat for waiting on database
RUN apt-get update && apt-get install -y netcat-openbsd && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Make start script executable and fix line endings
RUN chmod +x start.sh && \
    sed -i 's/\r$//' start.sh

CMD ["bash", "start.sh"]
