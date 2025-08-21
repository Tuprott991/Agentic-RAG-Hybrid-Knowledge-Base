# Agentic RAG 2.0 Testing Phase 1 for T&C + things to note document

As research, to solve the problem, I would built my system with:
- Pydatic AI: AI Agent Framework (lightweight and less layer than langchain, I guess)
- Graphiti: Building knowledge graph (fast & accruate graph retrieve, also can custom define the graph Ontology)
- Vertex AI API: For Gemini 2.5 LLM as a core Agent, text-embeddings-005 API,...\
- Databases:
    + PostgreSQL: Store chat history, conversation and vector (with vector extension)
    + NEO4J: Store knowledge graph with inssurance custom ontology
