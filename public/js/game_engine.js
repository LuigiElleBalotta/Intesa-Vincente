var socket = null;
var _roomId = null;
var player_type = null;
var options = null;
const status = {
    timer_active: false
};

function init( socket, roomId, privilege, permissions ) {
    _roomId = roomId;
    socket = socket;
    options = permissions;

    handle_connect(privilege, roomId)
    handle_disconnect()
    handle_on_joined_room()
    handle_on_new_random_word()
    handle_timer_tick()
    handle_stop_countdown()
    handle_on_updated_score()
    handle_on_updated_time()
}

// UI related functions.
function prosegui_btn_click() {
    if( !status.timer_active ) {
        socket.emit("new-random-word", { roomId: roomId });
        socket.emit("start-timer", { roomId: roomId });
    }
    else {
        console.error('Timer is active, cannot change word.');
    }
}

function prenota_btn_click() {
    if( status.timer_active ) {
        socket.emit("prenota", { roomId: roomId });
    }
    else {
        console.error('Timer is not active, cannot use prenota button.');
    }
}

function startSwalPrenotation() {
    let timerInterval
    Swal.fire({
        title: 'Risposta prenotata!',
        html: 'I will close in <b></b> milliseconds.',
        timer: 5000,
        timerProgressBar: true,
        didOpen: () => {
            Swal.showLoading()
            const b = Swal.getHtmlContainer().querySelector('b')
            timerInterval = setInterval(() => {
                b.textContent = Swal.getTimerLeft()
            }, 100)
        },
        willClose: () => {
            clearInterval(timerInterval)
        }
    }).then((result) => {
        /* Read more about handling dismissals below */
        if (result.dismiss === Swal.DismissReason.timer) {
            console.log('I was closed by the timer')
        }
    })
}

function on_aggiungi_clicked() {
    socket.emit("update-score", { roomId, method: 'add' });
}

function on_sottrai_clicked() {
    socket.emit("update-score", { roomId, method: 'sub' });
}

function updateTime(method) {
    if( !status.timer_active ) {
        socket.emit("manually-update-time", { roomId: roomId, method: method });
    }
    else {
        console.error('Timer is active, cannot manually update time.');
    }
}

// Socket.IO related functions.
function handle_connect( privilege, id ) {
    socket.on("connect", function () {
        console.log("[Socket.IO] Connected to server");
        player_type = privilege;
        roomId = id;
        socket.emit("joinRoom", { roomId: roomId, player_type: privilege })
    });
}

function handle_disconnect() {
    socket.on("disconnect", function ( reason ) {
        console.log("[Socket.IO] Disconnected from server. Reason: ", reason);
    });
}

function handle_on_joined_room() {
    socket.on("on-joined-room", function (data) {
        console.log("[Socket.IO] on-joined-room", data);
        handle_serverside_stats(data.stats);
    });
}

function handle_on_new_random_word() {
    if( options && options.view_word ) {
        socket.on("received-new-random-word", function (data) {
            console.log("[Socket.IO] on-new-random-word", data);
            update_current_word( data.random_word );
        });
    }
}

function handle_timer_tick() {
    socket.on("timer-tick", function (data) {
        console.log("[Socket.IO] timer-tick", data);
        update_timer(data.remaining_seconds);
        status.timer_active = true;
    });
}

function handle_stop_countdown() {
    socket.on("stop-countdown", function (data) {
        console.log("[Socket.IO] stop-countdown", data);
        status.timer_active = false;
        startSwalPrenotation();
    });
}

function handle_on_updated_score() {
    socket.on("updated-score", function (data) {
        console.log("[Socket.IO] on-updated-score", data);
        update_punteggio( data.score );
    });
}

function handle_on_updated_time() {
    socket.on("updated-time", function (data) {
        console.log("[Socket.IO] updated-time", data);
        update_timer( data.time );
    });
}

// Not Socket.IO related functions.
function handle_serverside_stats( stats ) {
    const room_id = stats.roomId;
    const punteggio = stats.punteggio;
    const secondi_rimanenti = stats.secondi_rimanenti;
    const current_word = stats.current_word;

    update_punteggio( punteggio );
    update_timer( secondi_rimanenti );

    console.log('options', options)

    if( options && options.view_word ) {
        // Update current_word also.
        update_current_word( current_word );
    }
}

function update_punteggio( punteggio ) {
    const punteggioEl = document.getElementById("punteggio");
    if( punteggioEl ) {
        punteggioEl.innerHTML = punteggio;
    }
    else {
        console.log("No element with id 'punteggio' found.");
    }
}

function update_current_word( current_word ) {
    const current_wordEl = document.getElementById("parola");
    if( current_wordEl ) {
        current_wordEl.innerHTML = current_word;
    }
    else {
        console.log("No element with id 'parola' found.");
    }
}

function update_timer( secondi_rimanenti ) {
    if( secondi_rimanenti <= 0 ) {
        secondi_rimanenti = 0;
    }
    var timer = document.getElementById("timer");
    if( timer ) {
        var minutes = Math.floor(secondi_rimanenti / 60);
        var seconds = secondi_rimanenti % 60;
        timer.innerHTML = minutes.toString().padStart(2, "0") + ":" + seconds.toString().padStart(2, "0");
    }
    else {
        console.log("No element with id 'timer' found.");
    }
}