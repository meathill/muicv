---
title: Le modèle par défaut de Mui passe à DeepSeek V4.1 Flash : compréhension native des images, plus rapide et moins cher
slug: deepseek-v4-1-flash-multimodal-upgrade
locale: fr
section: product
status: published
summary: Le modèle de chat par défaut de Mui est désormais DeepSeek V4.1 Flash. Il comprend nativement les images : captures de CV, offres et e-mails fonctionnent directement, sans basculer vers un modèle de vision à part. Le prix reste à $0,20 / $0,80 par million de tokens ; les configurations existantes migrent seules.
tags:
  - DeepSeek
  - V4.1 Flash
  - Multimodal
  - Mise à jour produit
  - LLM
keywords:
  - DeepSeek V4.1 Flash
  - DeepSeek multimodal
  - compréhension d'images LLM
  - assistant CV IA
  - MuiCV
  - mise à niveau du modèle par défaut
author: Équipe Mui
publishedAt: 2026-09-11
seoTitle: Mui passe à DeepSeek V4.1 Flash - compréhension native des images, plus rapide et moins cher - Mui
seoDescription: Le modèle par défaut de Mui est désormais DeepSeek V4.1 Flash avec compréhension native des images. Captures et graphiques sont lus directement, sans basculer vers un modèle de vision, au même tarif d'entrée de $0,20 / $0,80 par million de tokens.
---

Bonjour à tous — nous avons fait passer le modèle de chat par défaut de MuiCV à **DeepSeek V4.1 Flash**.

Cette mise à niveau apporte plusieurs améliorations à MuiCV :

- **Plus intelligent.** Il comprend plus fidèlement ce dont vous avez réellement besoin.
- **Entrée multimodale native.** Il peut lire directement les images.
- **Réponses plus rapides, meilleure efficacité des tokens et prix plus bas.**

Elle règle aussi un point de friction de longue date. Traiter une image impliquait de basculer vers un modèle de vision. Désormais, chaque modèle que nous intégrons voit les images : plus de bascule, de meilleurs résultats et plus de rapidité.

## Trois améliorations apportées par le nouveau modèle

Auparavant, pour permettre à chacun de mieux profiter de l'IA tout en maîtrisant mes propres coûts, j'avais choisi Mimo 2.5 Pro comme modèle par défaut. Mais Mimo 2.5 Pro ne traitait que du texte brut. Quand vous aviez besoin d'une image dans la conversation, nous devions router la requête en arrière-plan vers le Mimo 2.5 simple pour lire l'image, puis relayer le contenu à 2.5 Pro. Cela posait deux problèmes : le routage était complexe, lent et facile à erroner ; et l'information se perdait dans le relais, ce qui donnait un mauvais résultat.

### 1. Multimodal natif : il comprend les images

DeepSeek V4.1 Flash intègre la vision au modèle principal. Les images sont désormais des **citoyens de première classe de la conversation, au même titre que le texte** :

- Les captures de CV et les pages PDF exportées peuvent être jointes et comprises directement par l'agent ;
- Les offres d'emploi sur les sites de recrutement n'ont plus besoin d'être recopiées à la main ;
- Les invitations à un entretien, les offres et les e-mails peuvent être glissés directement dans le chat ;
- Les graphiques et les diagrammes peuvent participer au raisonnement comme contexte.

Avec la prise en charge des pièces jointes déjà présente dans l'app de bureau Mui, il suffit de glisser une image dans le champ de saisie et nous nous occupons du reste.

### 2. Plus rapide : une bascule de modèle en moins, une incertitude en moins

La gamme DeepSeek Flash a toujours misé sur la vitesse.

Cette vitesse vient de deux choses :

1. Elle est rapide par nature. DeepSeek V4.1 Flash améliore le débit et renforce la mise en cache, répondant et terminant les requêtes plus vite.
2. Une intelligence supérieure va droit au but. Le nouveau modèle raisonne mieux et atteint le cœur d'une question sans se corriger sans cesse.

### 3. Moins cher : la capacité multimodale au prix d'un modèle texte

Surtout, cette mise à niveau **n'a pas augmenté les prix**. V4.1 Flash reste dans l'entrée de gamme de la plateforme :

| Modèle | Entrée (par million de tokens) | Sortie (par million de tokens) | Compréhension d'images |
| :--- | :---: | :---: | :---: |
| **DeepSeek V4.1 Flash (par défaut)** | **$0.20** | **$0.80** | Native |
| GPT-5.6 Luna | $0.20 | $1.20 | Oui |
| GPT-5.6 Terra | $2.00 | $12.00 | Oui |
| GPT-5.6 Sol | $4.00 | $20.00 | Oui |

Pour la même compréhension d'images, le prix de sortie de V4.1 Flash ne représente que les deux tiers de celui de Luna, et plus d'un ordre de grandeur sous Terra et Sol. Et dans nos tests, sa capacité n'est pas inférieure à celle de Sol — un excellent rapport qualité-prix.

## Ce que nous avons changé, et ce que vous n'avez pas à faire

Côté plateforme, nous avons unifié le modèle par défaut sur `deepseek-v4.1-flash` et retiré l'ancien « modèle de vision expérimental » ; l'ancienne logique qui changeait automatiquement de modèle à la détection d'une image a également été supprimée.

Pour les utilisateurs existants, la **migration est automatique** : si vous aviez choisi un ancien modèle dans les réglages, il converge vers le nouveau lors de la lecture de votre configuration. Aucune modification manuelle n'est nécessaire. Cela prend effet dès la mise à jour de l'app de bureau.

## Essayer

1. Ouvrez l'app de bureau Mui ([télécharger la dernière version](https://muicv.com/en/download)), ou utilisez un compte auquel vous êtes déjà connecté ;
2. Joignez directement une capture dans la conversation — une offre d'emploi cible, votre propre page de CV, peu importe ;
3. Posez votre question comme d'habitude ; le modèle lit l'image et répond.

## En conclusion

Je suis un développeur indépendant et je construis cela par véritable intérêt. D'un côté, je veux que le produit ait de la valeur et que cette valeur soit visible pour les utilisateurs ; de l'autre, je n'ai pas assez d'argent pour acheter librement les modèles les plus puissants. Je cherche donc continuellement des modèles au meilleur rapport qualité-prix.

DeepSeek V4.1 Flash me donne un peu d'espoir. Je pense qu'il peut apporter plus de valeur à tous — et aider les gens à découvrir mon produit, à l'aimer, et à construire ensemble un cercle vertueux.

Je continuerai d'améliorer. Essayez le nouveau modèle.
