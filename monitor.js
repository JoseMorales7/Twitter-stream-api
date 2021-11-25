require('dotenv').config()

const needle = require('needle')
const { WebhookClient } = require('discord.js')

const token = process.env.BEARER_TOKEN

const rulesURL = 'https://api.twitter.com/2/tweets/search/stream/rules'
const streamURL = 'https://api.twitter.com/2/tweets/search/stream'

const hookParts = process.env.HOOK_URL.split('/').splice(5)
const hookID = hookParts[0]
const hookToken = hookParts[1]
const hook = new WebhookClient(hookID, hookToken)

hook.send('testing')

const rules = [
    //tweets from my twitter account
    {
        "value": "from:idkjoseam"
    }
]

async function setRules() {

    const data = {
        "add": rules
    }

    const response = await needle('post', rulesURL, data, {
        headers: {
            "content-type": "application/json",
            "authorization": `Bearer ${token}`
        }
    }, () => {})

    if (response.statusCode !== 201) {
        throw new Error(response.body);
        return null;
    }

    start();

}

function connectToStream() {
    //Listen to the stream
    const options = {
        timeout: 20000
    }

    const stream = needle.get(streamURL, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    }, options);

    stream.on('data', data => {
        try {
            const json = JSON.parse(data);
            console.log(json);
            hook.send(json.data.text)
        } catch (e) {
            // Keep alive signal received. Do nothing.
        }
    }).on('error', error => {
        if (error.code === 'ETIMEDOUT') {
            stream.emit('timeout');
        }
    });

    return stream;

}

function start() {
    // Listen to the stream.
    // This reconnection logic will attempt to reconnect when a disconnection is detected.
    // To avoid rate limites, this logic implements exponential backoff, so the wait time
    // will increase if the client cannot reconnect to the stream.
    const filteredStream = connectToStream()
    let timeout = 0;
    filteredStream.on('timeout', () => {
        // Reconnect on error
        console.warn('A connection error occurred. Reconnecting…');
        setTimeout(() => {
            timeout++;
            streamConnect(token);
        }, 2 ** timeout);
        streamConnect(token);
    })
}


(async () => {
    try {
        // Add rules to the stream. Comment the line below if you don't want to add new rules.
        await setRules();

    } catch (e) {
        console.error(e);
        process.exit(-1);
    }

    
})();

