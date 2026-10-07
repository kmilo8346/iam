---
title: Api Keys
---

# Api Keys

Las Api Keys te permiten otorgar diferentes niveles de acceso a tu backend de una forma segura y sin estados. El Api Key es un [JSON Web Token](https://en.wikipedia.org/wiki/JSON_Web_Token) que contiene la información de la aplicación, roles y scopes con los que opera un cliente.

> :warning: **Importante**: Los Api Keys debe ser resguardados de forma segura del lado del backend y nunca del lado del cliente.

## Como utilizar un Api Key

Un cliente que requiera acceder a tu backend debe enviar el Api Key en los encabezados de la petición http. Específicamente en el encabezado **Authorization** y debe tener el prefijo **apikey** antes del valor.

```bash
curl --request GET \
  --url https://api.cencosudx.xyz/iam/api/v1/applications/arcus \
  --header 'Authorization: apikey ${API_KEY}'
```

## Modelo de Api Key

| Propiedad   | Descripción               | Requerido | Tipo     | Valor por defecto |
| ----------- | ------------------------- | --------- | -------- | ----------------- |
| roles       | Roles del cliente         | si        | string[] | -                 |
| scopes      | Scopes donde puede operar | si        | string[] | -                 |
| description | Descripción del Api Key   | si        | string   | -                 |

## Servicios CRUD

IAM ofrece diferentes servicios para facilitarte el fácil manejo de tus Api Keys. Es necesario contar con un Api Key que te permita acceder usando los roles de **apikeys:read** para obtener información y **apikeys:write** para crear, actualizar o eliminar.

:::note
Una vez creado un Api Key, IAM te entrega en la respuesta la propiedad **"\_id"** que es un id autogenerado y se utiliza en los servicios como identificador.
:::

### Crear Api Key

```bash
curl --request POST \
  --url https://api.cencosudx.xyz/iam/api/v1/applications/${CLIENT_ID}/apikeys \
  --header 'Authorization: apikey ${API_KEY}' \
  --header 'Content-Type: application/json' \
  --data '{
    "roles": ["applications:read"],
	"scopes": [],
	"description": "Api key to read applications"
}'
```

### Actualizar Api Key

```bash
curl --request PUT \
  --url https://api.cencosudx.xyz/iam/api/v1/applications/${CLIENT_ID}/apikeys/${API_KEY_ID} \
  --header 'Authorization: apikey ${API_KEY}' \
  --header 'Content-Type: application/json' \
  --data '{
	"roles": ["applications:write"],
	"scopes": [],
	"description": "Api key to read applications"
}'
```

### Obtener Api Key

```bash
curl --request GET \
  --url https://api.cencosudx.xyz/iam/api/v1/applications/${CLIENT_ID}/apikeys/${API_KEY_ID} \
  --header 'Authorization: apikey ${API_KEY}'
```

### Eliminar Api Key

```bash
curl --request DELETE \
  --url https://api.cencosudx.xyz/iam/api/v1/applications/${CLIENT_ID}/apikeys/${API_KEY_ID} \
  --header 'Authorization: apikey ${API_KEY}'
```
