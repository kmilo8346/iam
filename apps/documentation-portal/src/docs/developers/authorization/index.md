---
title: Autorización
sidebar_position: 4
---

# Autorización

La autorización es lo que define a qué recursos de sistema el usuario autenticado podrá acceder. Que haya logrado pasar la instancia de la autenticación, no significa que podrá utilizar el sistema por completo como super administrador. Mientras mejor se defina el nivel de acceso de cada recursos mas securo es nuestro sistema y de ahí su gran importancia en el desarollo de software.

## Caso de uso

Un caso de uso válido que vemos a menudo es cuando en una app mobile el usuario entra como invitado y tiene acceso a un grupo limitado de funcionalidades(recursos). Una vez que el usuario desea hacer login tiene acceso a otras funcionalidades(recursos) que son exclusivas de un usuario autenticado.

IAM controla el acceso de un usuario a un recurso usando [Roles y Alcances](./roles-scopes/).
