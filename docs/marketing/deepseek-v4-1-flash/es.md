---
title: El modelo predeterminado de Mui pasa a DeepSeek V4.1 Flash: comprensión nativa de imágenes, más rápido y más barato
slug: deepseek-v4-1-flash-multimodal-upgrade
locale: es
section: product
status: published
summary: El modelo de chat predeterminado de Mui ahora es DeepSeek V4.1 Flash. Entiende imágenes de forma nativa: capturas de currículum, ofertas y correos funcionan directamente, sin cambiar a un modelo de visión aparte. El precio se mantiene en $0,20 / $0,80 por millón de tokens; las configuraciones existentes migran solas.
tags:
  - DeepSeek
  - V4.1 Flash
  - Multimodal
  - Actualización de producto
  - LLM
keywords:
  - DeepSeek V4.1 Flash
  - DeepSeek multimodal
  - comprensión de imágenes LLM
  - asistente de currículum con IA
  - MuiCV
  - actualización del modelo predeterminado
author: Equipo de Mui
publishedAt: 2026-09-11
seoTitle: Mui pasa a DeepSeek V4.1 Flash - comprensión nativa de imágenes, más rápido y más barato - Mui
seoDescription: El modelo predeterminado de Mui ahora es DeepSeek V4.1 Flash con comprensión nativa de imágenes. Las capturas y gráficos se leen directamente, sin cambiar a un modelo de visión, al mismo precio de entrada de $0,20 / $0,80 por millón de tokens.
---

Hola a todos: hemos actualizado el modelo de chat predeterminado de MuiCV a **DeepSeek V4.1 Flash**.

Esta actualización aporta varias mejoras a MuiCV:

- **Más inteligente.** Entiende con más fidelidad lo que realmente necesitas.
- **Entrada multimodal nativa.** Puede leer imágenes directamente.
- **Respuestas más rápidas, mejor eficiencia de tokens y un precio más bajo.**

También resuelve una fricción de larga data. Procesar una imagen implicaba cambiar a un modelo de visión. Ahora todos los modelos que integramos ven imágenes, así que no hay cambio de modelo: mejores resultados y más velocidad.

## Tres mejoras del nuevo modelo

Antes, para que todos aprovecharan más la IA y a la vez contener mis propios costes, elegí Mimo 2.5 Pro como modelo predeterminado. Pero Mimo 2.5 Pro solo procesaba texto plano. Cuando necesitabas una imagen en la conversación, teníamos que enrutar la petición en segundo plano al Mimo 2.5 simple para que leyera la imagen y luego transmitir el contenido a 2.5 Pro. Eso causaba dos problemas: el enrutado era complejo, lento y propenso a errores; y la información se perdía en la transmisión, así que el resultado era malo.

### 1. Multimodal nativo: entiende las imágenes

DeepSeek V4.1 Flash integra la visión en el modelo principal. Ahora las imágenes son **ciudadanas de primera clase de la conversación, igual que el texto**:

- Las capturas de currículum y las páginas PDF exportadas pueden adjuntarse y ser entendidas directamente por el agente;
- Las ofertas de empleo en portales de reclutamiento ya no hay que copiarlas a mano;
- Las invitaciones a entrevistas, las ofertas y los correos pueden soltarse directamente en el chat;
- Los gráficos y diagramas de flujo pueden participar en el razonamiento como contexto.

Con la compatibilidad de adjuntos que ya tiene la app de escritorio de Mui, solo arrastras una imagen al cuadro de entrada y nosotros nos encargamos del resto.

### 2. Más rápido: un cambio de modelo menos, una incertidumbre menos

La línea DeepSeek Flash siempre ha apostado por la velocidad.

Esa velocidad viene de dos cosas:

1. Es rápida por naturaleza. DeepSeek V4.1 Flash mejora el rendimiento y refuerza el caché, respondiendo y completando peticiones más rápido.
2. Mayor inteligencia va directo al grano. El nuevo modelo razona mejor y llega al núcleo de una pregunta sin corregirse una y otra vez.

### 3. Más barato: capacidad multimodal a precio de modelo de texto

Lo más importante: esta actualización **no subió los precios**. V4.1 Flash sigue en el nivel de entrada de la plataforma:

| Modelo | Entrada (por millón de tokens) | Salida (por millón de tokens) | Comprensión de imágenes |
| :--- | :---: | :---: | :---: |
| **DeepSeek V4.1 Flash (predeterminado)** | **$0.20** | **$0.80** | Nativa |
| GPT-5.6 Luna | $0.20 | $1.20 | Sí |
| GPT-5.6 Terra | $2.00 | $12.00 | Sí |
| GPT-5.6 Sol | $4.00 | $20.00 | Sí |

Con la misma comprensión de imágenes, el precio de salida de V4.1 Flash es solo dos tercios del de Luna, y más de un orden de magnitud por debajo de Terra y Sol. Y en nuestras pruebas, su capacidad no es inferior a la de Sol: una relación calidad-precio excelente.

## Qué cambiamos y qué no necesitas hacer

En la plataforma unificamos el modelo predeterminado en `deepseek-v4.1-flash` y retiramos el antiguo «modelo de visión experimental»; también eliminamos la lógica antigua que cambiaba de modelo automáticamente al detectar una imagen.

Para los usuarios existentes, la **migración es automática**: si antes elegiste un modelo antiguo en los ajustes, converge al nuevo al leer tu configuración. No hace falta ningún cambio manual. Surte efecto en cuanto se actualiza la app de escritorio.

## Probarlo

1. Abre la app de escritorio de Mui ([descarga la última versión](https://muicv.com/en/download)) o usa una cuenta con la que ya hayas iniciado sesión;
2. Adjunta una captura directamente en la conversación: una oferta de empleo objetivo, tu propia página de currículum, lo que sea;
3. Pregunta como siempre; el modelo lee la imagen y responde.

## Cierre

Soy un desarrollador independiente y construyo esto por interés genuino. Por un lado, quiero que el producto tenga valor y que ese valor sea visible para los usuarios; por otro, no tengo tanto dinero como para comprar libremente los modelos más potentes. Así que sigo buscando modelos con la mejor relación calidad-precio.

DeepSeek V4.1 Flash me da algo de esperanza. Creo que puede aportar más valor a todos, y ayudar a que la gente descubra mi producto, le guste y construyamos juntos un círculo positivo.

Seguiré mejorando. Prueba el nuevo modelo.
