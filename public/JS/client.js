
window.onload = function () {
    let socket ;
    const documentId = new URL(window.location.href).pathname.split('/')[1] || 'test';
    // console.log(documentId);
    
    const handle = document.getElementById('handle');
    const register = document.getElementById('register');
    
    const editor = document.getElementById('editor');
    const textarea = document.getElementById('textarea');
    var Codeeditor = CodeMirror.fromTextArea(document.getElementById("textarea"), {
                styleActiveLine: true,
                lineNumbers: true,
                matchBrackets: true
            }); 
    console.log(editor)

    let syncValue = Array();
    let keypressed = false;

    function addEditor(writer) {
        var ul = document.getElementById("editors");
        var li = document.createElement("li");
        li.appendChild(document.createTextNode(writer.name));
        li.className = "list-group-item";
        li.id = writer.id;
        ul.appendChild(li);
    }

    function removeElement(id) {
        var elem = document.getElementById(id);
        return elem.parentNode.removeChild(elem);
    }
    function applyLocalChanges() {
        if (keypressed) {
            let currentData = Codeeditor.getValue();
            // console.log(currentData);
            let input = Array.from(syncValue);
            let output = Array.from(currentData);
            let changes = getChanges(input, output);
            applyChanges(input, changes);
            if (output.join('') == input.join('')) {
                socket.emit('content_change', {
                    documentId: documentId,
                    changes: changes
                });
                syncValue = input;
            }
            keypressed = false;
        }
    }
    function setSocketEvents() {
        socket.on('content_change', (incomingChanges) => {
            let input = Array.from(syncValue);
            applyChanges(input, incomingChanges);
            syncValue = input;
            applyLocalChanges();

            // let ranges = editor.getSelection().getRanges();
            Codeeditor.setValue(syncValue.join(''))
            // editor.getSelection().selectRanges(ranges);
        });
        socket.on('register', (data) => {
            addEditor(data);
        });

        socket.on('user_left', (data) => {
            removeElement(data.id);
        });
        socket.on('members', (members) => {
            members.forEach(member => {
                addEditor(member);
            });
            socket.off('members');
        });
    }

    function registerUserListener() {
        handle.style.display = 'none';
        register.style.display = 'none';

        const editorBlock = document.getElementById('editor-block');
        editorBlock.style.display = 'block';
        syncValue = "";
        socket = io();
        socket.emit('register', {
            handle: handle.value,
            documentId: documentId
        });
        setSocketEvents();
    }

    function getChanges(input, output) {
        return diffToChanges(diff(input, output), output);
    }

    function applyChanges(input, changes) {
        changes.forEach(change => {
            if (change.type == 'insert') {
                input.splice(change.index, 0, ...change.values);
            } else if (change.type == 'delete') {
                input.splice(change.index, change.howMany);
            }
        });
    }

    var timeout = setTimeout(null, 0);
    editor.addEventListener('keypress', () => {
        clearTimeout(timeout);
        keypressed = true;
        timeout = setTimeout(applyLocalChanges, 1000);
    });

    register.addEventListener('click', registerUserListener);


    let socket = io('/')
    const ROOM_ID = documentId;
    
    const videoGrid = document.getElementById("video-grid");
    const myVideo = document.createElement("video");
    const showChat = document.querySelector("#showChat");
    const backBtn = document.querySelector(".header__back");
    myVideo.muted = true;
    
    backBtn.addEventListener("click", () => {
      document.querySelector(".main__left").style.display = "flex";
      document.querySelector(".main__left").style.flex = "1";
      document.querySelector(".main__right").style.display = "none";
      document.querySelector(".header__back").style.display = "none";
    });
    
    showChat.addEventListener("click", () => {
      document.querySelector(".main__right").style.display = "flex";
      document.querySelector(".main__right").style.flex = "1";
      document.querySelector(".main__left").style.display = "none";
      document.querySelector(".header__back").style.display = "block";
    });
    
    const user = prompt("Enter your name");
    
    var peer = new Peer(undefined, {
      path: "/peerjs",
      host: "/",
      port: "443",
    });
    
    let myVideoStream;
    navigator.mediaDevices
      .getUserMedia({
        audio: true,
        video: true,
      })
      .then((stream) => {
        myVideoStream = stream;
        addVideoStream(myVideo, stream);
    
        peer.on("call", (call) => {
          call.answer(stream);
          const video = document.createElement("video");
          call.on("stream", (userVideoStream) => {
            addVideoStream(video, userVideoStream);
          });
        });
    
        socket.on("user-connected", (userId) => {
          connectToNewUser(userId, stream);
        });
      });
    
    const connectToNewUser = (userId, stream) => {
      const call = peer.call(userId, stream);
      const video = document.createElement("video");
      call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream);
      });
    };
    
    peer.on("open", (id) => {
      socket.emit("join-room", ROOM_ID, id, user);
    });
    
    const addVideoStream = (video, stream) => {
      video.srcObject = stream;
      video.addEventListener("loadedmetadata", () => {
        video.play();
        videoGrid.append(video);
      });
    };
    
    let text = document.querySelector("#chat_message");
    let send = document.getElementById("send");
    let messages = document.querySelector(".messages");
    
    send.addEventListener("click", (e) => {
      if (text.value.length !== 0) {
        socket.emit("message", text.value);
        text.value = "";
      }
    });
    
    text.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && text.value.length !== 0) {
        socket.emit("message", text.value);
        text.value = "";
      }
    });
    
    const inviteButton = document.querySelector("#inviteButton");
    const muteButton = document.querySelector("#muteButton");
    const stopVideo = document.querySelector("#stopVideo");
    muteButton.addEventListener("click", () => {
      const enabled = myVideoStream.getAudioTracks()[0].enabled;
      if (enabled) {
        myVideoStream.getAudioTracks()[0].enabled = false;
        html = `<i class="fas fa-microphone-slash"></i>`;
        muteButton.classList.toggle("background__red");
        muteButton.innerHTML = html;
      } else {
        myVideoStream.getAudioTracks()[0].enabled = true;
        html = `<i class="fas fa-microphone"></i>`;
        muteButton.classList.toggle("background__red");
        muteButton.innerHTML = html;
      }
    });
    
    stopVideo.addEventListener("click", () => {
      const enabled = myVideoStream.getVideoTracks()[0].enabled;
      if (enabled) {
        myVideoStream.getVideoTracks()[0].enabled = false;
        html = `<i class="fas fa-video-slash"></i>`;
        stopVideo.classList.toggle("background__red");
        stopVideo.innerHTML = html;
      } else {
        myVideoStream.getVideoTracks()[0].enabled = true;
        html = `<i class="fas fa-video"></i>`;
        stopVideo.classList.toggle("background__red");
        stopVideo.innerHTML = html;
      }
    });
    
    inviteButton.addEventListener("click", (e) => {
      prompt(
        "Copy this link and send it to people you want to meet with",
        window.location.href
      );
    });
    
    socket.on("createMessage", (message, userName) => {
      messages.innerHTML =
        messages.innerHTML +
        `<div class="message">
            <b><i class="far fa-user-circle"></i> <span> ${
              userName === user ? "me" : userName
            }</span> </
            <span>${message}</span>
        </div>`;
    });
    
    

}    


