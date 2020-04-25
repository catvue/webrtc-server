const express = require('express')
const path = require('path')
const cors = require('cors');
const WebSocket = require('ws');
//const fs = require('fs');
//const https = require('https');

const PORT = process.env.PORT || 5000


let app = express()
    .use(cors())
    .get('/', (req, res) => {
        res.send('<h1>hi</h1>');
    })
    .listen(PORT, () => console.log(`Listening on ${PORT}`));



/*const server = https.createServer({
    // cert: fs.readFileSync('c:/https/network.crt'),
    // key: fs.readFileSync('c:/https/network.key')
    cert: fs.readFileSync('c:/https/localhost.cert'),
    key: fs.readFileSync('c:/https/localhost.key'),
    passphrase: ""
}, app);

server.listen(PORT, () => console.log(`Listening on ${PORT}`))*/



const wsServer = new WebSocket.Server({ server: app});

let i = 1;
function generateId() {
    return (i++).toString();
}

let MessageType = {
    NewUserId: 1,
    Offer: 2,
    OfferBack: 3,
    Answer: 4,
    AnswerBack: 5
}

let ErrorCodes = {
    EmptyMessage: 1,
    InvalidType: 2,
    InvalidData: 3,
    PeerNotFound: 4,
    ServerError: 5
}

let connections = new Map();


const validateMessage = function (message) {
    let res =
        message
            && message.to
            && message.type
            && message.data
            && message.type == MessageType.Offer ? message.data.type === 'offer'
            : message.type == MessageType.Answer ? message.data.type === 'answer' : false
                && message.sdp
                && typeof (message.sdp) === 'string'

    return res;
}

wsServer.on('close', function (request, socket, head) {
    console.log('close');
});

wsServer.on('error', function (error) {
    console.error(error);
});

wsServer.on('upgrade', function (request, socket, head) {
    console.log('upgrade');
});

wsServer.on('connection', function connection(ws) {
    try {
        let userId = generateId();
        connections.set(userId, ws);

        ws.on('message', function incoming(messageJson) {
            let message = JSON.parse(messageJson);
            let res = null;
            try {
                if (!message) {
                    res = { error: ErrorCodes.EmptyMessage };
                }
                else {
                    let to = message.to || null;
                    switch (message.type) {
                        case MessageType.NewUserId:
                            break;
                        case MessageType.Offer:
                        case MessageType.Answer:
                            if (!validateMessage(message)) {
                                res = { error: ErrorCodes.InvalidData, to };
                            }
                            else {
                                let connection = connections.get(message.to)

                                if (connection) {
                                    connection.send(JSON.stringify({ type: message.type, data: message.data, from: userId }));
                                }
                                else {
                                    res = { error: ErrorCodes.PeerNotFound, to };
                                }
                            }
                            break;
                        default:
                            res = { error: ErrorCodes.InvalidType, to }
                            break;
                    }
                }
            }
            catch (ex) {
                console.error(ex);
                res = { error: ErrorCodes.ServerError }
            }

            if (res) {
                try {
                    ws.send(JSON.stringify(res));
                }
                catch (ex) {
                    console.error(ex);
                }
            }
        });

        ws.on('close', function (code, reason) {
            try {
                connections.delete(userId);
            }
            catch (ex) {
                console.error(ex);
            }

            try {
                clearInterval(ws.keepAliveInterval);
            }
            catch (ex) {
                console.error(ex);
            }
        });

        ws.isAlive = true;
        ws.on('pong', () => {
            ws.isAlive = true
        });

        ws.keepAliveInterval = setInterval(() => {
            if (!ws.isAlive) {
                ws.terminate();
            }
            ws.isAlive = false;
            ws.ping();
        }, 10000);

        ws.send(JSON.stringify({ type: MessageType.NewUserId, data: userId }));
    }
    catch (ex) {
        console.error(ex);
    }
})