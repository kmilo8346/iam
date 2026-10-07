---
title: Microsoft SAML
---

Proveedor de autenticación corporativo de Microsoft, que nos permite acceder a través de nuestra cuenta corporativa de cencosud tanto para internos como externos.
<br />
<br />
Su uso y alcance principal se basa en un contexto corporativo y privado donde necesitemos restringit el acceso de nuestra plataforma a cuentas corporativas de la compañia.

Ejecución de ejemplo (_[Listado de Ambientes][1]_):

```shell
IAM_BASE_URL="https://api.staging.cencox.xyz/iam/api";
IAM_PROVIDER="microsoft_saml";

# App in you want to authenticate
APP_CLIENT_ID="social_app";

# Url where you want to redirection when process completed (with SUCCESS or FAIL)
APP_REDIRECTION_URI="${IAM_BASE_URL}/v1/oauth2/callback"

IAM_URL="${IAM_BASE_URL}/v1/oauth2/${APP_CLIENT_ID}/authorize/${IAM_PROVIDER}?redirect_uri=${APP_REDIRECTION_URI}&prompt=login&response_type=token" 

echo "${IAM_URL}";
open "${IAM_URL}"
```

Si todo marcha bien, lo que se deberia presentar a continuación será algo como lo mostrado a continuación:

<center>

![Example banner](./../assets/microsoft-provider-login-dialog.png)

</center>


La información de la cuenta digital se describe a continuación:


| Variable      | Descripción                           | Tipo              |
| ---           | ---                                   | ---               |
| primarysid    | Identificador del Proveedor (email)   | string (correo)   |
| unique_name   | Nombre del usuario                    | string            |
| email         | Email del usuario                     | string            |
| avatar        | Url de la imagen de la cuenta         | string            |

[1]: ./../../getting-started/environments.md