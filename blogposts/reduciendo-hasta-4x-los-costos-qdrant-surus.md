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
El dataset del Boletín Oficial lo descargaremos de HuggingFace, con ID `marianbasti/boletin-oficial-argentina`. En este paso también configuraremos nuestros clientes para Qdrant y la API de embeddings de surus.

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

 Al momento de crear los embeddings, podremos especificar la dimensión que deseamos, lo que nos permitirá optimizar costos al almacenar solo los vectores necesarios.

## Función para Generar Embeddings
Acá definimos una función auxiliar para obtener los embeddings de un lote de textos usando la API de surus.

```python
def get_embeddings(texts, model=EMBEDDING_MODEL, dimension_size=768):
    """
    Obtiene embeddings para una lista de textos usando la API de surus.
    """
    data = {
        "model": model,
        "input": texts,
        "dimensions": dimension_size
    }
    headers["Content-Type"] = "application/json"
    response = requests.post(API_URL, headers=headers, json=data)
    response.raise_for_status()  # Lanza un error si la petición falla
    
    return response.json()['data']

# Prueba rápida de la función
try:
    sample_embedding = get_embeddings(["Este es un texto de prueba."])
    EMBEDDING_DIM = len(sample_embedding[0]['embedding'])
    print(f"Dimensión de los embeddings: {EMBEDDING_DIM}")
except Exception as e:
    print(f"Error al obtener embedding de prueba: {e}")
    print("Asegúrate de que tu GS_API_KEY es correcta y está en el archivo .env")
```

Prestemos especial atención al parámetro `dimension_size` en la función `get_embeddings`. Este nos permite especificar la dimensión del embedding que queremos generar. Por defecto, usamos 768, pero podemos ajustarlo para reducir el tamaño del almacenamiento.

Es importante pasar este parametro EMBEDDING_DIM a la hora de crear la colección en Qdrant, es necesario definir el tamaño de dimensiones que se espera en la base de datos.

## Testeando Diferentes Dimensiones de Embeddings

Antes de crear la colección entera (y tomarnos el tiempo de indexar mas de 400 mil documentos!), vamos a comparar el desempeño y almacenamiento usando tres dimensiones distintas: **768**, **512** y **256**. Para esto, crearemos tres colecciones en Qdrant, cada una con una dimensión diferente.

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

# Ahora puedes comparar el uso de almacenamiento y la calidad de búsqueda en cada colección.
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
1. Agarramos nuestro dataset, iteramos creando chunks
2. Generamos embeddings para los textos con la API de surus y
3. Los agregamos a la colección de Qdrant.

```python
from qdrant_client.models import PointStruct

BATCH_SIZE = 4 # TODO: encontrar el sweet spot entre velocidad y capacidad del endpoint

total_docs = len(dataset)
print(f"Indexando {total_docs} documentos en lotes de {BATCH_SIZE}...")

for i in tqdm(range(0, total_docs, BATCH_SIZE)):
    batch_texts = dataset[i:i+BATCH_SIZE]['full_text']
    
    # Filtrar textos vacíos que pueden causar errores
    valid_texts = [text for text in batch_texts if text and text.strip()]
    if not valid_texts:
        continue

    # Generar embeddings
    embeddings = get_embeddings(valid_texts)
    
    # Crear puntos para Qdrant
    # Necesitamos mapear los índices de valid_texts de vuelta a los originales del batch
    original_indices = [idx for idx, text in enumerate(batch_texts) if text and text.strip()]
    
    points = [
        PointStruct(
            id=i + original_indices[j], # ID único para cada punto
            vector=embedding['embedding'],
            payload={"text": text},
        )
        for j, (embedding, text) in enumerate(zip(embeddings, valid_texts))
    ]
    
    # Subir puntos a Qdrant
    client.upsert(
        collection_name=collection_name,
        points=points,
        wait=False # Hacemos el upsert asíncrono para mayor velocidad
    )

print("\nIndexación completada.")
collection_info = client.get_collection(collection_name=collection_name)
print(f"Total de vectores en la colección: {collection_info.vectors_count}")
```

Tené paciencia! Este proceso puede llevar mucho tiempo.

Una vez que termina, ya está! Tenemos nuestros documentos indexados en Qdrant, listos para realizar búsquedas semánticas.

Es acá donde observaremos cuánto almacenamiento estamos usando y cómo podemos optimizarlo. Esto escala linealmente, así que reduciendo las dimensiones, por ejemplo, a la mitad, podemos reducir el costo de almacenamiento a la mitad.

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


## Conclusión
¡Felicidades! Has construido un motor de búsqueda semántica para documentos legales argentinos. Hemos visto cómo:
1.  Configurar Qdrant con Docker para un entorno persistente y una API de embeddings como la de surus.
2.  Cargar un dataset de textos legales.
3.  Crear una colección en Qdrant optimizada para búsqueda de similitud.
4.  Indexar miles de documentos en lotes, generando embeddings sobre la marcha.
5.  Realizar búsquedas semánticas para encontrar documentos relevantes a una pregunta en lenguaje natural.

Este es un pilar fundamental para construir aplicaciones de IA Legal más complejas.

## Próximos Pasos
- **RAG (Retrieval-Augmented Generation):** Combina este sistema de búsqueda con un LLM (como los disponibles en surus.dev) para generar respuestas directas a las preguntas, en lugar de solo devolver documentos.
- **Metadatos y Filtros:** Enriquece los `payloads` en Qdrant con metadatos (fechas, tipo de norma, etc.) para permitir búsquedas filtradas, combinando la búsqueda semántica con filtros exactos.
