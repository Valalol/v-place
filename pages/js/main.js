// const IP = 'localhost'
// const IP = '192.168.1.44'
// const IP = '192.168.1.42'
const IP = '78.123.112.53'
const PORT = 3000

const socket = io(`http://${IP}:${PORT}`);

var pixels = [];

const grid = document.getElementById('grid');
const color_picker = document.getElementById('color_picker');

socket.on("connect", () => {
    console.log(`Connecté au serveur avec l'ID ${socket.id}`);
    load_data();
});

socket.on("disconnect", () => {
    console.log("Déconnecté du serveur");
});

socket.on("new_pixel", (pixel_data) => {
    if (pixel_data.timestamp > pixels[pixel_data.position[0]][pixel_data.position[1]].dataset.timestamp) {
        pixels[pixel_data.position[0]][pixel_data.position[1]].style.backgroundColor = pixel_data.color;
        pixels[pixel_data.position[0]][pixel_data.position[1]].dataset.timestamp = pixel_data.timestamp;
    }
})


async function pixel_placed(row, col, color) {
    socket.emit("pixel_placed", {
        color: color,
        position: [row, col]
    })
}

async function load_data() {
    try {
        const response = await fetch(`http://${IP}:${PORT}/api/get_pixels`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        let pixel_data = await response.json();

        grid.innerHTML = ''
        pixels = []

        grid.style.gridTemplateRows = `repeat(${pixel_data.length}, 1fr)`;
        grid.style.gridTemplateColumns = `repeat(${pixel_data[0].length}, 1fr)`;

        for (let i = 0; i < pixel_data.length; i++) {
            pixels.push([]);
            for (let j = 0; j < pixel_data[0].length; j++) {
                let pixel = document.createElement('div');
                pixel.className = 'cell';
                pixel.dataset.row = i;
                pixel.dataset.column = j;
                pixel.dataset.timestamp = pixel_data[i][j].timestamp;
                pixel.style.backgroundColor = pixel_data[i][j].color

                pixel.addEventListener('click', () => {
                    pixel_placed(i, j, color_picker.value)
                })

                grid.appendChild(pixel);
                pixels[i].push(pixel);
            }
        }

    } catch (error) {
        console.error('Error fetching devices:', error);
    }
}