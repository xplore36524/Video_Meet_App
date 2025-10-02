package server

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

// AllRooms is the global hashmap for the server
var AllRooms RoomMap

// Logic to create a new room
func CreateRoomRequestHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	roomID := AllRooms.CreateRoom()
	type resp struct {
		RoomID string `json:"room_id"`
	}

	log.Println(AllRooms.Map)
	json.NewEncoder(w).Encode(resp{RoomID: roomID})
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type broadcastMsg struct {
	Message map[string]interface{}
	RoomID  string
	Client  *websocket.Conn
}

var broadcast = make(chan broadcastMsg)

func broadcaster() {
	for {
		msg := <-broadcast

		for _, client := range AllRooms.Map[msg.RoomID] {
			if client.Conn != msg.Client {
				err := client.Conn.WriteJSON(msg.Message)

				if err != nil {
					log.Fatal(err)
					client.Conn.Close()
				}
			}
		}
	}
}

// Logic to join an existing room
func JoinRoomRequestHandler(w http.ResponseWriter, r *http.Request) {
	roomID, ok := r.URL.Query()["roomID"]

	if !ok {
		log.Println("roomID missing in URL Parameters")
		return
	}

	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Fatal("Web Socket Upgrade Error", err)
	}

	AllRooms.InsertIntoRoom(roomID[0], false, ws)

	// go broadcaster()

	for {
		var msg broadcastMsg

		err := ws.ReadJSON(&msg.Message)
		if err != nil {
			log.Fatal("Read Error: ", err)
		}

		msg.Client = ws
		msg.RoomID = roomID[0]

		log.Println(msg.Message)

		broadcast <- msg
	}
}

// func JoinRoomRequestHandler(w http.ResponseWriter, r *http.Request) {
// 	roomID, ok := r.URL.Query()["roomID"]
// 	if !ok {
// 		log.Println("roomID missing in URL Parameters")
// 		return
// 	}

// 	ws, err := upgrader.Upgrade(w, r, nil)
// 	if err != nil {
// 		log.Println("Web Socket Upgrade Error:", err)
// 		return
// 	}

// 	// Add client to room
// 	AllRooms.InsertIntoRoom(roomID[0], false, ws)

// 	go func() {
// 		defer func() {
// 			// Remove client when it disconnects
// 			// AllRooms.RemoveFromRoom(roomID[0], ws)
// 			ws.Close()
// 		}()

// 		for {
// 			var msg broadcastMsg
// 			err := ws.ReadJSON(&msg.Message)
// 			if err != nil {
// 				log.Println("Read Error:", err)
// 				break
// 			}

// 			msg.Client = ws
// 			msg.RoomID = roomID[0]

// 			// Send to broadcaster
// 			broadcast <- msg
// 		}
// 	}()
// }

// Run broadcaster once (not per client)
func StartBroadcaster() {
	go broadcaster()
}
