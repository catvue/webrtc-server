const express = require('express');
const app = express();
const cors = require('cors')
const WebSocket = require('ws');
const path = require('path');

app.use(cors());

app.set('port', process.env.port || 3000);

app.get('/test', (req, res, next) =>{
    res.send('<h1>Aliveeeee<h1>');
})

const wsServer = new WebSocket.Server({ port: 8080 });

let i = 0;
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
    PeerNotFound: 4
}

let connections = new Map();


const validateMessage = function(message) {
    let res = 
        message
        && message.to
        && message.type 
        && message.data
        && message.type == MessageType.Offer ? message.data.type === 'offer'
            : message.type == MessageType.Answer ? message.data.type === 'answer' : false
        && message.sdp
        && typeof(message.sdp) === 'string'

    return res; 
}
 
wsServer.on('connection', function connection(ws) {
    try {
        let userId = generateId();
        connections.set(userId, ws);

        ws.on('message', function incoming(messageJson) {
            let message = JSON.parse(messageJson);
            let res = null;
            try 
            {
                if (!message) {
                    res = { error: ErrorCodes.EmptyMessage };
                }
                else {
                    switch(message.type) {
                        case MessageType.NewUserId:
                            break; 
                        case MessageType.Offer:
                        case MessageType.Answer:
                            if (!validateMessage(message)) {
                                res = { error: ErrorCodes.InvalidData };
                            }
                            else {
                                let connection = connections.get(message.to)

                                if (connection) {
                                    connection.send(JSON.stringify({ type: message.type, data: message.data, from: userId }));
                                }
                                else {
                                    res = { error: ErrorCodes.PeerNotFound };
                                }
                            }   
                            break;
                        default:
                            res = { error: ErrorCodes.InvalidType }
                            break;
                    }
                }
            }
            catch (ex) {
                console.error(ex);
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

        ws.on('close', function(code, reason) {
            try {
                connections.delete(userId);
            }
            catch (ex) {
                console.error(ex);
            }
        })
    
        ws.send(JSON.stringify({ type: MessageType.NewUserId, data: userId }));
    }
    catch (ex) {
        console.error(ex);
    }
})

app.listen(app.get('port'), server =>{
    console.info(`Server listen on port ${app.get('port')}`);
})