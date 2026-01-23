# 🐱 Mondou Stock Monitor

A "Smart" automated stock tracking system for Mondou pet products. This bot checks stock status hourly, maintains state to prevent spam, alerts via Email upon changes, and logs history to Google Sheets for pattern analysis.

## 🚀 How It Works

1.  **Check:** GitHub Actions runs a Playwright script every hour.
2.  **Compare:** The script reads `last_status.txt` to see if the stock status has changed since the last run.
3.  **Act (If Changed):**
    * **Updates** the repository with the new status.
    * **Notifies** an Azure Logic App via Webhook.
4.  **Distribute:** Azure sends an email alert and appends the data to a Google Sheet.

### System Architecture

```mermaid
graph LR
    A[GitHub Actions Schedule] -->|Every Hour| B(Playwright Script)
    B -->|Read| C{last_status.txt}
    B -->|Check| D[Mondou Website]
    D --> B
    B -->|If Status Changed| E[Update Repo & Push]
    B -->|If Status Changed| F[Azure Logic App Webhook]
    F --> G[Send Email Alert]
    F --> H[Log to Google Sheets]