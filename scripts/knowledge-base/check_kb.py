from kb_modules.vector_store import VectorStore
from kb_modules.config import get_config

config = get_config()
vs = VectorStore(url=config["qdrant_url"], api_key=config["qdrant_api_key"])

print('Collections:')
print(vs.client.get_collections())

print('\nScrolling points:')
try:
    result = vs.client.scroll(collection_name='pooper-knowledge', limit=10, with_payload=True)
    points, next_page_offset = result
    print(f'Found {len(points)} points')
    for point in points:
        print(f'ID: {point.id}')
        print(f'Payload: {point.payload}')
except Exception as e:
    print(f'Error: {e}') 