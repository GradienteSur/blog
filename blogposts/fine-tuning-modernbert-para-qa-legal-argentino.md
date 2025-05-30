---
title: 'Fine-tuning ModernBERT para Q&A Legal Argentino'
author:
  name: 'Marian Basti'
  avatar: 'https://avatars.githubusercontent.com/u/31198560'
  bio: 'CTO de surus'
tags: ['modernbert', 'fine-tuning', 'legal-ai', 'argentina', 'embeddings', 'Q&A']
featured: true
emoji: '⚖️'
# Todo lo demás se genera automáticamente: excerpt, slug, readTime, publishedAt, metadata
---

Trabajar con documentos legales presenta una barrera linguística característica: terminología especializada, estructura formal y la necesidad de precisión absoluta. En este tutorial, vamos a explorar cómo entrenar **ModernBERT-large** usando el dataset `marianbasti/boletin-oficial-argentina-questions` para crear un sistema de Q&A especializado en documentos legales argentinos.

Este dataset lo desarrollé como una colaboración entre SandboxAI e IdeaLab/CITECCA durante mi trabajo en la Universidad Nacional de Río Negro. Contiene textos extraídos del Boletín Oficial junto con preguntas contextualmente relevantes, pensado para entrenar modelos de embeddings en el ámbito legal argentino.

## ¿Por qué ModernBERT para Documentos Legales?

Según su [blogpost](https://huggingface.co/blog/modernbert), ModernBERT representa una evolución significativa de la arquitectura BERT, ofreciendo:

- **Mejor comprensión contextual** para textos largos y complejos
- **Eficiencia mejorada** en el entrenamiento y la inferencia
- **Capacidades multilingües** ideales para el español legal argentino
- **Arquitectura optimizada** para tareas de recuperación de información

## Configuración del Entorno

Empecemos configurando nuestro entorno de entrenamiento:

```python
# Instalar dependencias necesarias
pip install transformers datasets torch accelerate wandb sentence-transformers evaluate
```

```python
import torch
from transformers import (
    AutoTokenizer, 
    AutoModel, 
    TrainingArguments, 
    Trainer,
    DataCollatorWithPadding
)
from datasets import load_dataset
from sentence_transformers import SentenceTransformer, InputExample, losses
from sentence_transformers.evaluation import EmbeddingSimilarityEvaluator
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import wandb

# Configurar el dispositivo
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Usando dispositivo: {device}")
```

## Cargando y Explorando el Dataset

Vamos a cargar el dataset del Boletín Oficial y explorar su estructura:

```python
# Cargar el dataset
dataset = load_dataset("marianbasti/boletin-oficial-argentina-questions")

print("Estructura del dataset:")
print(dataset)
print("\nEjemplo de datos:")
print(dataset['train'][0])

# Explorar estadísticas básicas
def explorar_dataset(data):
    """Analizar características del dataset"""
    contexts = [item['context'] for item in data]
    questions = [item['question'] for item in data]
    
    print(f"Total de ejemplos: {len(contexts)}")
    print(f"Longitud promedio del contexto: {np.mean([len(c) for c in contexts]):.0f} caracteres")
    print(f"Longitud promedio de preguntas: {np.mean([len(q) for q in questions]):.0f} caracteres")
    print(f"Contexto más largo: {max(len(c) for c in contexts)} caracteres")
    print(f"Contexto más corto: {min(len(c) for c in contexts)} caracteres")

explorar_dataset(dataset['train'])
```

## Preparando los Datos para Sentence-BERT

Para entrenar un modelo de embeddings efectivo, vamos a usar la biblioteca sentence-transformers:

```python
def preparar_ejemplos_entrenamiento(dataset_split):
    """
    Convertir el dataset a ejemplos de InputExample para sentence-transformers
    """
    ejemplos = []
    
    for item in dataset_split:
        # Crear pares positivos (pregunta, contexto relevante)
        ejemplo = InputExample(
            texts=[item['question'], item['context']], 
            label=1.0  # Etiqueta positiva para pares relevantes
        )
        ejemplos.append(ejemplo)
    
    return ejemplos

# Preparar ejemplos de entrenamiento
train_examples = preparar_ejemplos_entrenamiento(dataset['train'])
print(f"Ejemplos de entrenamiento preparados: {len(train_examples)}")

# Mostrar un ejemplo
print(f"\nEjemplo de entrenamiento:")
print(f"Pregunta: {train_examples[0].texts[0][:100]}...")
print(f"Contexto: {train_examples[0].texts[1][:100]}...")
print(f"Etiqueta: {train_examples[0].label}")
```

## Inicializando el Modelo ModernBERT

Vamos a cargar y configurar ModernBERT para nuestro fine-tuning:

```python
# Inicializar el modelo base
model_name = "answerdotai/ModernBERT-large"

# Crear el modelo de sentence-transformers
model = SentenceTransformer(model_name)

print(f"Modelo cargado: {model_name}")
print(f"Dimensión de embeddings: {model.get_sentence_embedding_dimension()}")
print(f"Longitud máxima de secuencia: {model.max_seq_length}")

# Configurar la longitud máxima para documentos legales
model.max_seq_length = 512  # Ajustar según necesidades
```

## Configurando el Entrenamiento

Definimos la función de pérdida y parámetros de entrenamiento:

```python
# Configurar la función de pérdida
train_loss = losses.CosineSimilarityLoss(model)

# Configurar parámetros de entrenamiento
num_epochs = 3
warmup_steps = int(len(train_examples) * num_epochs * 0.1)
batch_size = 16

print(f"Pasos de calentamiento: {warmup_steps}")
print(f"Épocas de entrenamiento: {num_epochs}")
print(f"Tamaño de lote: {batch_size}")
```

## Preparando Evaluación

Creamos un conjunto de evaluación para monitorear el progreso:

```python
def crear_evaluador(dataset_split, num_samples=500):
    """
    Crear evaluador para medir similitud semántica
    """
    # Seleccionar muestra aleatoria para evaluación
    indices = np.random.choice(len(dataset_split), min(num_samples, len(dataset_split)), replace=False)
    
    preguntas = []
    contextos = []
    scores = []
    
    for idx in indices:
        item = dataset_split[idx]
        preguntas.append(item['question'])
        contextos.append(item['context'])
        scores.append(1.0)  # Todos son pares positivos
    
    evaluator = EmbeddingSimilarityEvaluator(
        preguntas, 
        contextos, 
        scores,
        name="boletin_oficial_eval"
    )
    
    return evaluator

# Crear evaluador
if 'validation' in dataset:
    evaluator = crear_evaluador(dataset['validation'])
else:
    # Si no hay split de validación, usar parte del entrenamiento
    val_size = int(len(dataset['train']) * 0.1)
    val_data = dataset['train'].select(range(val_size))
    evaluator = crear_evaluador(val_data)

print("Evaluador configurado exitosamente")
```

## Ejecutando el Fine-tuning

Ahora ejecutamos el entrenamiento del modelo:

```python
# Configurar wandb para seguimiento (opcional)
wandb.init(
    project="modernbert-boletin-oficial",
    config={
        "model": model_name,
        "epochs": num_epochs,
        "batch_size": batch_size,
        "warmup_steps": warmup_steps
    }
)

# Entrenar el modelo
print("Iniciando entrenamiento...")

model.fit(
    train_objectives=[(train_examples, train_loss)],
    epochs=num_epochs,
    evaluation_steps=500,
    evaluator=evaluator,
    warmup_steps=warmup_steps,
    output_path="./modernbert-boletin-oficial-finetuned",
    save_best_model=True,
    show_progress_bar=True
)

print("¡Entrenamiento completado!")
```

## Evaluando el Modelo Entrenado

Evaluemos el rendimiento del modelo fine-tuneado:

```python
def evaluar_modelo(model, test_data, top_k=5):
    """
    Evaluar el modelo en tareas de recuperación
    """
    # Extraer preguntas y contextos
    preguntas = [item['question'] for item in test_data]
    contextos = [item['context'] for item in test_data]
    
    # Generar embeddings
    print("Generando embeddings de preguntas...")
    question_embeddings = model.encode(preguntas, convert_to_tensor=True, show_progress_bar=True)
    
    print("Generando embeddings de contextos...")
    context_embeddings = model.encode(contextos, convert_to_tensor=True, show_progress_bar=True)
    
    # Calcular similitudes
    similarities = cosine_similarity(
        question_embeddings.cpu().numpy(), 
        context_embeddings.cpu().numpy()
    )
    
    # Calcular métricas
    hits_at_k = []
    for i in range(len(preguntas)):
        # Obtener índices ordenados por similitud
        ranked_indices = np.argsort(similarities[i])[::-1]
        
        # Verificar si el contexto correcto está en top-k
        correct_idx = i  # En nuestro caso, cada pregunta corresponde a su contexto
        hit = correct_idx in ranked_indices[:top_k]
        hits_at_k.append(hit)
    
    accuracy_at_k = np.mean(hits_at_k)
    
    print(f"Precisión@{top_k}: {accuracy_at_k:.4f}")
    return accuracy_at_k

# Evaluar en datos de prueba
if 'test' in dataset:
    test_data = dataset['test'][:100]  # Usar muestra para evaluación rápida
else:
    test_data = dataset['train'][-100:]  # Usar últimos 100 ejemplos

accuracy = evaluar_modelo(model, test_data)
```

## Implementando Búsqueda Semántica

Creemos un sistema de búsqueda para usar nuestro modelo entrenado:

```python
class BuscadorLegalArgentino:
    def __init__(self, model_path, contextos_db):
        """
        Inicializar buscador semántico para documentos legales
        """
        self.model = SentenceTransformer(model_path)
        self.contextos = contextos_db
        
        # Pre-computar embeddings de contextos
        print("Pre-computando embeddings de contextos...")
        self.context_embeddings = self.model.encode(
            self.contextos, 
            convert_to_tensor=True,
            show_progress_bar=True
        )
        print(f"Base de datos cargada con {len(self.contextos)} contextos")
    
    def buscar(self, pregunta, top_k=5):
        """
        Buscar contextos más relevantes para una pregunta
        """
        # Generar embedding de la pregunta
        question_embedding = self.model.encode([pregunta], convert_to_tensor=True)
        
        # Calcular similitudes
        similarities = cosine_similarity(
            question_embedding.cpu().numpy(),
            self.context_embeddings.cpu().numpy()
        )[0]
        
        # Obtener top-k resultados
        top_indices = np.argsort(similarities)[::-1][:top_k]
        
        resultados = []
        for idx in top_indices:
            resultados.append({
                'contexto': self.contextos[idx],
                'score': similarities[idx],
                'indice': idx
            })
        
        return resultados
    
    def mostrar_resultados(self, pregunta, resultados):
        """
        Mostrar resultados de búsqueda formateados
        """
        print(f"\n🔍 Pregunta: {pregunta}")
        print("=" * 50)
        
        for i, resultado in enumerate(resultados, 1):
            print(f"\n📄 Resultado {i} (Score: {resultado['score']:.4f})")
            print(f"Contexto: {resultado['contexto'][:200]}...")

# Crear instancia del buscador
contextos_db = [item['context'] for item in dataset['train']]
buscador = BuscadorLegalArgentino(
    model_path="./modernbert-boletin-oficial-finetuned",
    contextos_db=contextos_db
)

# Ejemplo de búsqueda
pregunta_ejemplo = "¿Cuáles son los requisitos para obtener una licencia comercial?"
resultados = buscador.buscar(pregunta_ejemplo, top_k=3)
buscador.mostrar_resultados(pregunta_ejemplo, resultados)
```

## Optimizaciones Avanzadas

Para mejorar aún más el rendimiento:

```python
# 1. Usar negative mining para ejemplos difíciles
def crear_ejemplos_con_negativos(dataset_split, num_negatives=2):
    """
    Crear ejemplos incluyendo pares negativos (pregunta con contexto irrelevante)
    """
    ejemplos = []
    contextos = [item['context'] for item in dataset_split]
    
    for i, item in enumerate(dataset_split):
        # Par positivo
        ejemplos.append(InputExample(
            texts=[item['question'], item['context']], 
            label=1.0
        ))
        
        # Pares negativos (contextos aleatorios)
        for _ in range(num_negatives):
            neg_idx = np.random.choice([j for j in range(len(contextos)) if j != i])
            ejemplos.append(InputExample(
                texts=[item['question'], contextos[neg_idx]], 
                label=0.0
            ))
    
    return ejemplos

# 2. Implementar early stopping
from sentence_transformers.evaluation import SentenceEvaluator

class EarlyStoppingEvaluator(SentenceEvaluator):
    def __init__(self, evaluator, patience=3):
        self.evaluator = evaluator
        self.patience = patience
        self.best_score = -1
        self.wait = 0
    
    def __call__(self, model, output_path, epoch, steps):
        score = self.evaluator(model, output_path, epoch, steps)
        
        if score > self.best_score:
            self.best_score = score
            self.wait = 0
        else:
            self.wait += 1
            
        if self.wait >= self.patience:
            print(f"Early stopping en época {epoch}")
            return True  # Detener entrenamiento
        
        return False

# 3. Configurar learning rate scheduling
from torch.optim.lr_scheduler import CosineAnnealingLR

print("Optimizaciones avanzadas configuradas")
```

## Despliegue en Producción

Para usar el modelo en producción:

```python
# Guardar el modelo optimizado
model.save("./modernbert-boletin-oficial-final")

# Crear versión optimizada para inferencia
def optimizar_para_inferencia(model_path):
    """
    Optimizar modelo para inferencia rápida
    """
    model = SentenceTransformer(model_path)
    
    # Compilar modelo para PyTorch 2.0+
    if hasattr(torch, 'compile'):
        model = torch.compile(model)
    
    # Habilitar optimizaciones de CUDA
    if torch.cuda.is_available():
        torch.backends.cudnn.benchmark = True
    
    return model

# Ejemplo de API simple
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Buscador Legal Argentino API")

class PreguntaRequest(BaseModel):
    pregunta: str
    top_k: int = 5

@app.post("/buscar")
async def buscar_contextos(request: PreguntaRequest):
    resultados = buscador.buscar(request.pregunta, request.top_k)
    return {"resultados": resultados}

print("API configurada para despliegue")
```

## Próximos Pasos

Con tu modelo de ModernBERT fine-tuneado, podés explorar:

- **Integración con bases de datos vectoriales** como Pinecone o Weaviate
- **Implementación de RAG** (Retrieval-Augmented Generation) con LLMs
- **Evaluación en datasets legales** adicionales
- **Optimización de hiperparámetros** con Optuna
- **Deployment escalable** con Docker y Kubernetes

El fine-tuning de ModernBERT en documentos legales argentinos abre nuevas posibilidades para automatizar la búsqueda y análisis de información jurídica, mejorando significativamente la eficiencia en el trabajo legal.

## Recursos

- [ModernBERT en HuggingFace](https://huggingface.co/answerdotai/ModernBERT-large)
- [Dataset Boletín Oficial Argentina](https://huggingface.co/datasets/marianbasti/boletin-oficial-argentina-questions)
- [Sentence-Transformers Documentation](https://www.sbert.net/)
- [Guía de Fine-tuning para Embeddings](https://www.sbert.net/docs/training/overview.html)
