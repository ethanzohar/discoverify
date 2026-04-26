# Grafana Cloud Setup — EC2 Guide

This guide sets up metrics and log shipping from your EC2 instance to Grafana Cloud using Grafana Alloy.

## Prerequisites

- EC2 instance running the discoverify backend via pm2
- SSH access to the EC2 instance
- A free Grafana Cloud account (grafana.com/auth/sign-up)

---

## Step 1: Create a Grafana Cloud account

1. Go to grafana.com and sign up for a free account
2. Create a new stack (choose a region close to your users)
3. Note your **stack slug** (e.g. `discoverify`)

---

## Step 2: Get your API credentials

You need credentials for both Prometheus (metrics) and Loki (logs).

### Prometheus / Mimir credentials
1. In Grafana Cloud, go to **Home → Connections → Prometheus**
2. Click **Hosted Prometheus metrics** (not "Prometheus data source")
3. Note the **Remote Write Endpoint** URL (looks like `https://prometheus-prod-XX-prod-XX.grafana.net/api/prom/push`)
4. Note your **Username** (a numeric instance ID)
5. Click **Generate now** to create an API key — copy it immediately

### Loki credentials
1. Go to **Home → Connections → Loki**
2. Note the **Loki URL** (looks like `https://logs-prod-XX.grafana.net/loki/api/v1/push`)
3. Note your **Username** (a numeric instance ID — different from Prometheus)
4. You can reuse the same API key or generate a new one

---

## Step 3: Install Grafana Alloy on EC2

SSH into your EC2 instance, then run:

```bash
ARCH=$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/')
wget https://github.com/grafana/alloy/releases/latest/download/alloy-linux-${ARCH}.zip
unzip alloy-linux-${ARCH}.zip
chmod +x alloy-linux-${ARCH}
sudo mv alloy-linux-${ARCH} /usr/local/bin/alloy
```

Verify:
```bash
alloy --version
```

---

## Step 4: Create the Alloy config file

```bash
sudo mkdir -p /etc/alloy
sudo nano /etc/alloy/config.alloy
```

Paste the following, replacing all `<PLACEHOLDER>` values with your actual credentials:

```alloy
// Metrics: scrape discoverify backend
prometheus.scrape "discoverify_backend" {
  targets = [{
    "__address__" = "localhost:8081",
    "app"         = "discoverify-backend",
    "env"         = "production",
  }]
  forward_to      = [prometheus.remote_write.grafana_cloud.receiver]
  scrape_interval = "15s"
}

// System metrics (CPU, memory, disk)
prometheus.exporter.unix "default" {}

prometheus.scrape "node_exporter" {
  targets    = prometheus.exporter.unix.default.targets
  forward_to = [prometheus.remote_write.grafana_cloud.receiver]
}

// Ship metrics to Grafana Cloud
prometheus.remote_write "grafana_cloud" {
  endpoint {
    url = "<YOUR_PROMETHEUS_REMOTE_WRITE_URL>"
    basic_auth {
      username = "<YOUR_PROMETHEUS_INSTANCE_ID>"
      password = "<YOUR_API_KEY>"
    }
  }
}

// Tail pm2 logs
local.file_match "backend_logs" {
  path_targets = [{
    "__path__" = "/home/ec2-user/.pm2/logs/discoverify-backend-out*.log",
    "app"      = "discoverify-backend",
    "env"      = "production",
  }]
}

local.file_match "cron_logs" {
  path_targets = [{
    "__path__" = "/home/ec2-user/.pm2/logs/discoverify-cronService-out*.log",
    "app"      = "discoverify-cron",
    "env"      = "production",
  }]
}

loki.source.file "pm2_logs" {
  targets    = concat(local.file_match.backend_logs.targets, local.file_match.cron_logs.targets)
  forward_to = [loki.write.grafana_cloud.receiver]
}

// Ship logs to Grafana Cloud
loki.write "grafana_cloud" {
  endpoint {
    url = "<YOUR_LOKI_PUSH_URL>"
    basic_auth {
      username = "<YOUR_LOKI_INSTANCE_ID>"
      password = "<YOUR_API_KEY>"
    }
  }
}
```

> **Note:** If your EC2 user is not `ec2-user` (e.g. Ubuntu uses `ubuntu`), update the `__path__` values to match. Run `echo ~/.pm2/logs/` to confirm the path.

---

## Step 5: Start Grafana Alloy as a systemd service

```bash
sudo nano /etc/systemd/system/alloy.service
```

Paste:

```ini
[Unit]
Description=Grafana Alloy
After=network.target

[Service]
User=ec2-user
ExecStart=/usr/local/bin/alloy run /etc/alloy/config.alloy
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

> Replace `User=ec2-user` with your actual EC2 username if different.

Then enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable alloy
sudo systemctl start alloy
sudo systemctl status alloy
```

Expected: `active (running)` in the status output.

---

## Step 6: Verify data is arriving

### Metrics
1. In Grafana Cloud, go to **Explore**
2. Select the **Prometheus** data source
3. Run the query: `http_requests_total`
4. You should see data within 30 seconds of making a request to your app

### Logs
1. In Grafana Cloud, go to **Explore**
2. Select the **Loki** data source
3. Run the query: `{app="discoverify-backend"}`
4. You should see your JSON log lines

---

## Step 7: Import a starter dashboard (optional)

1. In Grafana Cloud, go to **Dashboards → Import**
2. Enter dashboard ID `1860` (Node Exporter Full) for system metrics
3. Select your Prometheus data source and click Import

For app-specific dashboards, use the **Dashboard builder** in Grafana and add panels using the metrics listed below.

---

## Key metrics to build panels for

| What to show | PromQL query |
|---|---|
| Request rate | `rate(http_requests_total[5m])` |
| P95 request latency | `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))` |
| Error rate (5xx) | `rate(http_requests_total{status_code=~"5.."}[5m])` |
| Subscriptions per hour | `increase(subscription_events_total{event="user_subscribed"}[1h])` |
| Unsubscribes per hour | `increase(subscription_events_total{event="unsubscribe"}[1h])` |
| Stripe cancel failures | `increase(stripe_cancellation_total{result="resource_missing"}[1h])` |
| Node.js heap used | `nodejs_heap_size_used_bytes` |
| CPU usage | `rate(node_cpu_seconds_total{mode!="idle"}[5m])` |
| Memory available | `node_memory_MemAvailable_bytes` |

---

## Key Loki log queries

| What to find | LogQL query |
|---|---|
| All stripe cancel failures | `{app="discoverify-backend"} \| json \| event="stripe_cancel_failed"` |
| All unsubscribe events | `{app="discoverify-backend"} \| json \| event="user_unsubscribed"` |
| Playlist failures | `{app="discoverify-cron"} \| json \| event="playlist_update_failed"` |
| Specific user activity | `{app="discoverify-backend"} \| json \| userId="<spotify_user_id>"` |
| Errors only | `{app="discoverify-backend"} \| json \| level="error"` |

---

## Troubleshooting

**Alloy not starting:**
```bash
sudo journalctl -u alloy -f
```

**No metrics in Grafana:**
- Confirm the backend is running: `curl http://localhost:8081/metrics`
- Check Alloy logs for scrape errors

**No logs in Loki:**
- Confirm pm2 log paths exist: `ls ~/.pm2/logs/`
- The `__path__` in the config must match exactly — adjust if needed

**Free tier log limit:**
- Monitor usage in Grafana Cloud under **Account → Usage**
- If approaching limits, raise `LOG_LEVEL=warn` in your `.env` to reduce volume
