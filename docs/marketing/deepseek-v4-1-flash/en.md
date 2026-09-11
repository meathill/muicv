---
title: Mui's default model moves to DeepSeek V4.1 Flash: native image understanding, faster and cheaper
slug: deepseek-v4-1-flash-multimodal-upgrade
locale: en
section: product
status: published
summary: Mui's default chat model is now DeepSeek V4.1 Flash. It understands images natively — resume screenshots, job descriptions and offer emails just work, with no switch to a separate vision model — and the price stays in the entry tier at $0.20 / $0.80 per million tokens. Existing configs migrate automatically.
tags:
  - DeepSeek
  - V4.1 Flash
  - Multimodal
  - Product update
  - LLMs
keywords:
  - DeepSeek V4.1 Flash
  - DeepSeek multimodal
  - LLM image understanding
  - AI resume assistant
  - MuiCV
  - default model upgrade
author: Mui Team
publishedAt: 2026-09-11
seoTitle: Mui upgrades to DeepSeek V4.1 Flash - native image understanding, faster and cheaper - Mui
seoDescription: Mui's default model is now DeepSeek V4.1 Flash with native image understanding. Screenshots and charts can be read directly, no vision-model switch, at the same $0.20 / $0.80 per million tokens entry pricing.
---

Hi everyone — we've upgraded MuiCV's default chat model to **DeepSeek V4.1 Flash**.

This upgrade brings several improvements to MuiCV:

- **Smarter.** It understands what you actually need more reliably.
- **Native multimodal input.** It can read images directly.
- **Faster responses, better token efficiency, and a lower price.**

It also resolves a long-standing rough edge. Handling an image used to mean switching to a vision model. Now every model we integrate can see images, so there is no model switch — better results, and faster.

## Three improvements from the new model

Previously, to let everyone get more out of AI while keeping my own costs in check, I chose Mimo 2.5 Pro as the default model. But Mimo 2.5 Pro only handled plain text. When you needed an image in the conversation, we had to route the request in the background to plain Mimo 2.5 to read the image and then relay the content back to 2.5 Pro. That caused two problems: the routing was complex, slow and easy to get wrong; and information was lost in the relay, so the result was poor.

### 1. Native multimodal: it can understand images

DeepSeek V4.1 Flash builds vision into the main model. Images are now **first-class citizens of the conversation, just like text**:

- Resume screenshots and exported PDF pages can be attached and understood directly by the agent;
- Job descriptions on recruiting sites no longer need to be copied out by hand;
- Interview invitations, offers and emails can be dropped straight into the chat;
- Charts and flow diagrams can participate in reasoning as context.

With the attachment support already in the Mui desktop app, you just drag an image into the input box and leave the rest to us.

### 2. Faster: one less model switch, one less unknown

The DeepSeek Flash line has always been about speed.

That speed comes from two things:

1. It is inherently fast. DeepSeek V4.1 Flash improves throughput and strengthens caching, so it responds and completes requests more quickly.
2. Higher intelligence hits the point directly. The new model reasons better and gets to the core of a question without repeatedly second-guessing itself.

### 3. Cheaper: multimodal capability at a text-model price

Most importantly, this upgrade **did not raise prices**. V4.1 Flash stays in the platform's entry tier:

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Image understanding |
| :--- | :---: | :---: | :---: |
| **DeepSeek V4.1 Flash (default)** | **$0.20** | **$0.80** | Native |
| GPT-5.6 Luna | $0.20 | $1.20 | Yes |
| GPT-5.6 Terra | $2.00 | $12.00 | Yes |
| GPT-5.6 Sol | $4.00 | $20.00 | Yes |

For the same image-understanding capability, V4.1 Flash's output price is only two-thirds of Luna's, and more than an order of magnitude below Terra and Sol. And in our testing its capability is not weaker than Sol — outstanding value for money.

## What we changed, and what you don't need to do

On the platform side we unified the default model on `deepseek-v4.1-flash` and removed the old "vision experimental" model; the old logic that automatically switched models when an image was detected has also been removed.

For existing users, **migration is automatic**: if you previously selected an older model in settings, it converges to the new model when your config is read. No manual change is needed. It takes effect once the desktop app is updated.

## Try it

1. Open the Mui desktop app ([download the latest version](https://muicv.com/en/download)), or use an account you're already signed in to;
2. Attach a screenshot directly in the conversation — a target job description, your own resume page, anything;
3. Ask as usual; the model reads the image and answers.

## Closing

I'm an independent developer, building this out of genuine interest. On one hand I want the product to be valuable and for that value to be visible to users; on the other, I don't have so much money that I can freely buy the strongest models. So I keep looking for models with the best value for money.

DeepSeek V4.1 Flash gives me some hope. I think it can bring more value to everyone — and help people discover my product, like it, and build a positive cycle together.

I'll keep improving it. Go try the new model.
