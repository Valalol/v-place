// const IP = 'localhost'
// const IP = '10.1.0.47'
const IP = '78.123.112.53'
// const IP = '192.168.1.44'
// const IP = '192.168.1.42'
// const IP = '172.28.235.144'
// const IP = '192.168.161.174'
const PORT = 3000

const socket = io(`http://${IP}:${PORT}`);

var pixels = [];

const grid = document.getElementById('grid');
const login_link = document.getElementById('login_link');
// const username_input = document.getElementById('username');
const color_picker = document.getElementById('color_picker');
const pixel_info = document.getElementById('pixel_info');

var sessionId;

async function handleAuthCode() {
    const urlParams = new URLSearchParams(window.location.search);
    var code = urlParams.get('code');

    if (code) {
        const response = await fetch(`http://${IP}:${PORT}/api/get_session_id`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code })
        });
        const responseData = await response.json()

        localStorage.setItem('sessionId', responseData.sessionId);
        localStorage.setItem('expirationDate', responseData.expirationDate);
        window.location.href = `http://${IP}:${PORT}/main`;

    } else if (localStorage.getItem('sessionId') && localStorage.getItem('expirationDate') && parseInt(localStorage.getItem('expirationDate')) > new Date().getTime()) {
        sessionId = localStorage.getItem('sessionId');
    } else {
        login_link.style.display = 'block';
    }
}
handleAuthCode();


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
        pixels[pixel_data.position[0]][pixel_data.position[1]].dataset.username = pixel_data.username;
        pixels[pixel_data.position[0]][pixel_data.position[1]].dataset.timestamp = pixel_data.timestamp;
    }
})

async function pixel_clicked(row, col) {
    if (!sessionId) {
        alert("Veuillez vous connecter via discord");
        return;
    }

    socket.emit("pixel_placed", {
        color: color_picker.value,
        position: [row, col],
        sessionId: sessionId
    })
}

function formatMilliseconds(ms) {
    if (ms < 1000) {
        return `${ms}ms`;
    } else if (ms < 60000) {
        return `${(ms / 1000).toFixed(0)}s`;
    } else if (ms < 3600000) {
        return `${(ms / 60000).toFixed(0)}min`;
    } else if (ms < 86400000) {
        return `${(ms / 3600000).toFixed(0)}h`;
    } else {
        return `${(ms / 86400000).toFixed(0)}j`;
    }
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
                pixel.dataset.username = pixel_data[i][j].username;
                pixel.dataset.timestamp = pixel_data[i][j].timestamp;
                pixel.style.backgroundColor = pixel_data[i][j].color;

                pixel.addEventListener('click', () => {
                    pixel_clicked(i, j);
                })

                pixel.addEventListener('mouseover', () => {
                    if (!pixel.dataset.username || !pixel.dataset.timestamp) return;
                    if (pixel.dataset.username == "undefined") {
                        pixel_info.innerHTML = ``;
                    } else {
                        let deltatime = formatMilliseconds(new Date() - pixel.dataset.timestamp)
                        pixel_info.innerHTML = `Pixel posé par "${pixel.dataset.username}" il y a ${deltatime}`
                    }
                })

                grid.appendChild(pixel);
                pixels[i].push(pixel);
            }
        }

    } catch (error) {
        console.error('Error fetching devices:', error);
    }
}

color_picker.addEventListener('input', (event) => {
    localStorage.setItem("color_selected", event.target.value);
})

color = localStorage.getItem("color_selected");
if (color != null && color != color_picker.value) {
    color_picker.value = color;
}
