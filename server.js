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
    height = 15;
    width = 15;
    for (let i = 0; i < height; i++) {
        pixels.push([]);
        for (let j = 0; j < width; j++) {
            pixels[i].push({
                color: "#ffffff",
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

    socket.on("pixel_placed", (pixel_data) => {
        // pixel_data : {
        //     color : "#ffd000",
        //     position : [12, 14],
        // }

        try {
            if (!pixel_data.color || !pixel_data.position) return;
            if (typeof pixel_data.position[0] !== 'number' || typeof pixel_data.position[1] !== 'number') return;
            if (pixel_data.position[0] < 0 || pixel_data.position[0] >= height || pixel_data.position[1] < 0 || pixel_data.position[1] >= width) return;
            if (pixel_data.color == pixels[pixel_data.position[0]][pixel_data.position[1]].color) return;

            pixels[pixel_data.position[0]][pixel_data.position[1]] = {
                color: pixel_data.color,
                timestamp: Date.now()
            }

            io.emit("new_pixel", {
                color: pixel_data.color,
                position: pixel_data.position,
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


app.use('/main', express.static('pages/html/main.html'));

app.use('/css', express.static('pages/css'));
app.use('/images', express.static('pages/images'))
app.use('/js', express.static('pages/js'));

app.get('/', function(req, res) {
    res.redirect('/main');
})

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Serveur en ligne sur http://localhost:${PORT}`);
});


setInterval(() => {
    fs.writeFile('backup.json', JSON.stringify(pixels), (err) => {
        if (err) {
            console.error('Erreur lors de la sauvegarde des pixels:', err);
        } else {
            console.log('Pixels sauvegardés dans backup.json');
        }
    });
}, 60000);