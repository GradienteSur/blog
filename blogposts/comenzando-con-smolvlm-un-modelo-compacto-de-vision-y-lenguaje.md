---
title: 'Comenzando con SmolVLM: Un Modelo Compacto de Visión y Lenguaje'
tags: ['visión-lenguaje', 'huggingface', 'python', 'IA', 'SmolVLM', 'multimodal']
featured: true
emoji: '🤖'
# Todo lo demás se genera automáticamente: author='marian', excerpt, slug, readTime, publishedAt, metadata
---

Los modelos de visión y lenguaje han revolucionado la forma en que los sistemas de IA entienden y procesan contenido multimodal. **SmolVLM-500M-Instruct** de HuggingFace representa un desarrollo emocionante en este espacio: un modelo compacto pero poderoso que trae capacidades avanzadas de visión y lenguaje a entornos con recursos limitados.

En esta guía, vamos a recorrer la configuración y ejecución de inferencias con SmolVLM, brindándote ejemplos prácticos de código en Python que podés ejecutar inmediatamente.

## ¿Qué es SmolVLM?

SmolVLM (Small Vision Language Model) es el modelo eficiente de visión y lenguaje de HuggingFace diseñado para:

- **Procesar tanto imágenes como texto** en un marco unificado
- **Ejecutarse eficientemente** en hardware de consumo con solo 500M parámetros
- **Entender contenido visual** y responder preguntas sobre imágenes
- **Generar texto descriptivo** basado en entrada visual

## Configuración Rápida

Empecemos instalando las dependencias necesarias:

```python
# Instalar paquetes requeridos
pip install transformers torch torchvision pillow requests
```

## Cargando el Modelo

Acá te mostramos cómo cargar SmolVLM-500M-Instruct y prepararlo para inferencia:

```python
import torch
from transformers import AutoProcessor, AutoModelForVision2Seq
from PIL import Image
import requests
from io import BytesIO

# Cargar el modelo y procesador
model_name = "HuggingFaceTB/SmolVLM-500M-Instruct"
processor = AutoProcessor.from_pretrained(model_name)
model = AutoModelForVision2Seq.from_pretrained(
    model_name,
    torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
    device_map="auto" if torch.cuda.is_available() else None
)

print(f"¡Modelo cargado exitosamente!")
print(f"Parámetros del modelo: {model.num_parameters():,}")
```

## Ejecutando Descripción de Imágenes

Empecemos con una tarea simple de descripción de imágenes:

```python
def describir_imagen(image_url, prompt="Describí esta imagen:"):
    """
    Generar una descripción para una imagen desde URL
    """
    # Cargar imagen
    response = requests.get(image_url)
    image = Image.open(BytesIO(response.content)).convert('RGB')
    
    # Preparar entradas
    inputs = processor(
        text=prompt,
        images=image,
        return_tensors="pt"
    )
    
    # Mover al dispositivo si usamos GPU
    if torch.cuda.is_available():
        inputs = {k: v.to('cuda') for k, v in inputs.items()}
    
    # Generar respuesta
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=150,
            do_sample=True,
            temperature=0.7,
            pad_token_id=processor.tokenizer.eos_token_id
        )
    
    # Decodificar respuesta
    response = processor.decode(outputs[0], skip_special_tokens=True)
    # Remover el prompt de la respuesta
    return response.replace(prompt, "").strip()

# Ejemplo de uso
image_url = "https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/transformers/tasks/car.jpg"
descripcion = describir_imagen(image_url)
print(f"Descripción: {descripcion}")
```

## Preguntas y Respuestas Visuales

SmolVLM se destaca respondiendo preguntas sobre imágenes:

```python
def responder_pregunta_visual(image_url, pregunta):
    """
    Responder una pregunta sobre una imagen
    """
    # Cargar imagen
    response = requests.get(image_url)
    image = Image.open(BytesIO(response.content)).convert('RGB')
    
    # Formatear prompt para Q&A
    prompt = f"Pregunta: {pregunta}\nRespuesta:"
    
    # Preparar entradas
    inputs = processor(
        text=prompt,
        images=image,
        return_tensors="pt"
    )
    
    # Mover al dispositivo si usamos GPU
    if torch.cuda.is_available():
        inputs = {k: v.to('cuda') for k, v in inputs.items()}
    
    # Generar respuesta
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=100,
            do_sample=False,  # Usar decodificación greedy para respuestas factuales
            pad_token_id=processor.tokenizer.eos_token_id
        )
    
    # Decodificar y limpiar respuesta
    response = processor.decode(outputs[0], skip_special_tokens=True)
    respuesta = response.replace(prompt, "").strip()
    return respuesta

# Ejemplo de uso
pregunta = "¿De qué color es el auto en la imagen?"
respuesta = responder_pregunta_visual(image_url, pregunta)
print(f"P: {pregunta}")
print(f"R: {respuesta}")
```

## Procesamiento por Lotes para Eficiencia

Para procesar múltiples imágenes eficientemente:

```python
def procesar_lote(image_urls, prompts, tamaño_lote=4):
    """
    Procesar múltiples imágenes en lotes para eficiencia
    """
    resultados = []
    
    for i in range(0, len(image_urls), tamaño_lote):
        lote_urls = image_urls[i:i+tamaño_lote]
        lote_prompts = prompts[i:i+tamaño_lote]
        
        # Cargar imágenes
        imagenes = []
        for url in lote_urls:
            response = requests.get(url)
            image = Image.open(BytesIO(response.content)).convert('RGB')
            imagenes.append(image)
        
        # Procesar lote
        inputs = processor(
            text=lote_prompts,
            images=imagenes,
            return_tensors="pt",
            padding=True
        )
        
        if torch.cuda.is_available():
            inputs = {k: v.to('cuda') for k, v in inputs.items()}
        
        # Generar respuestas
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=150,
                do_sample=True,
                temperature=0.7,
                pad_token_id=processor.tokenizer.eos_token_id
            )
        
        # Decodificar respuestas
        for j, output in enumerate(outputs):
            response = processor.decode(output, skip_special_tokens=True)
            respuesta_limpia = response.replace(lote_prompts[j], "").strip()
            resultados.append(respuesta_limpia)
    
    return resultados

# Ejemplo de procesamiento por lotes
urls = [image_url] * 3  # Misma imagen para demo
prompts = [
    "Describí esta imagen:",
    "¿Qué objetos ves?",
    "¿Cuál es el sujeto principal?"
]

resultados_lote = procesar_lote(urls, prompts)
for i, resultado in enumerate(resultados_lote):
    print(f"Prompt {i+1}: {prompts[i]}")
    print(f"Respuesta: {resultado}\n")
```

## Consejos de Rendimiento

Acá tenés algunas optimizaciones clave para mejor rendimiento:

```python
# 1. Usar tipos de datos apropiados
model = AutoModelForVision2Seq.from_pretrained(
    model_name,
    torch_dtype=torch.float16,  # Usar media precisión en GPU
    device_map="auto"
)

# 2. Habilitar modo inferencia para mejor rendimiento
torch.backends.cudnn.benchmark = True

# 3. Limpiar caché entre ejecuciones
torch.cuda.empty_cache()

# 4. Usar compilación para inferencia repetida (PyTorch 2.0+)
if hasattr(torch, 'compile'):
    model = torch.compile(model)
```

## Próximos Pasos

Ahora que tenés SmolVLM funcionando, considerá explorar:

- **Fine-tuning** en pares imagen-texto específicos del dominio
- **Integración** con aplicaciones web usando FastAPI
- **Comparación** con otros modelos de visión y lenguaje
- **Optimización** con técnicas como cuantización

El tamaño compacto de SmolVLM lo hace perfecto para prototipado y despliegues en producción donde los recursos computacionales son limitados. Sus capacidades de seguimiento de instrucciones abren numerosas posibilidades para construir aplicaciones multimodales inteligentes.

## Recursos

- [Model Card de SmolVLM](https://huggingface.co/HuggingFaceTB/SmolVLM-500M-Instruct)
- [Documentación de HuggingFace Transformers](https://huggingface.co/docs/transformers)
- [Guía de Modelos de Visión y Lenguaje](https://huggingface.co/docs/transformers/tasks/visual_question_answering)

