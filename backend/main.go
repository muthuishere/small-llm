package main

import (
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/muthuishere/small-llm/backend/config"
	"github.com/muthuishere/small-llm/backend/handlers"
	"github.com/muthuishere/small-llm/backend/llm"
	"github.com/muthuishere/small-llm/backend/middleware"
)

// @title           Small LLM API
// @version         1.0
// @description     Local LLM inference backend using llama.cpp and Qwen 0.5B.
// @host            localhost:8080
// @BasePath        /
func main() {
	cfg := config.New()
	mgr := llm.NewManager(cfg)

	log.Println("Initializing LLM manager (download model + binary, start server)...")
	if err := mgr.Start(); err != nil {
		log.Fatalf("Failed to start LLM manager: %v", err)
	}
	defer mgr.Stop()

	r := gin.Default()
	r.Use(middleware.CORS())

	api := r.Group("/api")
	{
		api.GET("/health", handlers.Health())
		api.GET("/status", statusHandler(mgr))
		api.POST("/chat", handlers.Chat(mgr))
		api.POST("/chatwithobject", handlers.ChatWithObject(mgr))
		api.POST("/chatwithtools", handlers.ChatWithTools(mgr))
	}

	addr := ":" + strconv.Itoa(config.BackendPort)
	log.Printf("Backend listening on %s", addr)
	if err := r.Run(addr); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server error: %v", err)
	}
}

// statusHandler returns model/server status.
//
// @Summary      Get system status
// @Description  Returns model download status, llama-server running status, and model name.
// @Tags         health
// @Produce      json
// @Success      200  {object}  llm.Status
// @Router       /api/status [get]
func statusHandler(mgr *llm.Manager) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, mgr.GetStatus())
	}
}
