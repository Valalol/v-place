const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*", // Autoriser toutes les origines (à restreindre en prod)
    },
});

app.use(cors());
app.use(express.json());

height = 15
width = 15
pixels = []
for (let i = 0; i < height; i++) {
    pixels.push([])
    for (let j = 0; j < width; j++) {
        pixels[i].push({
            color: "#ffffff",
            timestamp: 0
        })
    }
}

// Connexion d'un appareil
io.on("connection", (socket) => {
    console.log(`Nouvelle connexion : ${socket.id}`);

    socket.on("disconnect", (reason) => {
        console.log(`Appareil ${socket.id} déconnecté`);
    });

    socket.on("pixel_placed", (pixel_data) => {
        // pixel_data : {
        //     color : "#ffd000",
        //     position : [12, 14],
        // }

        console.log(pixel_data);
        console.log(pixels[pixel_data.position[0]][pixel_data.position[1]]);

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
