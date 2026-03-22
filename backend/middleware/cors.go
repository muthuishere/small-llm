package middleware

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// CORS returns a permissive CORS middleware suitable for local development.
func CORS() gin.HandlerFunc {
	cfg := cors.DefaultConfig()
	cfg.AllowAllOrigins = true
	cfg.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	cfg.AllowHeaders = []string{"Origin", "Content-Type", "Authorization"}
	return cors.New(cfg)
}
