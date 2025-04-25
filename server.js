const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const fs = require('fs');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*", // Autoriser toutes les origines (à restreindre en prod)
    },
});

app.use(cors());
app.use(express.json());

const PORT = 3000;
const IP = 'localhost'
// const IP = '10.1.0.47'
// const IP = '78.123.112.53'
// const IP = '192.168.1.44'
// const IP = '192.168.1.42'
// const IP = '172.28.235.144'
// const IP = '192.168.161.174'
const clientId = "1359831572320096287";
const clientSecret = "pDsVJSSwVloWlssZfXiBHLCTezD-skQt";
var OauthData = {}
const auth_file = 'auth.json'

if (fs.existsSync(auth_file)) {
    const data = fs.readFileSync(auth_file);
    OauthData = JSON.parse(data);
}

function save_auth_data() {
    fs.writeFile(auth_file, JSON.stringify(OauthData), (err) => {
        if (err) {
            console.error('Erreur lors de la sauvegarde des authentifications:', err);
        } else {
            console.log(`Authentifications sauvegardés dans ${auth_file}`);
        }
    });
}

const backupFile = 'backup.json';
let pixels = [];
var height;
var width;

if (fs.existsSync(backupFile)) {
    const data = fs.readFileSync(backupFile);
    pixels = JSON.parse(data);
    height = pixels.length;
    width = pixels[0].length;
} else {
    height = 16;
    width = 16;
    for (let i = 0; i < height; i++) {
        pixels.push([]);
        for (let j = 0; j < width; j++) {
            pixels[i].push({
                color: "#ffffff",
                username: "undefined",
                timestamp: 0
            });
        }
    }
}

// Connexion d'un appareil
io.on("connection", (socket) => {
    console.log(`Nouvelle connexion : ${socket.id} et l'IP ${socket.handshake.address}`);

    socket.on("disconnect", (reason) => {
        console.log(`Appareil ${socket.id} déconnecté`);
    });

    socket.on("pixel_placed", async (pixel_data) => {
        // pixel_data : {
        //     color : "#ffd000",
        //     position : [12, 14],
        //     sessionId : "eaa9ff84-e5de-4883-9e27-07ffcd6b41b9"
        // }

        try {
            if (!pixel_data.color || !pixel_data.position || !pixel_data.sessionId) return;
            if (typeof pixel_data.position[0] !== 'number' || typeof pixel_data.position[1] !== 'number') return;
            if (pixel_data.position[0] < 0 || pixel_data.position[0] >= height || pixel_data.position[1] < 0 || pixel_data.position[1] >= width) return;
            if (pixel_data.color == pixels[pixel_data.position[0]][pixel_data.position[1]].color) return;

            pixels[pixel_data.position[0]][pixel_data.position[1]] = {
                color: pixel_data.color,
                username: OauthData[pixel_data.sessionId]['global_name'],
                timestamp: Date.now()
            }

            io.emit("new_pixel", {
                color: pixel_data.color,
                position: pixel_data.position,
                username: OauthData[pixel_data.sessionId]['global_name'],
                timestamp: Date.now()
            })
        } catch (e) {
            console.log(`Something wrong happened`);
            console.log(`Error : ${e}`);
            console.log(JSON.stringify(pixel_data, null, 4));
        }
    })
});


app.get("/api/get_pixels", (req, res) => {
    res.status(200).json(pixels);
});

app.post("/api/get_session_id", async (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "Session ID is required" });

    try {
        const tokenResponseData = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                code,
                grant_type: 'authorization_code',
                redirect_uri: `http://${IP}:${PORT}/main`,
                scope: 'identify',
            }).toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        });

        if (tokenResponseData.status !== 200) {
            return res.status(tokenResponseData.status).json({error: "Failed to fetch access token"});
        }
        const oauthData = await tokenResponseData.json();

        const userResult = await fetch('https://discord.com/api/users/@me', {
            headers: {
                authorization: `${oauthData.token_type} ${oauthData.access_token}`,
            }
        });
        if (userResult.status !== 200) {
            return res.status(userResult.status).json({ error: "Failed to fetch user data"});
        }
        const userData = await userResult.json();
        // console.log(userData);

        const sessionId = crypto.randomUUID();
        OauthData[sessionId] = userData

        res.status(200).json({
            sessionId: sessionId,
            expirationDate: new Date().getTime() + oauthData.expires_in
        });
        save_auth_data();

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "An error occurred while processing the request" });
    }
})

app.use('/main', express.static('pages/html/main.html'));

app.use('/css', express.static('pages/css'));
app.use('/images', express.static('pages/images'))
app.use('/js', express.static('pages/js'));

app.get('/', function(req, res) {
    res.redirect('/main');
})

server.listen(PORT, () => {
    console.log(`Serveur en ligne sur http://${IP}:${PORT}`);
});


setInterval(() => {
    fs.writeFile(backupFile, JSON.stringify(pixels), (err) => {
        if (err) {
            console.error('Erreur lors de la sauvegarde des pixels:', err);
        } else {
            console.log('Pixels sauvegardés dans backup.json');
        }
    });
}, 60000);