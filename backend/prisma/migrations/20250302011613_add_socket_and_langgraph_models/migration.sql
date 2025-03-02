-- CreateTable
CREATE TABLE "socket_events" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_type" TEXT NOT NULL,
    "socket_id" TEXT NOT NULL,
    "user_id" TEXT,
    "payload" JSONB,
    "duration" INTEGER,
    "client_info" JSONB,

    CONSTRAINT "socket_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "langgraph_state" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "thread_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "ttl" TIMESTAMP(3),
    "is_completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "langgraph_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cached_llm_responses" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "input_hash" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "token_count" INTEGER,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "cached_llm_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "socket_events_socket_id_idx" ON "socket_events"("socket_id");

-- CreateIndex
CREATE INDEX "socket_events_event_type_idx" ON "socket_events"("event_type");

-- CreateIndex
CREATE INDEX "socket_events_created_at_idx" ON "socket_events"("created_at");

-- CreateIndex
CREATE INDEX "langgraph_state_conversation_id_idx" ON "langgraph_state"("conversation_id");

-- CreateIndex
CREATE INDEX "langgraph_state_ttl_idx" ON "langgraph_state"("ttl");

-- CreateIndex
CREATE UNIQUE INDEX "langgraph_state_thread_id_key" ON "langgraph_state"("thread_id");

-- CreateIndex
CREATE UNIQUE INDEX "cached_llm_responses_input_hash_key" ON "cached_llm_responses"("input_hash");

-- CreateIndex
CREATE INDEX "cached_llm_responses_input_hash_idx" ON "cached_llm_responses"("input_hash");

-- CreateIndex
CREATE INDEX "cached_llm_responses_expires_at_idx" ON "cached_llm_responses"("expires_at");

-- AddForeignKey
ALTER TABLE "socket_events" ADD CONSTRAINT "socket_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "langgraph_state" ADD CONSTRAINT "langgraph_state_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
