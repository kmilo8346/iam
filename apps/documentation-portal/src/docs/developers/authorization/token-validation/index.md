---
title: Validación de credenciales
sidebar_position: 3
---

# Validación de credenciales

Validar un JSON Web Token (JWT) es un proceso importante para asegurarse de que la información en el token no ha sido manipulada y proviene de una fuente confiable. Para realizar la validación es necesario seguir los siguientes pasos:

1. Obtener la clave pública

   Antes de validar un JWT, la clave pública. Esta clave se utiliza para verificar la autenticidad del token.

2. Dividir el JWT en sus partes

   Un JWT consta de tres partes separadas por puntos: el encabezado (header), la carga útil (payload) y la firma. Debes dividir el JWT en estas partes.

3. Verificar la firma

   La firma en el JWT es lo que garantiza su integridad. Para verificarlo, debes:

   Tomar el encabezado codificado en Base64 y la carga útil codificada en Base64.
   Usar la clave pública para aplicar el algoritmo de firma inverso (RSA) a esos datos.
   Comparar la firma resultante con la firma en el JWT.
   Si las firmas coinciden, el JWT es válido y no ha sido modificado.

:::info
Para obtener la clave pública comunícate con nuestro equipo haciendo click [acá](mailto:humbertolares@cencosud.cl?subject=Solicitud%20de%20llave%20pública) y te la enviaremos por un medio seguro de la forma más rápida posible
:::
