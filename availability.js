const axios = require('axios');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');

const endpoint = 'https://www.itv-tuvrheinland.es/citation/getAvailableDates?center_id=17&vehicle_type_id=9&service_id=1';
const saveFilePath = 'data.json';

// Retrieve Telegram API token and chat ID from environment variables
const telegramApiToken = process.env.TELEGRAM_API_TOKEN;
const chatId = process.env.CHAT_ID;

console.log('telegramApiToken:',telegramApiToken)

// Create a new Telegram bot instance
const bot = new TelegramBot(telegramApiToken, { polling: false });

// Function to fetch data from the endpoint
async function fetchData() {
  try {
    const response = await axios.get(endpoint);
    console.log('Status code:', response.status)
    console.log('Available Dates:', response.data.result.availableDates)
    return response.data.result.availableDates;
  } catch (error) {
    console.error('Error fetching data:', error.message);
    return null;
  }
}

// Function to save data to a file
function saveDataToFile(data) {
  fs.writeFileSync(saveFilePath, JSON.stringify(data), 'utf8');
  console.log('Data saved to file:', saveFilePath);
}

// Function to send a Telegram message
function sendTelegramMessage(message) {
  bot.sendMessage(chatId, message);
}

// Main function to check for changes and take actions
async function main() {
  try {
    // const newData = await fetchData();
    const newData = {
      "11679133": "2023-08-30T07:45:00.000000Z",
      "11679136": "2023-08-30T08:15:00.000000Z",
      "11679145": "2023-08-30T09:45:00.000000Z",
      "11679169": "2023-08-31T06:45:00.000000Z",
      "11679173": "2023-08-31T07:45:00.000000Z",
      "11679176": "2023-09-01T08:45:00.000000Z",
      "11679177": "2023-08-31T08:45:00.000000Z",
      "11679178": "2023-09-01T09:15:00.000000Z",
      "11679179": "2023-08-31T09:15:00.000000Z",
      "11679181": "2023-08-31T09:45:00.000000Z",
      "11679184": "2023-09-01T10:45:00.000000Z",
      "11684863": "2023-08-28T05:15:00.000000Z",
      "11684866": "2023-08-29T05:45:00.000000Z",
      "11684867": "2023-08-30T05:15:00.000000Z",
      "11684868": "2023-08-30T05:45:00.000000Z"
    };

    if (newData === null) {
      return;
    }

    let oldData = [];

    // try {
    //   const fileContent = fs.readFileSync(saveFilePath, 'utf8');
    //   oldData = JSON.parse(fileContent);
    // } catch (error) {
    //   console.warn('Error reading saved data:', error.message);
    // }

    if (!oldData || JSON.stringify(newData) !== JSON.stringify(oldData)) {
      saveDataToFile(newData);
      sendTelegramMessage('New available dates:\n' + Object.values(newData).join('\n') + '\nBook Now: https://www.itv-tuvrheinland.es/cita-previa-itv?vehicle_type_id=9&center_id=17');
      
    } else {
      console.log('Data has not changed.');
    }
  } catch (error) {
    console.error('An error occurred:', error.message);
  }
}

// Call the main function
main();