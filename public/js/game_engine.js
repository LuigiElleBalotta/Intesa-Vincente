var socket = null;
var _roomId = null;
var player_type = null;
var options = null;
const status = {
    timer_active: false,
    socket_connected: false
};

var audio_correct_answer_path = '/audio/correct_answer.mp3';
var audio_wrong_answer_path = '/audio/wrong_answer.mp3';
var audio_prenotation_path = '/audio/prenotazione.mp3';
var audio_word_change_path = '/audio/word_change.mp3';

function init( socket, roomId, privilege, player_name, permissions ) {
    _roomId = roomId;
    socket = socket;
    options = permissions;

    handle_connect(privilege, roomId, player_name)
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
    preventActionIfNotConnected();

    if( !status.timer_active ) {
        socket.emit("start-timer", { roomId: roomId });
        socket.emit("new-random-word", { roomId: roomId });
    }
    else {
        console.error('Timer is active, cannot change word.');
        createToast('Il timer è attivo, non è possibile cambiare parola.', 'error' );
    }
}

function prenota_btn_click() {
    preventActionIfNotConnected();

    if( status.timer_active ) {
        socket.emit("prenota", { roomId: roomId });
    }
    else {
        console.error('Timer is not active, cannot use prenota button.');
        createToast('Il timer non è attivo, non è possibile usare il bottone di prenotazione.', 'error' );
    }
}

function startSwalPrenotation( isRispostaPrenotata = true ) {
    let timerInterval
    Swal.fire({
        title: isRispostaPrenotata ? 'Risposta prenotata!' : "Passo usato!",
        html: isRispostaPrenotata ? 'Sono rimasti <b></b> secondi per rispondere.' : 'I giocatori hanno usato un "PASSO". Fra <b></b> secondi sparirà questo popup.',
        timer: 5000,
        timerProgressBar: true,
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading()
            const b = Swal.getHtmlContainer().querySelector('b')
            timerInterval = setInterval(() => {
                b.textContent = Math.floor((Swal.getTimerLeft()/1000) % 60);
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
    preventActionIfNotConnected();
    socket.emit("update-score", { roomId, method: 'add' });
}

function on_sottrai_clicked() {
    preventActionIfNotConnected();
    socket.emit("update-score", { roomId, method: 'sub' });
}

function updateTime(method) {
    preventActionIfNotConnected();

    if( !status.timer_active ) {
        socket.emit("manually-update-time", { roomId: roomId, method: method });
    }
    else {
        console.error('Timer is active, cannot manually update time.');
        createToast('Il timer è attivo, non è possibile aggiornarlo manualmente.', 'error' );
    }
}

function createToast( message, icon = 'info', timer = 3000) {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: timer,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer)
            toast.addEventListener('mouseleave', Swal.resumeTimer)
        }
    })

    Toast.fire({
        icon: icon,
        title: message
    })
}

function playAudio(path) {
    let audio = new Audio(path);
    audio.play();
}

// Socket.IO related functions.
function handle_connect( privilege, id, player_name ) {
    socket.on("connect", function () {
        console.log("[Socket.IO] Connected to server");
        status.socket_connected = true;
        createToast('Ti sei connesso al server di gioco.', 'success')
        player_type = privilege;
        roomId = id;
        socket.emit("joinRoom", { roomId: roomId, player_type: privilege, player_name: player_name, privilege: privilege })
    });
}

function handle_disconnect() {
    socket.on("disconnect", function ( reason ) {
        console.log("[Socket.IO] Disconnected from server. Reason: ", reason);
        status.socket_connected = false;
        createToast('Sei stato disconnesso dal server di gioco.', 'success')
    });
}

function handle_on_joined_room() {
    socket.on("on-joined-room", function (data) {
        console.log("[Socket.IO] on-joined-room", data);
        createToast(data.who + ' ha joinato la stanza.', 'info' );
        handle_serverside_stats(data.stats);
    });
}

function handle_on_new_random_word() {
    socket.on("received-new-random-word", function (data) {
        if( options && options.view_word ) {
            console.log("[Socket.IO] on-new-random-word", data);
            update_current_word(data.random_word);
        }
        playAudio(audio_word_change_path);
        createToast('Nuova parola generata!', 'info' );
    });
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
        playAudio(audio_prenotation_path);
        if( data.privilege !== 'conduttore' ) {
            createToast(`${data.who} ha prenotato la risposta!`, 'success' );
        }
        else {
            createToast(`${data.who} premuto il bottone "PASSO"!`, 'warning' );
        }
        startSwalPrenotation( data.privilege === 'conduttore' ? false : true );
    });
}

function handle_on_updated_score() {
    socket.on("updated-score", function (data) {
        console.log("[Socket.IO] on-updated-score", data);
        update_punteggio( data.score );
        createToast('Punteggio aggiornato!', 'info' );
        if( data.method === 'add' ) {
            playAudio(audio_correct_answer_path);
        }
        else {
            playAudio(audio_wrong_answer_path);
        }
    });
}

function handle_on_updated_time() {
    socket.on("updated-time", function (data) {
        console.log("[Socket.IO] updated-time", data);
        update_timer( data.time );
        createToast('Il timer è stato aggiornato!', 'info' );
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

function preventActionIfNotConnected() {
    if(!status.socket_connected ) {
        createToast('Non sei connesso al server di gioco.', 'error');
        return;
    }
}