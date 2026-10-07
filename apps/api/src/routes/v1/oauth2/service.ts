import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class OAuth2Service {
  constructor(private readonly httpService: HttpService) {}

  static getOriginalRequestUrl(req: Request): string {
    // https://api.staging.cencox.xyz/iam/api/v1/oauth2/arcus/authorize/google_gmail?response_type=token&prompt=login&redirect_uri=http://google.cl

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const host = req.get('Host')!; // can be localhost or domain name
    const isLocalhost = host.indexOf('localhost') >= 0;

    // if we take req.protocol, inside a cluster , it will always
    // be http, because inside a cluster we dont use TLS, so we need
    // to "guess" according if we "have" localhost in the Host
    const protocol = isLocalhost ? 'http' : 'https';

    // In a cluster, the egress communicate the "real path (iam/api)" via
    // header , because inside a cluster the url is cutted and kong redirect inside pods
    const prefix = req.headers['x-forwarded-prefix'] || '';

    // original Url start with / , and if we have prefix,
    // that end in / , we need to remove one "/"
    let originalUrl = req.originalUrl;
    if (prefix && originalUrl.startsWith('/')) {
      originalUrl = originalUrl.substring(1);
    }

    /*
    console.debug(req.headers);
    console.debug({
      protocol,
      originalUrl,
      host,
      prefix,
    });
    */

    return `${protocol}://${host}${prefix}${originalUrl}`;
  }

  getProviderIdFragment(provider: string): string {
    return provider.toLowerCase().replace('_', '/');
  }
}

export default OAuth2Service;
