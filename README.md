# ITV Barcelona Availability Checker

This project automatically checks for ITV (vehicle inspection) appointment availability in Barcelona using Playwright and sends Telegram notifications when slots become available.

## Features

- 🚀 **Automated checking** every 10 minutes via GitHub Actions
- 📱 **Telegram notifications** when availability is found
- 🎯 **Monitors Center ID 17** (configurable)
- 🔄 **Smart change detection** - only notifies when availability changes
- 📊 **Data persistence** - saves results to track changes over time

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Telegram Bot

1. Create a Telegram bot by messaging [@BotFather](https://t.me/botfather)
2. Get your bot token
3. Get your chat ID by messaging [@userinfobot](https://t.me/userinfobot)

### 3. Set Environment Variables

For local testing:
```bash
export TELEGRAM_API_TOKEN="your_bot_token_here"
export CHAT_ID="your_chat_id_here"
```

For GitHub Actions, add these as repository secrets:
- `TELEGRAM_API_TOKEN`
- `CHAT_ID`

### 4. Test Locally

```bash
npm start
```

## Configuration

### Center ID

To monitor a different center, edit the `CENTER_ID` variable in `playwright-checker.js`:

```javascript
const CENTER_ID = 17; // Change this to your desired center ID
```

### License Plate

The script uses a test license plate `1234BCD`. This is just for accessing the booking interface - the actual license plate doesn't affect availability checking.

### Check Frequency

To change the check frequency, edit the cron expression in `.github/workflows/itv-checker.yml`:

```yaml
- cron: '*/10 * * * *'  # Every 10 minutes
- cron: '*/5 * * * *'   # Every 5 minutes
- cron: '0 */1 * * *'   # Every hour
```

## How It Works

1. **Browser Automation**: Uses Playwright to navigate the ITV booking website
2. **Flow Simulation**: Mimics the complete booking flow:
   - Enters license plate
   - Selects motorcycle + gasoline
   - Chooses ITV service
   - Reaches the date selection interface
3. **Availability Detection**: Scans for clickable time slots in the calendar
4. **Change Detection**: Compares with previous results to avoid spam
5. **Notifications**: Sends Telegram messages only when availability changes

## File Structure

```
├── playwright-checker.js     # Main script
├── availability.js           # Original script (for reference)
├── data.json                 # Stored availability data
├── package.json              # Dependencies
├── .github/workflows/
│   └── itv-checker.yml      # GitHub Actions workflow
└── README.md                # This file
```

## GitHub Actions

The workflow automatically:
- Installs dependencies
- Runs the availability check
- Uploads results as artifacts
- Runs every 10 minutes

## Monitoring

Check the GitHub Actions tab to see:
- When checks were run
- Success/failure status
- Logs of the availability checks

## Troubleshooting

### No notifications received
- Verify Telegram bot token and chat ID are correct
- Check GitHub Actions secrets are set
- Look at the workflow logs for errors

### Script fails
- Check if the ITV website structure has changed
- Verify the license plate format is still valid
- Review the browser automation selectors

### False positives
- The script detects clickable elements as available slots
- Some slots might be "available" but not bookable
- This is normal behavior - manually verify before booking

## License

MIT License - feel free to modify and use as needed.