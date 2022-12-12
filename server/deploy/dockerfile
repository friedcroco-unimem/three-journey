FROM golang:1.18-alpine

ENV PORT=3080
ENV TZ=Asia/Ho_Chi_Minh

WORKDIR /awale
COPY . .

RUN go build -mod=mod -o ./bin/api ./cmd

ENTRYPOINT ["./bin/api"]