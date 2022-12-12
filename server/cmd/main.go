package main

import (
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"sort"
	"sync"
	"time"

	"github.com/gorilla/websocket"

	cors "github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

type clientInfo struct {
	User  string `json:"pilot"`
	Score int    `json:"score"`
}

type messageInfo struct {
	CreatedTime int64  `json:"created_time"`
	Content     string `json:"content"`
	User        string `json:"pilot"`
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
} // use default options
var clients map[*websocket.Conn]*clientInfo = make(map[*websocket.Conn]*clientInfo)
var clientMutex sync.Mutex
var scores []*clientInfo = make([]*clientInfo, 0)
var scoreMutex sync.Mutex
var messages []*messageInfo = make([]*messageInfo, 0)
var messageMutex sync.Mutex

func StartHTTPServer() error {
	// Create a gin router with default middleware
	path := gin.Default()
	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowCredentials = true
	config.AllowHeaders = []string{"Content-Type", "Content-Length", "Accept-Encoding", "X-CSRF-Token", "Authorization", "accept", "Origin", "Cache-Control", "X-Requested-With"}
	path.Use(cors.New(config))

	apiPath := path.Group("")
	registerDataStructureRoute(apiPath)

	return path.Run(":3080")
}

func registerDataStructureRoute(r *gin.RouterGroup) {
	r.GET("/connect_client", connectClient)
}

func addMessage(c *websocket.Conn, content string) {
	clientMutex.Lock()
	messageMutex.Lock()
	var client = clients[c]
	messages = append(messages, &messageInfo{time.Now().Unix(), content, client.User})
	l := len(messages)
	if l > 6 {
		messages = messages[l-6 : l]
	}
	messageMutex.Unlock()
	clientMutex.Unlock()
}

func reorderRanking() {
	clientMutex.Lock()
	scoreMutex.Lock()
	scores = make([]*clientInfo, 0)
	for _, v := range clients {
		scores = append(scores, v)
	}

	sort.Slice(scores, func(i, j int) bool {
		return scores[i].Score > scores[j].Score
	})

	if len(scores) > 5 {
		scores = scores[0:5]
	}

	scoreMutex.Unlock()
	clientMutex.Unlock()
}

func sendRanking() {
	clientMutex.Lock()
	scoreMutex.Lock()
	for client := range clients {
		err := client.WriteJSON(map[string]interface{}{
			"type": "rank",
			"data": scores,
		})

		if err != nil {
			delete(clients, client)
		}
	}
	scoreMutex.Unlock()
	clientMutex.Unlock()
}

func sendMessages() {
	clientMutex.Lock()
	messageMutex.Lock()
	for client := range clients {
		err := client.WriteJSON(map[string]interface{}{
			"type": "msg",
			"data": messages,
		})

		if err != nil {
			delete(clients, client)
		}
	}
	messageMutex.Unlock()
	clientMutex.Unlock()
}

type payload struct {
	Score    int    `json:"score"`
	Content  string `json:"content"`
	GameOver bool   `json:"game_over"`
}

func connectClient(g *gin.Context) {
	w := g.Writer
	r := g.Request
	c, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Print("upgrade:", err)
		return
	}
	defer c.Close()

	// upon connect
	code := int(time.Now().Unix()%10000) + (rand.Intn(90)+10)*10000
	err = c.WriteJSON(map[string]interface{}{
		"type": "code",
		"code": fmt.Sprintf("Pilot-%v", code),
	})

	if err != nil {
		log.Println("write:", err)
		return
	}

	clientMutex.Lock()
	clients[c] = &clientInfo{fmt.Sprintf("Pilot-%v", code), 0}
	clientMutex.Unlock()

	reorderRanking()

	for {
		var pl payload
		err := c.ReadJSON(&pl)
		if err != nil {
			clientMutex.Lock()
			delete(clients, c)
			clientMutex.Unlock()
			break
		}

		if pl.Content != "" {
			addMessage(c, pl.Content)
			sendMessages()
		}

		if pl.GameOver {
			clientMutex.Lock()
			delete(clients, c)
			clientMutex.Unlock()
			break
		}

		if pl.Score != 0 {
			clientMutex.Lock()
			if cl, ok := clients[c]; ok {
				cl.Score = pl.Score
			}
			clientMutex.Unlock()
			reorderRanking()
			sendRanking()
		}
	}
}

func main() {
	StartHTTPServer()
}
