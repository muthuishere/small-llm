.PHONY: build run tidy swagger clean

build: tidy
	go build -o bin/small-llm-backend ./...

run: tidy
	go run main.go

tidy:
	go mod tidy

swagger:
	swag init -g main.go --output docs

clean:
	rm -rf bin/ docs/
