---
title: 'Reduciendo hasta 4x los costos de bases de datos vectoriales con QDrant y surus'
author:
  name: 'Marian Basti'
  avatar: 'https://avatars.githubusercontent.com/u/31198560'
  bio: 'CTO de surus'
tags: ['qdrant', 'vector-database', 'legal-ai', 'argentina', 'embeddings', 'surus']
featured: true
emoji: '⚖️'
---

En el post de hoy vamos a explorar cómo aprovechar la API de surus para generar embeddings de dimensiones variables de nuestros textos y almacenarlos en Qdrant, una base de datos vectorial de código abierto.

Si sale bien, podremos realizar búsquedas semánticas eficientes sobre grandes volúmenes de documentos.

Como caso de aplicación, usaremos el Boletín Oficial de Argentina (hosteado y actualizado en HuggingFace por su servidor) y evaluaremos las estrategias para reducir los costos de almacenamiento y consulta de embeddings.

### Prefacio: ¿Por qué Qdrant?
Qdrant es un proyecto de código abierto para administrar bases de datos vectoriales y motores de búsqueda de similitud. Permite muy fácilmente crear colecciones de vectores y encontrar los más cercanos a un vector de consulta.

Es increíblemente rápido y está diseñado para escalar a miles de millones de vectores.

## Configuración del Entorno
Primero, configuraremos nuestro servidor de Qdrant localmente usando Docker. Hacerlo así es robusto y apto para producción, y resulta muy fácil trasladarlo a la nube.

Asegúrate de tener Docker instalado y corriendo, luego ejecuta los siguientes comandos:

```bash
# 1. Descargar la última imagen de Qdrant
docker pull qdrant/qdrant

# 2. Correr el contenedor de Qdrant
docker run -d -p 6333:6333 -p 6334:6334 \
    -v "$(pwd)/qdrant_storage:/qdrant/storage:z" \
    qdrant/qdrant
```
Esto iniciará Qdrant y mapeará los puertos 6333 (REST API) y 6334 (gRPC) a tu máquina local. Los datos se guardarán en el directorio `qdrant_storage` en la carpeta actual.

Finalmente, usaremos `python-dotenv` para manejar nuestra API key de forma segura. Crea un archivo `.env` en la raíz de tu proyecto con el siguiente contenido:
```
GS_API_KEY="tu_clave_api_de_surus"
```

Luego, vamos a instalar las librerías que necesitaremos para interactuar con el servicio de Qdrant y la API de embeddings de surus:
```bash
# Crear un entorno virtual (opcional pero recomendado)
python -m venv venv
source venv/bin/activate  # En Linux/Mac
# venv\Scripts\activate  # En Windows
# Instalar dependencias
pip install qdrant-client datasets requests tqdm python-dotenv
```
## Cargando el Dataset y Configurando Clientes
El dataset del Boletín Oficial lo descargaremos de [`marianbasti/boletin-oficial-argentina`](https://huggingface.co/datasets/marianbasti/boletin-oficial-argentina). En ese repositorio almacenamos el resultado de un script que raliza crawlings diarios de la web oficial, con el objetivo de tenerlo en un formato accesible y procesable.

En este paso también configuraremos nuestros clientes para Qdrant y la API de embeddings de surus.

```python
import os
import requests
import qdrant_client
from datasets import load_dataset
from dotenv import load_dotenv
from tqdm.auto import tqdm

# Cargar variables de entorno
load_dotenv()

# Configurar cliente de Qdrant (conectado a nuestra instancia de Docker)
client = qdrant_client.QdrantClient(url="http://localhost:6333")

# Configurar API de surus
GS_API_KEY = os.getenv("GS_API_KEY")
API_URL = "https://api.surus.dev/functions/v1/embeddings"
headers = {"Authorization": "Bearer " + GS_API_KEY}
EMBEDDING_MODEL = "nomic-ai/nomic-embed-text-v2-moe"

# Cargar el dataset
print("Cargando dataset...")
dataset = load_dataset("marianbasti/boletin-oficial-argentina", split="train")
print(dataset)
```

Vamos a usar el modelo `nomic-ai/nomic-embed-text-v2-moe` de nomic-ai. Este es un modelo Matryoshka que permite generar embeddings de texto con una dimensión variable.

Al momento de crear los embeddings, podremos especificar la dimensión que deseamos y optimizar entre tamaño de almacenamiento y precisión.

Este modelo tiene un límite de largo de input de 512 tokens. por lo que:
1. Vamos a usar el endpoint `/tokenize` de surus para obtener los tokens
2. Agarraremos cada entrada de texto, y la chunkeremos en partes de 512 tokens.

## Función para Tokenizar y Chunkear Texto

El modelo de nomic tiene una ventana de contexto máxima de 512 tokens. 

Para manejar esto, empezamos por definir funciones auxiliares para agarrar el texto y tokenizarlo usando la API de surus.

```python
def tokenize_text(text, model=EMBEDDING_MODEL):
    """
    Tokeniza un texto usando la API de surus.
    """
    tokenize_url = "https://api.surus.dev/functions/v1/tokenize"
    data = {
        "model": model,
        "input": text
    }
    headers_tokenize = headers.copy()
    headers_tokenize["Content-Type"] = "application/json"
    
    response = requests.post(tokenize_url, headers=headers_tokenize, json=data)
    response.raise_for_status()
    
    return response.json()['tokens']

def chunk_text_by_tokens(text, max_tokens=512, model=EMBEDDING_MODEL):
    """
    Divide un texto en chunks de máximo max_tokens tokens.
    """
    if not text or not text.strip():
        return []
    
    # Tokenizar el texto completo
    tokens = tokenize_text(text, model)
    
    # Si el texto ya es menor o igual al límite, devolver como un solo chunk
    if len(tokens) <= max_tokens:
        return [text]
    
    # Dividir en chunks
    chunks = []
    for i in range(0, len(tokens), max_tokens):
        chunk_tokens = tokens[i:i + max_tokens]
        # Reconstruir el texto desde los tokens
        # Nota: esto es una aproximación simple, en un caso real podrías
        # necesitar usar el detokenizer específico del modelo
        chunk_text = ' '.join(chunk_tokens)
        chunks.append(chunk_text)
    
    return chunks

# Prueba de la función de chunking
try:
    sample_text = "Este es un texto de prueba muy largo " * 100  # Texto repetitivo para testing
    chunks = chunk_text_by_tokens(sample_text, max_tokens=50)  # Usar 50 tokens para la prueba
    print(f"Texto dividido en {len(chunks)} chunks")
    print(f"Primer chunk: {chunks[0][:100]}...")
    if len(chunks) > 1:
        print(f"Segundo chunk: {chunks[1][:100]}...")
except Exception as e:
    print(f"Error en prueba de chunking: {e}")
```

## Función para Generar Embeddings
Acá actualizamos la función para manejar texto chunkeado y generar embeddings para cada chunk.

```python
def get_embeddings_for_chunks(text, model=EMBEDDING_MODEL, dimension_size=768, max_tokens=512):
    """
    Obtiene embeddings para un texto, dividiéndolo en chunks si es necesario.
    Retorna una lista de embeddings, uno por cada chunk.
    """
    chunks = chunk_text_by_tokens(text, max_tokens=max_tokens, model=model)
    
    if not chunks:
        return []
    
    # Generar embeddings para todos los chunks de una vez
    data = {
        "model": model,
        "input": chunks,
        "dimensions": dimension_size
    }
    headers_embed = headers.copy()
    headers_embed["Content-Type"] = "application/json"
    response = requests.post(API_URL, headers=headers_embed, json=data)
    response.raise_for_status()
    
    return response.json()['data'], chunks

def get_embeddings(texts, model=EMBEDDING_MODEL, dimension_size=768):
    """
    Función original mantenida para compatibilidad con textos ya cortos.
    """
    data = {
        "model": model,
        "input": texts,
        "dimensions": dimension_size
    }
    headers_embed = headers.copy()
    headers_embed["Content-Type"] = "application/json"
    response = requests.post(API_URL, headers=headers_embed, json=data)
    response.raise_for_status()
    
    return response.json()['data']

# Prueba de la función
try:
    sample_text = "Este es un texto de prueba para embeddings con chunking automático."
    embeddings, chunks = get_embeddings_for_chunks(sample_text, dimension_size=768)
    print(f"Generados {len(embeddings)} embeddings para {len(chunks)} chunks")
    EMBEDDING_DIM = len(embeddings[0]['embedding'])
    print(f"Dimensión de los embeddings: {EMBEDDING_DIM}")
except Exception as e:
    print(f"Error al obtener embeddings con chunking: {e}")
    print("Asegúrate de que tu GS_API_KEY es correcta y está en el archivo .env")
```

Prestemos especial atención al parámetro `dimension_size` en la función `get_embeddings`. Este nos permite especificar la dimensión del embedding que queremos generar. Por defecto, usamos 768, pero podemos ajustarlo para reducir el tamaño del almacenamiento.

Es importante pasar este parametro EMBEDDING_DIM a la hora de crear la colección en Qdrant, es necesario definir el tamaño de dimensiones que se espera en la base de datos.

## Testeando Diferentes Dimensiones de Embeddings

Antes de crear la colección entera (y tomarnos el tiempo de indexar mas de 400 mil documentos!), vamos a comparar el desempeño y almacenamiento usando tres dimensiones distintas: **768**, **512** y **256**.

Para esto, primero creamos tres colecciones en Qdrant, cada una con una dimensión diferente.

Luego, indexaremos los mismos 1000 documentos aleatorios del dataset y observaremos el impacto en velocidad, almacenamiento y calidad de búsqueda según la dimensión elegida.

```python
import random

# Seleccionamos 1000 documentos aleatorios del dataset
MAX_TEST_DOCS = 1000
all_indices = list(range(len(dataset)))
random.shuffle(all_indices)
test_indices = all_indices[:MAX_TEST_DOCS]
test_texts = [dataset[i]['full_text'] for i in test_indices if dataset[i]['full_text'] and dataset[i]['full_text'].strip()]

# Definimos las dimensiones a testear
DIMENSIONS_TO_TEST = [768, 512, 256]
test_collection_names = [f"test-boletin-{dim}d" for dim in DIMENSIONS_TO_TEST]

from qdrant_client.models import VectorParams, Distance, PointStruct

for dim, col_name in zip(DIMENSIONS_TO_TEST, test_collection_names):
    print(f"\nCreando colección de test: {col_name} con dimensión {dim}")
    try:
        client.create_collection(
            collection_name=col_name,
            vectors_config=VectorParams(size=dim, distance=Distance.COSINE),
        )
    except Exception as e:
        print(f"Error al crear la colección {col_name}: {e}")

    # Indexamos los documentos en lotes
    BATCH_SIZE = 8
    for i in tqdm(range(0, len(test_texts), BATCH_SIZE), desc=f"Indexando en {col_name}"):
        batch = test_texts[i:i+BATCH_SIZE]
        embeddings = get_embeddings(batch, dimension_size=dim)
        points = [
            PointStruct(
                id=i + j,
                vector=emb['embedding'],
                payload={"text": text},
            )
            for j, (emb, text) in enumerate(zip(embeddings, batch))
        ]
        client.upsert(
            collection_name=col_name,
            points=points,
            wait=False
        )
    print(f"Indexación completada para {col_name}. Total: {len(test_texts)} documentos.")

```

Con esto, tendrás tres colecciones de prueba para comparar cómo afecta la dimensionalidad al almacenamiento y la búsqueda.

## Evaluando Almacenamiento, Velocidad y Resultados de Búsqueda

Ahora vamos a comparar las colecciones creadas en tres aspectos clave:

1. **Tamaño de almacenamiento:** Consultamos el tamaño en disco de cada colección.
2. **Velocidad de búsqueda:** Medimos el tiempo que tarda una búsqueda semántica en cada colección.
3. **Calidad de resultados:** Imprimimos los resultados de una misma consulta en las tres colecciones para comparar la calidad de los resultados.

```python
import time

def get_collection_disk_size(collection_name):
    # Qdrant expone el tamaño en disco por colección en la API REST
    # Usamos el endpoint /collections/{collection_name}
    resp = requests.get(f"http://localhost:6333/collections/{collection_name}")
    resp.raise_for_status()
    info = resp.json()
    size_bytes = info['result']['status']['disk_data_size']
    size_mb = size_bytes / (1024 * 1024)
    return size_mb

def medir_busqueda_y_resultados(query, top_k=3):
    for col_name in test_collection_names:
        print(f"\nColección: {col_name}")
        # Tamaño en disco
        try:
            size_mb = get_collection_disk_size(col_name)
            print(f"Tamaño en disco: {size_mb:.2f} MB")
        except Exception as e:
            print(f"No se pudo obtener el tamaño en disco: {e}")

        # Medir tiempo de búsqueda
        t0 = time.time()
        query_embedding = get_embeddings([query], dimension_size=int(col_name.split('-')[-1][:-1]))[0]
        resultados = client.search(
            collection_name=col_name,
            query_vector=query_embedding,
            limit=top_k,
            with_payload=True
        )
        t1 = time.time()
        print(f"Tiempo de búsqueda: {t1-t0:.3f} segundos")

        # Imprimir resultados
        for i, hit in enumerate(resultados):
            print(f"--- Resultado {i+1} (Score: {hit.score:.4f}) ---")
            print(hit.payload['text'][:300].replace('\n', ' ') + "...")
        print("\n"+"="*60)

# Ejemplo de comparación
consulta = "¿Qué dice la ley sobre suspensiones de personal en una crisis empresarial?"
medir_busqueda_y_resultados(consulta)
```

Con este análisis, podés observar el impacto real de la dimensionalidad en almacenamiento, velocidad y calidad de resultados.

## Creando la Colección en Qdrant
Una vez que hayamos decidido que dimensión de vectores nos convence, vamos a crear la colección completa en Qdrant.

```python
from qdrant_client.models import VectorParams, Distance

collection_name = "boletin-oficial-argentina"

try:
    client.create_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(size=EMBEDDING_DIM, distance=Distance.COSINE), # Acá le decimos la dimensión de los vectores y el tipo de distancia a usar para la búsqueda de similitud
    )
except Exception as e:
    print(f"Error al crear la colección: {e}")
```

## Indexando los Documentos
Los pasos que seguimos son:
1. Agarramos nuestro dataset, iteramos creando chunks de máximo 512 tokens
2. Generamos embeddings para cada chunk con la API de surus y
3. Los agregamos a la colección de Qdrant.

```python
from qdrant_client.models import PointStruct

BATCH_SIZE = 2  # Reducido porque ahora procesamos chunks
MAX_TOKENS_PER_CHUNK = 512

total_docs = len(dataset)
print(f"Indexando {total_docs} documentos en lotes de {BATCH_SIZE}...")

point_id = 0  # Contador global para IDs únicos

for i in tqdm(range(0, total_docs, BATCH_SIZE)):
    batch_data = dataset[i:i+BATCH_SIZE]
    
    # Procesar cada documento del batch
    points_to_insert = []
    
    for doc_idx, doc in enumerate(batch_data):
        text = doc['full_text']
        
        # Filtrar textos vacíos
        if not text or not text.strip():
            continue
        
        try:
            # Generar embeddings con chunking automático
            embeddings, chunks = get_embeddings_for_chunks(
                text, 
                dimension_size=EMBEDDING_DIM, 
                max_tokens=MAX_TOKENS_PER_CHUNK
            )
            
            # Crear un punto por cada chunk
            for chunk_idx, (embedding, chunk_text) in enumerate(zip(embeddings, chunks)):
                point = PointStruct(
                    id=point_id,
                    vector=embedding['embedding'],
                    payload={
                        "text": chunk_text,
                        "document_id": i + doc_idx,  # ID del documento original
                        "chunk_id": chunk_idx,       # ID del chunk dentro del documento
                        "total_chunks": len(chunks)  # Total de chunks del documento
                    },
                )
                points_to_insert.append(point)
                point_id += 1
                
        except Exception as e:
            print(f"Error procesando documento {i + doc_idx}: {e}")
            continue
    
    # Subir todos los puntos del batch a Qdrant
    if points_to_insert:
        client.upsert(
            collection_name=collection_name,
            points=points_to_insert,
            wait=False
        )

print("\nIndexación completada.")
collection_info = client.get_collection(collection_name=collection_name)
print(f"Total de vectores en la colección: {collection_info.vectors_count}")
```

Tené paciencia! Este proceso puede llevar mucho tiempo.

Una vez que termina, ya está! Tenemos una base de datos masiva con todos nuestros documentos indexados en Qdrant, listos para realizar búsquedas semánticas.

Es acá donde observaremos cuánto almacenamiento estamos usando y cómo podemos optimizarlo. Esto escala linealmente con las dimensiones, así que si las reducimos por ejemplo, a la mitad, podemos reducir el costo de almacenamiento a la mitad.

## Buscando en la Base de Datos Legal
Con nuestros documentos indexados, podemos realizar búsquedas semánticas.

```python
def buscar_documentos(query, top_k=5):
    """
    Busca documentos en Qdrant basados en una consulta de texto.
    """
    # 1. Obtener el embedding para la consulta
    query_embedding = get_embeddings([query])[0]
    
    # 2. Realizar la búsqueda en Qdrant
    search_result = client.search(
        collection_name=collection_name,
        query_vector=query_embedding,
        limit=top_k,
        with_payload=True # Para que nos devuelva el texto del documento
    )
    
    return search_result

# Ejemplo de búsqueda
pregunta = "¿Qué dice la ley sobre suspensiones de personal en una crisis empresarial?"
resultados = buscar_documentos(pregunta)

print(f"\n🔍 Resultados para la búsqueda: '{pregunta}'\n")
for i, hit in enumerate(resultados):
    print(f"--- Resultado {i+1} (Score: {hit.score:.4f}) ---")
    # Mostramos los primeros 500 caracteres del texto
    print(hit.payload['text'][:500] + "...")
    print("\n")
```

## ¿Cuánto cuesta almacenar estos vectores?

Cuando querramos mover nuestro proyecto a producción, es importante tener en cuenta el costo de almacenamiento de los embeddings.
Qdrant ofrece una calculadora de precios en su [sitio web](https://cloud.qdrant.io/calculator) que nos permite estimar el costo mensual según el tamaño de los vectores y la cantidad de datos.

## Conclusión
Construiste un motor de búsqueda semántica para buscar a lo largo y ancho de cientos de miles de documentos legales argentinos. Hemos visto cómo:
1.  Configurar Qdrant con Docker para un entorno persistente.
2.  Cargar un dataset de textos legales.
3.  Crear una colección en Qdrant optimizada para búsqueda de similitud.
4.  Indexar miles de documentos en lotes, generando embeddings sobre la marcha con la API de surus.
5.  Realizar búsquedas semánticas para encontrar documentos relevantes a una pregunta en lenguaje natural.

Este es un pilar fundamental para construir aplicaciones de IA Legal más complejas.

## Próximos Pasos
- **RAG (Retrieval-Augmented Generation):** Combina este sistema de búsqueda con un LLM (como los disponibles en surus.dev) para generar respuestas directas a las preguntas, en lugar de solo devolver documentos.
- **Metadatos y Filtros:** Enriquece los `payloads` en Qdrant con metadatos (fechas, tipo de norma, etc.) para permitir búsquedas filtradas, combinando la búsqueda semántica con filtros exactos.
