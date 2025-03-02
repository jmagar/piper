from kb_modules.vector_store import VectorStore
from kb_modules.config import load_environment

config = load_environment()
vs = VectorStore(url=config.qdrant_url, api_key=config.qdrant_api_key, collection_name='pooper-knowledge')

print('Collections:')
print(vs.client.get_collections())

print('
Scrolling points:')
try:
    result = vs.client.scroll(collection_name='pooper-knowledge', limit=10, with_payload=True)
    print(f'Found {len(result.points)} points')
    for point in result.points:
        print(f'ID: {point.id}')
        print(f'Payload: {point.payload}')
except Exception as e:
    print(f'Error: {e}')
